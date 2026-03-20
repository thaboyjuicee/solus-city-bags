import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../lib/auth";

interface DexPair {
  priceUsd?: string;
  liquidity?: { usd?: number };
}

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
  // GET /sls/price — live $SLS price in USD from DexScreener
  fastify.get("/sls/price", async (request, reply) => {
    const price = await fetchSlsPrice();
    if (price === null) {
      return reply.status(503).send({ error: "Price data temporarily unavailable" });
    }
    return reply.send({ price });
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
