import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { requireAuth } from "../lib/auth";
import {
  addTerritoryContribution,
} from "../lib/syndicates/contributions";
import {
  applyTerritoryInfluence,
  getInfluenceDeltaForAction,
} from "../lib/syndicates/territories";
import { serializeTerritorySummary, serializeWarSummary } from "../lib/serializers/syndicates";

const contributionBody = z.object({
  actionType: z.enum(["donate_cash", "complete_local_task", "war_control_action"]),
});

const DONATE_CASH_COST = 1000;

export default async function territoriesRoutes(
  fastify: FastifyInstance,
  { prisma }: { prisma: PrismaClient }
) {
  fastify.get("/territories", { preHandler: requireAuth }, async (request, reply) => {
    try {
      const territories = await prisma.territory.findMany({
        where: { active: true },
        orderBy: { sortOrder: "asc" },
      });
      const controls = await prisma.territoryControl.findMany({
        where: { territoryId: { in: territories.map((territory) => territory.id) } },
        include: { syndicate: true },
      });
      const activeWars = await prisma.syndicateWar.findMany({
        where: {
          status: "active",
          territoryId: { in: territories.map((territory) => territory.id) },
        },
        include: {
          attackerSyndicate: true,
          defenderSyndicate: true,
          territory: true,
        },
      });

      const controlByTerritory = new Map(controls.map((control) => [control.territoryId, control]));
      const warByTerritory = new Map(activeWars.map((war) => [war.territoryId ?? "", war]));

      return reply.send({
        territories: territories.map((territory) =>
          serializeTerritorySummary({
            ...territory,
            control: controlByTerritory.get(territory.id) ?? null,
            linkedWar: warByTerritory.get(territory.id) ?? null,
          })
        ),
      });
    } catch (err) {
      request.log.error(err, "/territories error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.get("/territories/:id", { preHandler: requireAuth }, async (request, reply) => {
    const territoryId = (request.params as { id: string }).id;

    try {
      const territory = await prisma.territory.findUnique({ where: { id: territoryId } });
      if (!territory) return reply.status(404).send({ error: "Territory not found" });

      const [control, recentContributions, linkedWar] = await Promise.all([
        prisma.territoryControl.findUnique({ where: { territoryId }, include: { syndicate: true } }),
        prisma.territoryContribution.findMany({
          where: { territoryId },
          orderBy: { createdAt: "desc" },
          take: 12,
          include: {
            user: { include: { profile: true } },
            syndicate: true,
          },
        }),
        prisma.syndicateWar.findFirst({
          where: { territoryId, status: "active" },
          include: {
            territory: true,
            attackerSyndicate: true,
            defenderSyndicate: true,
          },
        }),
      ]);

      return reply.send({
        territory: serializeTerritorySummary({ ...territory, control, linkedWar }),
        linkedWar: linkedWar ? serializeWarSummary(linkedWar) : null,
        recentContributions: recentContributions.map((contribution) => ({
          id: contribution.id,
          actionType: contribution.actionType,
          influenceDelta: contribution.influenceDelta,
          createdAt: contribution.createdAt,
          userId: contribution.userId,
          userName: contribution.user.profile?.name ?? contribution.user.wallet.slice(0, 6),
          syndicateId: contribution.syndicateId,
          syndicateName: contribution.syndicate.name,
        })),
      });
    } catch (err) {
      request.log.error(err, "/territories/:id error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.post("/territories/:id/contribute", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;
    const territoryId = (request.params as { id: string }).id;
    const parsed = contributionBody.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    }

    try {
      const [membership, territory, profile] = await Promise.all([
        prisma.syndicateMember.findUnique({ where: { userId } }),
        prisma.territory.findUnique({ where: { id: territoryId } }),
        prisma.profile.findUnique({ where: { userId } }),
      ]);
      if (!membership) return reply.status(403).send({ error: "Join a syndicate first" });
      if (!territory || !territory.active) return reply.status(404).send({ error: "Territory not available" });
      if (!profile) return reply.status(404).send({ error: "Profile not found" });

      const cooldownStart = new Date(Date.now() - 10 * 60 * 1000);
      const recentContribution = await prisma.territoryContribution.findFirst({
        where: {
          territoryId,
          userId,
          createdAt: { gte: cooldownStart },
        },
        orderBy: { createdAt: "desc" },
      });
      if (recentContribution) {
        return reply.status(429).send({ error: "You have already contributed here recently" });
      }

      let cashSpent = 0;
      if (parsed.data.actionType === "donate_cash") {
        cashSpent = DONATE_CASH_COST;
        if (profile.cash < cashSpent) {
          return reply.status(400).send({ error: "Not enough wallet cash" });
        }
      }

      if (parsed.data.actionType === "war_control_action") {
        const activeWar = await prisma.syndicateWar.findFirst({
          where: {
            territoryId,
            status: "active",
            OR: [
              { attackerSyndicateId: membership.syndicateId },
              { defenderSyndicateId: membership.syndicateId },
            ],
          },
        });
        if (!activeWar) {
          return reply.status(400).send({ error: "War control actions require an active linked war" });
        }
      }

      const influenceDelta = getInfluenceDeltaForAction(parsed.data.actionType, cashSpent);
      if (influenceDelta <= 0) return reply.status(400).send({ error: "Unsupported contribution type" });

      const result = await prisma.$transaction(async (tx) => {
        if (cashSpent > 0) {
          await tx.profile.update({
            where: { userId },
            data: { cash: { decrement: cashSpent } },
          });
        }

        await addTerritoryContribution(
          tx,
          userId,
          territoryId,
          membership.syndicateId,
          parsed.data.actionType,
          influenceDelta
        );

        const influenceResult = await applyTerritoryInfluence(
          tx,
          territoryId,
          membership.syndicateId,
          influenceDelta
        );

        await tx.eventLog.create({
          data: {
            userId,
            type: "territory_contribution",
            message: `Contributed to ${territory.name} via ${parsed.data.actionType.replace(/_/g, " ")}.`,
            metadata: {
              territoryId,
              syndicateId: membership.syndicateId,
              actionType: parsed.data.actionType,
              influenceDelta,
              cashSpent,
              captured: influenceResult.captured,
            },
          },
        });

        const updatedControl = await tx.territoryControl.findUnique({
          where: { territoryId },
          include: { syndicate: true },
        });

        return { influenceResult, updatedControl };
      });

      return reply.send({
        territoryId,
        actionType: parsed.data.actionType,
        influenceDelta,
        cashSpent,
        captured: result.influenceResult.captured,
        territoryImpact: result.influenceResult.territoryImpact,
        ownerSyndicate: result.updatedControl?.syndicate
          ? {
              id: result.updatedControl.syndicate.id,
              name: result.updatedControl.syndicate.name,
            }
          : null,
      });
    } catch (err) {
      request.log.error(err, "/territories/:id/contribute error");
      return reply.status(500).send({ error: err instanceof Error ? err.message : "Internal server error" });
    }
  });
}
