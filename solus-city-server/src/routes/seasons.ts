import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../lib/auth";
import { getCurrentSeason } from "../lib/seasons/scoring";
import {
  serializeHallOfFameEntry,
  serializeSeasonHistoryEntry,
  serializeSeasonRewardPreview,
  serializeSeasonSummary,
} from "../lib/serializers/seasons";
import { getHallOfFameFeed, getSeasonHistoryForUser } from "../lib/seasons/history";
import { getProjectedRewardTier, getSeasonRewardTierCatalog } from "../lib/seasons/rewards";

export default async function seasonsRoutes(
  fastify: FastifyInstance,
  { prisma }: { prisma: PrismaClient }
) {
  fastify.get("/seasons/current", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;

    try {
      const season = await getCurrentSeason(prisma);
      if (!season) return reply.send({ currentSeason: null });

      const [participation, standings] = await Promise.all([
        prisma.seasonParticipation.findUnique({ where: { seasonId_userId: { seasonId: season.id, userId } } }),
        prisma.seasonParticipation.findMany({
          where: { seasonId: season.id },
          orderBy: [{ score: "desc" }, { createdAt: "asc" }],
          select: { userId: true },
        }),
      ]);

      const rank = standings.findIndex((entry) => entry.userId === userId) + 1;
      return reply.send({
        currentSeason: serializeSeasonSummary({
          season,
          participation,
          rank: rank > 0 ? rank : null,
        }),
      });
    } catch (err) {
      request.log.error(err, "/seasons/current error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.get("/seasons/current/rewards", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;

    try {
      const season = await getCurrentSeason(prisma);
      if (!season) {
        return reply.send({ rewardPreview: null });
      }

      const [projected, rewardTiers] = await Promise.all([
        getProjectedRewardTier(prisma, userId, season.id),
        Promise.resolve(getSeasonRewardTierCatalog()),
      ]);

      return reply.send({
        rewardPreview: serializeSeasonRewardPreview({
          season,
          projected,
          rewardTiers,
        }),
      });
    } catch (err) {
      request.log.error(err, "/seasons/current/rewards error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.get("/seasons/history", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;

    try {
      const [historyRows, hallOfFame] = await Promise.all([
        getSeasonHistoryForUser(prisma, userId, 6),
        getHallOfFameFeed(prisma, 12),
      ]);

      return reply.send({
        history: historyRows.map((entry) =>
          serializeSeasonHistoryEntry({
            season: entry.season,
            participation: entry.participation,
            highlights: entry.highlights,
          })
        ),
        hallOfFameHighlights: hallOfFame.map((entry) => serializeHallOfFameEntry(entry)),
      });
    } catch (err) {
      request.log.error(err, "/seasons/history error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });
}

