import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../lib/auth";
import { getCurrentSeason } from "../lib/seasons/scoring";
import { getChampionshipQualifiers, getCurrentChampionship } from "../lib/syndicates/championships";
import { serializeChampionshipSeason } from "../lib/serializers/seasons";

export default async function championshipsRoutes(
  fastify: FastifyInstance,
  { prisma }: { prisma: PrismaClient }
) {
  fastify.get("/championships/current", { preHandler: requireAuth }, async (request, reply) => {
    try {
      const championship = await getCurrentChampionship(prisma);
      return reply.send({
        championship: championship ? serializeChampionshipSeason(championship) : null,
      });
    } catch (err) {
      request.log.error(err, "/championships/current error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.get("/championships/bracket", { preHandler: requireAuth }, async (request, reply) => {
    try {
      const championship =
        (await getCurrentChampionship(prisma)) ??
        (await prisma.championshipSeason.findFirst({
          orderBy: { startsAt: "desc" },
          include: {
            season: true,
            entries: { include: { syndicate: true }, orderBy: { seed: "asc" } },
            matches: {
              include: { syndicateA: true, syndicateB: true, winnerSyndicate: true },
              orderBy: [{ round: "asc" }, { startsAt: "asc" }],
            },
          },
        }));

      return reply.send({
        bracket: championship ? serializeChampionshipSeason(championship) : null,
      });
    } catch (err) {
      request.log.error(err, "/championships/bracket error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.get("/championships/qualifiers", { preHandler: requireAuth }, async (request, reply) => {
    try {
      const activeChampionship = await getCurrentChampionship(prisma);
      if (activeChampionship) {
        return reply.send({
          qualifiers: activeChampionship.entries.map((entry) => ({
            seed: entry.seed,
            qualifyingPoints: entry.qualifyingPoints,
            syndicate: entry.syndicate,
          })),
        });
      }

      const season = await getCurrentSeason(prisma);
      if (!season) return reply.send({ qualifiers: [] });

      const qualifiers = await getChampionshipQualifiers(prisma, season.id);
      return reply.send({
        qualifiers: qualifiers.map((entry) => ({
          seed: entry.seed,
          qualifyingPoints: entry.qualifyingPoints,
          syndicate: { id: entry.syndicateId, name: entry.name },
        })),
      });
    } catch (err) {
      request.log.error(err, "/championships/qualifiers error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });
}

