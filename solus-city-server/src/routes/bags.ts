import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { PublicKey } from "@solana/web3.js";
import { z } from "zod";
import type { TradeQuoteResponse } from "@bagsfm/bags-sdk";
import { requireAuth } from "../lib/auth";
import { bags } from "../lib/bags";

const quoteQuerySchema = z.object({
  inputMint: z.string().min(32),
  outputMint: z.string().min(32),
  amount: z.coerce.number().int().positive(),
});

const swapBodySchema = z.object({
  quoteResponse: z.record(z.unknown()),
  userPublicKey: z.string().min(32),
});

export default async function bagsRoutes(
  fastify: FastifyInstance,
  _opts: { prisma: PrismaClient }
) {
  // GET /bags/quote
  // Proxies to Bags Trade API to avoid CORS in the browser.
  fastify.get("/bags/quote", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = quoteQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid query params" });
    }

    const { inputMint, outputMint, amount } = parsed.data;

    let inputMintPk: PublicKey;
    let outputMintPk: PublicKey;
    try {
      inputMintPk = new PublicKey(inputMint);
      outputMintPk = new PublicKey(outputMint);
    } catch {
      return reply.status(400).send({ error: "Invalid mint address" });
    }

    try {
      const quote = await bags.trade.getQuote({
        inputMint: inputMintPk,
        outputMint: outputMintPk,
        amount,
        slippageMode: "auto",
      });
      return reply.send({ quote });
    } catch (err) {
      fastify.log.error(err);
      return reply.status(502).send({ error: "Failed to fetch quote from Bags API" });
    }
  });

  // POST /bags/swap
  // Builds a swap transaction server-side and returns it serialised as base64
  // so the browser wallet can sign and send it directly.
  fastify.post("/bags/swap", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = swapBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid body" });
    }

    const { quoteResponse, userPublicKey } = parsed.data;

    let userPk: PublicKey;
    try {
      userPk = new PublicKey(userPublicKey);
    } catch {
      return reply.status(400).send({ error: "Invalid userPublicKey" });
    }

    try {
      const { transaction, lastValidBlockHeight } = await bags.trade.createSwapTransaction({
        quoteResponse: quoteResponse as unknown as TradeQuoteResponse,
        userPublicKey: userPk,
      });
      const serialized = Buffer.from(transaction.serialize()).toString("base64");
      return reply.send({ transaction: serialized, lastValidBlockHeight });
    } catch (err) {
      fastify.log.error(err);
      return reply.status(502).send({ error: "Failed to build swap transaction" });
    }
  });
}
