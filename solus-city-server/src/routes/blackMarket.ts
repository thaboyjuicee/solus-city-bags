import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { requireAuth } from "../lib/auth";
import { buyBlackMarketListing, getBlackMarketListings, BlackMarketError } from "../lib/economy/blackMarket";
import { serializeMarketListing, serializeMarketRotation } from "../lib/serializers/market";
import { ensurePlayerMissionsAssigned } from "../lib/missions/assign";
import { progressPlayerMissions } from "../lib/missions/progress";

const buyBody = z.object({
  listingId: z.string().min(1),
  qty: z.number().int().positive().default(1),
});

export default async function blackMarketRoutes(
  fastify: FastifyInstance,
  { prisma }: { prisma: PrismaClient }
) {
  fastify.get("/black-market/rotation", { preHandler: requireAuth }, async (request, reply) => {
    try {
      const { rotation } = await getBlackMarketListings(prisma, request.user.userId);
      return reply.send({ rotation: serializeMarketRotation(rotation) });
    } catch (err) {
      request.log.error(err, "/black-market/rotation error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.get("/black-market/listings", { preHandler: requireAuth }, async (request, reply) => {
    try {
      const { rotation, listings, profile } = await getBlackMarketListings(prisma, request.user.userId);
      return reply.send({
        rotation: serializeMarketRotation(rotation),
        listings: listings.map((listing) => ({
          ...serializeMarketListing(listing),
          canAfford: (profile?.cash ?? 0) >= listing.finalPrice,
        })),
      });
    } catch (err) {
      request.log.error(err, "/black-market/listings error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.post("/black-market/buy", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = buyBody.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Invalid input" });
    const { userId } = request.user;

    try {
      await ensurePlayerMissionsAssigned(prisma, userId);
      const result = await buyBlackMarketListing(prisma, userId, parsed.data.listingId, parsed.data.qty);
      const missionUpdates = await prisma.$transaction((tx) =>
        progressPlayerMissions(tx, userId, [{ goalType: "black_market_buy", amount: 1 }])
      );

      return reply.send({
        purchaseSuccess: true,
        itemGranted: { id: result.listing.item.id, name: result.listing.item.name },
        qty: result.purchase.qty,
        pricePaid: result.purchase.pricePaid,
        heatChange: result.heatChange,
        stingTriggered: result.stingTriggered,
        newWalletCash: result.profile.cash,
        missionUpdates,
      });
    } catch (err) {
      if (err instanceof BlackMarketError) {
        return reply.status(err.status).send({ error: err.message });
      }
      request.log.error(err, "/black-market/buy error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });
}
