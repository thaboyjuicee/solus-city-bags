import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import {
  PublicKey,
  Transaction,
  Connection,
  clusterApiUrl,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createTransferInstruction,
} from "@solana/spl-token";
import { z } from "zod";
import { requireAuth } from "../lib/auth";
import { isInHospital } from "../lib/game";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SLS_MINT = new PublicKey("ELTXCFp1tmtfu39CPw6afnMSjW1BBxjinorJQsKmBAGS");
const TREASURY_WALLET = new PublicKey("5vTZGYbkJ2xGbpNEbgp8TLuob3jjXTLqRgzdG8zP1FiZ");
const SLS_DECIMALS = 9;
const BASE_RELEASE_FEE_USD = 0.15;

interface DexPair {
  priceUsd?: string;
  liquidity?: { usd?: number };
}

async function fetchSlsPrice(): Promise<number> {
  const res = await fetch(
    "https://api.dexscreener.com/latest/dex/tokens/ELTXCFp1tmtfu39CPw6afnMSjW1BBxjinorJQsKmBAGS",
    { signal: AbortSignal.timeout(8000) }
  );
  if (!res.ok) throw new Error("DexScreener returned non-OK status");
  const data = (await res.json()) as { pairs?: DexPair[] };
  const pairs = (data.pairs ?? []).filter((p) => p.priceUsd);
  if (pairs.length === 0) throw new Error("No $SLS price data available");
  const best = pairs.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
  const price = parseFloat(best.priceUsd!);
  if (isNaN(price) || price <= 0) throw new Error("Invalid $SLS price data");
  return price;
}

function isSameUtcDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

// ---------------------------------------------------------------------------
// Route schema
// ---------------------------------------------------------------------------

const confirmBodySchema = z.object({
  signature: z.string().min(60).max(120),
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export default async function hospitalRoutes(
  fastify: FastifyInstance,
  { prisma }: { prisma: PrismaClient }
) {
  const connection = new Connection(
    process.env.HELIUS_RPC_URL ?? clusterApiUrl("mainnet-beta"),
    "confirmed"
  );

  // POST /hospital/release
  // Builds an unsigned SPL token transfer tx for the player to sign.
  fastify.post("/hospital/release", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;
    try {
      const [profile, user] = await Promise.all([
        prisma.profile.findUnique({ where: { userId } }),
        prisma.user.findUnique({ where: { id: userId } }),
      ]);

      if (!profile || !user) return reply.status(404).send({ error: "Profile not found" });
      if (!isInHospital(profile)) return reply.status(400).send({ error: "You are not hospitalized" });

      const now = new Date();
      const msRemaining = profile.hospitalUntil.getTime() - now.getTime();
      const minutesRemaining = Math.ceil(msRemaining / 60000);
      if (minutesRemaining <= 0) return reply.status(400).send({ error: "Hospital time has already expired" });

      // Exponential cost multiplier — resets each UTC day
      const sameDay =
        profile.hospitalReleaseDate != null && isSameUtcDay(profile.hospitalReleaseDate, now);
      const releaseCount = sameDay ? profile.hospitalReleaseCount : 0;
      const multiplier = Math.pow(2, releaseCount);

      // Cost: fixed $0.15 × daily multiplier
      const costUsd = BASE_RELEASE_FEE_USD * multiplier;

      let slsPrice: number;
      try {
        slsPrice = await fetchSlsPrice();
      } catch (err) {
        fastify.log.error(err, "Failed to fetch $SLS price");
        return reply.status(503).send({ error: "Unable to fetch live $SLS price. Try again." });
      }

      const slsAmount = costUsd / slsPrice;
      const rawAmount = BigInt(Math.ceil(slsAmount * Math.pow(10, SLS_DECIMALS)));

      // Build unsigned legacy transaction
      const playerPk = new PublicKey(user.wallet);
      const fromAta = getAssociatedTokenAddressSync(SLS_MINT, playerPk);
      const toAta = getAssociatedTokenAddressSync(SLS_MINT, TREASURY_WALLET);

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("finalized");
      const tx = new Transaction({ recentBlockhash: blockhash, feePayer: playerPk });
      tx.add(createTransferInstruction(fromAta, toAta, playerPk, rawAmount));

      const txBase64 = tx
        .serialize({ requireAllSignatures: false, verifySignatures: false })
        .toString("base64");

      return reply.send({
        costSls: slsAmount,
        costUsd,
        minutesRemaining,
        multiplier,
        slsPrice,
        transaction: txBase64,
        lastValidBlockHeight,
        blockhash,
      });
    } catch (err) {
      request.log.error(err, "/hospital/release error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  // POST /hospital/confirm
  // Verifies the signed transaction on-chain, then releases the player.
  fastify.post("/hospital/confirm", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;

    const parsed = confirmBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    }
    const { signature } = parsed.data;

    try {
      const [profile, user] = await Promise.all([
        prisma.profile.findUnique({ where: { userId } }),
        prisma.user.findUnique({ where: { id: userId } }),
      ]);

      if (!profile || !user) return reply.status(404).send({ error: "Profile not found" });
      if (!isInHospital(profile)) return reply.status(400).send({ error: "You are not hospitalized" });

      // Verify transaction on-chain
      const txInfo = await connection.getTransaction(signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });
      if (!txInfo) {
        return reply
          .status(400)
          .send({ error: "Transaction not found. Wait for confirmation and try again." });
      }
      if (txInfo.meta?.err) {
        return reply.status(400).send({ error: "Transaction failed on-chain." });
      }

      // Verify treasury received $SLS
      const preBalances = txInfo.meta?.preTokenBalances ?? [];
      const postBalances = txInfo.meta?.postTokenBalances ?? [];
      const treasuryAddr = TREASURY_WALLET.toBase58();
      const slsMintAddr = SLS_MINT.toBase58();

      const pre = preBalances.find((b) => b.owner === treasuryAddr && b.mint === slsMintAddr);
      const post = postBalances.find((b) => b.owner === treasuryAddr && b.mint === slsMintAddr);

      const preAmt = parseFloat(pre?.uiTokenAmount?.uiAmountString ?? "0");
      const postAmt = parseFloat(post?.uiTokenAmount?.uiAmountString ?? "0");
      const receivedSls = postAmt - preAmt;

      if (receivedSls <= 0) {
        return reply.status(400).send({ error: "Transaction did not send $SLS to the treasury." });
      }

      // Fetch price for USD record (best-effort)
      let slsPrice = 0;
      try { slsPrice = await fetchSlsPrice(); } catch { /* continue */ }
      const usdValue = receivedSls * slsPrice;

      // Compute release count for this day
      const now = new Date();
      const sameDay =
        profile.hospitalReleaseDate != null && isSameUtcDay(profile.hospitalReleaseDate, now);
      const releaseCount = sameDay ? profile.hospitalReleaseCount : 0;

      // Release from hospital and record the SLS spend
      await prisma.$transaction([
        prisma.profile.update({
          where: { userId },
          data: {
            hospitalUntil: new Date(0),
            hospitalReleaseCount: releaseCount + 1,
            hospitalReleaseDate: now,
            slsSpent: { increment: receivedSls },
          },
        }),
        prisma.slsTransaction.create({
          data: {
            userId,
            type: "hospital_release",
            amount: receivedSls,
            usdValue,
            description: `Early hospital release — paid ${receivedSls.toFixed(2)} $SLS (~$${usdValue.toFixed(2)})`,
          },
        }),
      ]);

      return reply.send({ success: true });
    } catch (err) {
      request.log.error(err, "/hospital/confirm error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });
}
