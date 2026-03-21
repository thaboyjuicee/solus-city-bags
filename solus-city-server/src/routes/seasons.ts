import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../lib/auth";
import { getCurrentSeason } from "../lib/seasons/scoring";
import { serializeSeasonSummary } from "../lib/serializers/seasons";

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

  fastify.get("/seasons/history", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;

    try {
      const seasons = await prisma.season.findMany({
        orderBy: { startsAt: "desc" },
        take: 6,
        include: {
          participations: {
            where: { userId },
            select: { score: true, pvpScore: true, crimeScore: true, missionScore: true, finalRank: true },
          },
        },
      });

      return reply.send({
        history: seasons.map((season) =>
          serializeSeasonSummary({
            season,
            participation: season.participations[0] ?? null,
            rank: season.participations[0]?.finalRank ?? null,
          })
        ),
      });
    } catch (err) {
      request.log.error(err, "/seasons/history error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });
}
