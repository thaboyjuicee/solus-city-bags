import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../lib/auth";
import {
  Connection,
  PublicKey,
  Transaction,
  clusterApiUrl,
} from "@solana/web3.js";
import { createTransferInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { z } from "zod";

interface DexPair {
  priceUsd?: string;
  liquidity?: { usd?: number };
}

const SLS_MINT = new PublicKey("ELTXCFp1tmtfu39CPw6afnMSjW1BBxjinorJQsKmBAGS");
const TREASURY_WALLET = new PublicKey("5vTZGYbkJ2xGbpNEbgp8TLuob3jjXTLqRgzdG8zP1FiZ");
const SLS_DECIMALS = 9;
const SLS_TO_CASH_RATE = 50; // 50 SLS = 1 CASH
const MIN_CASH_PER_TRADE = 1000;
const MAX_CASH_PER_TRADE = 50000;
const MIN_SLS_PER_TRADE = MIN_CASH_PER_TRADE * SLS_TO_CASH_RATE;
const MAX_SLS_PER_TRADE = MAX_CASH_PER_TRADE * SLS_TO_CASH_RATE;
const SELL_BODY_SCHEMA = z.object({
  signature: z.string().min(60).max(130),
});
const SELL_QUOTE_BODY_SCHEMA = z.object({
  slsAmount: z.coerce
    .number()
    .positive("Enter SLS amount above 0")
    .min(MIN_SLS_PER_TRADE, `Minimum sell is ${MIN_CASH_PER_TRADE} CASH (${MIN_SLS_PER_TRADE} SLS).`)
    .max(MAX_SLS_PER_TRADE, `Maximum sell is ${MAX_CASH_PER_TRADE} CASH (${MAX_SLS_PER_TRADE} SLS).`),
});

async function fetchSlsPrice(): Promise<number | null> {
  try {
    const res = await fetch(
      "https://api.dexscreener.com/latest/dex/tokens/ELTXCFp1tmtfu39CPw6afnMSjW1BBxjinorJQsKmBAGS",
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { pairs?: DexPair[] };
    const priceStr = data.pairs?.[0]?.priceUsd;
    if (!priceStr) return null;
  const price = parseFloat(priceStr);
  return isNaN(price) || price <= 0 ? null : price;
  } catch {
    return null;
  }
}

export default async function slsRoutes(
  fastify: FastifyInstance,
  { prisma }: { prisma: PrismaClient }
) {
  const connection = new Connection(
    process.env.HELIUS_RPC_URL ?? clusterApiUrl("mainnet-beta"),
    "confirmed"
  );

  // GET /sls/price — live $SLS price in USD from DexScreener
  fastify.get("/sls/price", async (request, reply) => {
    const price = await fetchSlsPrice();
    if (price === null) {
      return reply.status(503).send({ error: "Price data temporarily unavailable" });
    }
    return reply.send({ price });
  });

  // POST /sls/sell/quote
  // Builds an unsigned SLS transfer tx so the frontend can request a player signature.
  fastify.post("/sls/sell/quote", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = SELL_QUOTE_BODY_SCHEMA.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    }

    const { userId } = request.user;
    const slsAmount = Number(parsed.data.slsAmount.toFixed(6));
    if (slsAmount <= 0) {
      return reply.status(400).send({ error: "SLS amount must be greater than 0." });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.wallet) {
      return reply.status(404).send({ error: "User not found" });
    }

    try {
      const playerPk = new PublicKey(user.wallet);
      const fromAta = getAssociatedTokenAddressSync(SLS_MINT, playerPk);
      const toAta = getAssociatedTokenAddressSync(SLS_MINT, TREASURY_WALLET);
      const rawAmount = BigInt(Math.ceil(slsAmount * Math.pow(10, SLS_DECIMALS)));

      if (rawAmount <= 0n) {
        return reply.status(400).send({ error: "SLS amount is too small." });
      }

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("finalized");
      const tx = new Transaction({ recentBlockhash: blockhash, feePayer: playerPk });
      tx.add(
        createTransferInstruction(
          fromAta,
          toAta,
          playerPk,
          rawAmount
        )
      );

      return reply.send({
        slsAmount,
        cashToReceive: slsAmount / SLS_TO_CASH_RATE,
        transaction: Buffer.from(tx.serialize({ requireAllSignatures: false, verifySignatures: false })).toString("base64"),
        blockhash,
        lastValidBlockHeight,
      });
    } catch (err) {
      request.log.error(err, "/sls/sell/quote error");
      return reply.status(500).send({ error: "Failed to build sell transaction." });
    }
  });

  // POST /sls/sell/confirm
  // Verifies the signed transfer and applies in-game CASH reward.
  fastify.post("/sls/sell/confirm", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = SELL_BODY_SCHEMA.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    }
    const { signature } = parsed.data;
    const { userId } = request.user;

    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || !user.wallet) {
        return reply.status(404).send({ error: "User not found" });
      }

      const [profile, txInfo] = await Promise.all([
        prisma.profile.findUnique({ where: { userId } }),
        connection.getTransaction(signature, {
          commitment: "confirmed",
          maxSupportedTransactionVersion: 0,
        }),
      ]);

      if (!profile) {
        return reply.status(404).send({ error: "Profile not found" });
      }
      if (!txInfo) {
        return reply.status(400).send({ error: "Transaction not found. Confirm and retry." });
      }
      if (txInfo.meta?.err) {
        return reply.status(400).send({ error: "Transaction failed on-chain." });
      }

      const treasuryAddress = TREASURY_WALLET.toBase58();
      const slsMintAddr = SLS_MINT.toBase58();

      const preBalances = txInfo.meta?.preTokenBalances ?? [];
      const postBalances = txInfo.meta?.postTokenBalances ?? [];

      const pre = preBalances.find(
        (entry) => entry.owner === treasuryAddress && entry.mint === slsMintAddr
      );
      const post = postBalances.find(
        (entry) => entry.owner === treasuryAddress && entry.mint === slsMintAddr
      );

      if (!pre && !post) {
        return reply.status(400).send({ error: "No $SLS transfer to treasury detected." });
      }

      const preAmt = parseFloat(pre?.uiTokenAmount?.uiAmountString ?? "0");
      const postAmt = parseFloat(post?.uiTokenAmount?.uiAmountString ?? "0");
      const receivedSls = Math.max(0, postAmt - preAmt);
      if (receivedSls <= 0) {
        return reply.status(400).send({ error: "No $SLS received by treasury." });
      }

      const cashToReceive = receivedSls / SLS_TO_CASH_RATE;

      const [updatedProfile] = await prisma.$transaction([
        prisma.profile.update({
          where: { userId },
          data: { cash: { increment: cashToReceive } },
        }),
        prisma.slsTransaction.create({
          data: {
            userId,
            type: "sls_sell",
            amount: -receivedSls,
            usdValue: cashToReceive,
            description: `Sold ${receivedSls.toFixed(4)} $SLS for ${cashToReceive.toFixed(2)} CASH`,
          },
        }),
      ]);

      return reply.send({
        success: true,
        cashReceived: cashToReceive,
        slsSold: receivedSls,
        cash: updatedProfile.cash,
      });
    } catch (err) {
      request.log.error(err, "/sls/sell/confirm error");
      return reply.status(500).send({ error: "Failed to process SLS sell." });
    }
  });

  // GET /sls/transactions — last 20 $SLS transactions for the authenticated player
  fastify.get("/sls/transactions", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;
    try {
      const transactions = await prisma.slsTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
      return reply.send({ transactions });
    } catch (err) {
      request.log.error(err, "/sls/transactions error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });
}
