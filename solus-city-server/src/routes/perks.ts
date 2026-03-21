import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { requireAuth } from "../lib/auth";
import { PERK_BRANCHES } from "../lib/config/game";
import { getAvailablePerkPoints, unlockPerk } from "../lib/player/perks";

const unlockBody = z.object({
  perkDefinitionId: z.string().min(1),
});

export default async function perksRoutes(
  fastify: FastifyInstance,
  { prisma }: { prisma: PrismaClient }
) {
  fastify.get("/perks", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;

    try {
      const [profile, definitions, unlocked] = await Promise.all([
        prisma.profile.findUnique({ where: { userId } }),
        prisma.perkDefinition.findMany({
          where: { active: true },
          include: { prerequisitePerk: { select: { id: true, code: true, name: true } } },
          orderBy: [{ branch: "asc" }, { tier: "asc" }, { code: "asc" }],
        }),
        prisma.playerPerk.findMany({
          where: { userId },
          include: { perkDefinition: true },
          orderBy: { unlockedAt: "asc" },
        }),
      ]);

      if (!profile) return reply.status(404).send({ error: "Profile not found" });

      return reply.send({
        branches: PERK_BRANCHES,
        definitions,
        unlocked,
        availablePoints: getAvailablePerkPoints(profile, unlocked.length),
      });
    } catch (err) {
      request.log.error(err, "/perks error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.post("/perks/unlock", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = unlockBody.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Invalid input" });

    try {
      const result = await unlockPerk(prisma, request.user.userId, parsed.data.perkDefinitionId);
      const unlocked = await prisma.playerPerk.findMany({
        where: { userId: request.user.userId },
        include: { perkDefinition: true },
        orderBy: { unlockedAt: "asc" },
      });

      return reply.send({
        unlocked: result.unlocked,
        availablePoints: result.availablePoints,
        unlockedPerks: unlocked,
      });
    } catch (err) {
      return reply.status(400).send({ error: err instanceof Error ? err.message : "Failed to unlock perk" });
    }
  });
}
