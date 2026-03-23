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
import { isInHospital } from "../lib/game";
import { getHospitalSlsReleasePricing } from "../lib/player/hospital";
import { fetchSlsPrice } from "../lib/economy/sls";

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
const HOSPITAL_RELEASE_BODY_SCHEMA = z.object({
  signature: z.string().min(60).max(130),
});
const SELL_QUOTE_BODY_SCHEMA = z.object({
  slsAmount: z.coerce
    .number()
    .positive("Enter SLS amount above 0")
    .min(MIN_SLS_PER_TRADE, `Minimum sell is ${MIN_CASH_PER_TRADE} CASH (${MIN_SLS_PER_TRADE} SLS).`)
    .max(MAX_SLS_PER_TRADE, `Maximum sell is ${MAX_CASH_PER_TRADE} CASH (${MAX_SLS_PER_TRADE} SLS).`),
});

const hospitalReleaseQuotes = new Map<string, { expectedSls: number; expiresAt: number; costUsd: number; multiplier: number }>();

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

  fastify.post("/sls/hospital/quote", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;

    const [user, profile] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.profile.findUnique({ where: { userId } }),
    ]);

    if (!user || !user.wallet) {
      return reply.status(404).send({ error: "User not found" });
    }
    if (!profile) {
      return reply.status(404).send({ error: "Profile not found" });
    }
    if (!isInHospital(profile)) {
      return reply.status(400).send({ error: "You are not hospitalized" });
    }

    try {
      const slsPrice = await fetchSlsPrice();
      if (slsPrice === null) {
        return reply.status(503).send({ error: "Unable to fetch live $SLS price. Try again." });
      }
      const { slsReleaseCost, costUsd, multiplier } = getHospitalSlsReleasePricing(profile, slsPrice);
      if (!slsReleaseCost || slsReleaseCost <= 0) {
        return reply.status(503).send({ error: "Unable to calculate $SLS hospital cost. Try again." });
      }
      const playerPk = new PublicKey(user.wallet);
      const fromAta = getAssociatedTokenAddressSync(SLS_MINT, playerPk);
      const toAta = getAssociatedTokenAddressSync(SLS_MINT, TREASURY_WALLET);
      const rawAmount = BigInt(Math.ceil(slsReleaseCost * Math.pow(10, SLS_DECIMALS)));

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("finalized");
      const tx = new Transaction({ recentBlockhash: blockhash, feePayer: playerPk });
      tx.add(createTransferInstruction(fromAta, toAta, playerPk, rawAmount));
      hospitalReleaseQuotes.set(userId, {
        expectedSls: slsReleaseCost,
        expiresAt: Date.now() + 10 * 60 * 1000,
        costUsd,
        multiplier,
      });

      return reply.send({
        slsAmount: slsReleaseCost,
        costUsd,
        multiplier,
        transaction: Buffer.from(
          tx.serialize({ requireAllSignatures: false, verifySignatures: false })
        ).toString("base64"),
        blockhash,
        lastValidBlockHeight,
      });
    } catch (err) {
      request.log.error(err, "/sls/hospital/quote error");
      return reply.status(500).send({ error: "Failed to build hospital release transaction." });
    }
  });

  fastify.post("/sls/hospital/confirm", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = HOSPITAL_RELEASE_BODY_SCHEMA.safeParse(request.body);
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
      if (!isInHospital(profile)) {
        return reply.status(400).send({ error: "You are not hospitalized" });
      }
      if (!txInfo) {
        return reply.status(400).send({ error: "Transaction not found. Confirm and retry." });
      }
      if (txInfo.meta?.err) {
        return reply.status(400).send({ error: "Transaction failed on-chain." });
      }

      const treasuryAddress = TREASURY_WALLET.toBase58();
      const slsMintAddr = SLS_MINT.toBase58();
      const pendingQuote = hospitalReleaseQuotes.get(userId);
      if (!pendingQuote || pendingQuote.expiresAt < Date.now()) {
        hospitalReleaseQuotes.delete(userId);
        return reply.status(400).send({ error: "Hospital release quote expired. Request a new one." });
      }

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

      if (receivedSls + 0.000001 < pendingQuote.expectedSls) {
        return reply.status(400).send({ error: "Insufficient $SLS received for full hospital release." });
      }

      const updatedProfile = await prisma.$transaction(async (tx) => {
        const nextProfile = await tx.profile.update({
          where: { userId },
          data: {
            health: profile.maxHealth,
            hospitalUntil: new Date("1970-01-01T00:00:00.000Z"),
            hospitalReleaseCount:
              profile.hospitalReleaseDate &&
              profile.hospitalReleaseDate.getUTCFullYear() === new Date().getUTCFullYear() &&
              profile.hospitalReleaseDate.getUTCMonth() === new Date().getUTCMonth() &&
              profile.hospitalReleaseDate.getUTCDate() === new Date().getUTCDate()
                ? profile.hospitalReleaseCount + 1
                : 1,
            hospitalReleaseDate: new Date(),
          },
        });

        await tx.slsTransaction.create({
          data: {
            userId,
            type: "hospital_release",
            amount: -receivedSls,
            usdValue: pendingQuote.costUsd,
            description: `Spent ${receivedSls.toFixed(4)} $SLS for full hospital release (~$${pendingQuote.costUsd.toFixed(2)})`,
          },
        });

        await tx.eventLog.create({
          data: {
            userId,
            type: "hospital_release",
            message: "Paid $SLS for a full hospital release.",
            metadata: {
              method: "sls",
              slsAmount: receivedSls,
              usdCost: pendingQuote.costUsd,
              multiplier: pendingQuote.multiplier,
              signature,
            },
          },
        });

        return nextProfile;
      });
      hospitalReleaseQuotes.delete(userId);

      return reply.send({
        success: true,
        slsSpent: receivedSls,
        health: updatedProfile.health,
        hospitalUntil: updatedProfile.hospitalUntil,
      });
    } catch (err) {
      request.log.error(err, "/sls/hospital/confirm error");
      return reply.status(500).send({ error: "Failed to process SLS hospital release." });
    }
  });
}
