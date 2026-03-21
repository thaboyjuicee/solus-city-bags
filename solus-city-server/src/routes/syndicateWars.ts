import { FastifyInstance } from "fastify";
import { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { requireAuth } from "../lib/auth";
import { addWarParticipation } from "../lib/syndicates/contributions";
import { recordWarAction } from "../lib/syndicates/wars";
import { serializeWarSummary } from "../lib/serializers/syndicates";

const actionBody = z.object({
  actionType: z.enum(["supply_deliver", "node_secure"]),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export default async function syndicateWarsRoutes(
  fastify: FastifyInstance,
  { prisma }: { prisma: PrismaClient }
) {
  fastify.get("/wars/current", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;

    try {
      const membership = await prisma.syndicateMember.findUnique({ where: { userId } });
      if (!membership) return reply.send({ wars: [] });

      const wars = await prisma.syndicateWar.findMany({
        where: {
          status: "active",
          OR: [
            { attackerSyndicateId: membership.syndicateId },
            { defenderSyndicateId: membership.syndicateId },
          ],
        },
        orderBy: { startsAt: "asc" },
        include: {
          territory: true,
          attackerSyndicate: true,
          defenderSyndicate: true,
        },
      });

      return reply.send({
        syndicateId: membership.syndicateId,
        wars: wars.map((war) => serializeWarSummary(war)),
      });
    } catch (err) {
      request.log.error(err, "/wars/current error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.get("/wars/:id/scoreboard", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;
    const warId = (request.params as { id: string }).id;

    try {
      const membership = await prisma.syndicateMember.findUnique({ where: { userId } });
      if (!membership) return reply.status(403).send({ error: "Join a syndicate first" });

      const war = await prisma.syndicateWar.findUnique({
        where: { id: warId },
        include: {
          territory: true,
          attackerSyndicate: true,
          defenderSyndicate: true,
          actions: {
            orderBy: { createdAt: "desc" },
            take: 100,
            include: {
              user: { include: { profile: true } },
              syndicate: true,
            },
          },
        },
      });

      if (!war) return reply.status(404).send({ error: "War not found" });
      if (![war.attackerSyndicateId, war.defenderSyndicateId].includes(membership.syndicateId)) {
        return reply.status(403).send({ error: "You are not part of this war" });
      }

      const totals = new Map<string, { userId: string; name: string; syndicateId: string; points: number }>();
      for (const action of war.actions) {
        const existing = totals.get(action.userId) ?? {
          userId: action.userId,
          name: action.user.profile?.name ?? action.user.wallet.slice(0, 6),
          syndicateId: action.syndicateId,
          points: 0,
        };
        existing.points += action.points;
        totals.set(action.userId, existing);
      }

      const actionBreakdown = war.actions.reduce<Record<string, number>>((acc, action) => {
        acc[action.actionType] = (acc[action.actionType] ?? 0) + action.points;
        return acc;
      }, {});

      return reply.send({
        war: serializeWarSummary(war),
        actionBreakdown,
        topParticipants: Array.from(totals.values()).sort((a, b) => b.points - a.points).slice(0, 10),
        recentActions: war.actions.map((action) => ({
          id: action.id,
          actionType: action.actionType,
          points: action.points,
          createdAt: action.createdAt,
          actorName: action.user.profile?.name ?? action.user.wallet.slice(0, 6),
          syndicateName: action.syndicate.name,
          metadata: action.metadata,
        })),
      });
    } catch (err) {
      request.log.error(err, "/wars/:id/scoreboard error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.post("/wars/:id/join", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;
    const warId = (request.params as { id: string }).id;

    try {
      const membership = await prisma.syndicateMember.findUnique({ where: { userId } });
      if (!membership) return reply.status(403).send({ error: "Join a syndicate first" });

      const war = await prisma.syndicateWar.findUnique({ where: { id: warId } });
      if (!war || war.status !== "active") return reply.status(404).send({ error: "Active war not found" });
      if (![war.attackerSyndicateId, war.defenderSyndicateId].includes(membership.syndicateId)) {
        return reply.status(403).send({ error: "You are not part of this war" });
      }

      await prisma.$transaction(async (tx) => {
        await tx.syndicateMember.update({
          where: { id: membership.id },
          data: { lastActiveAt: new Date() },
        });
      });

      return reply.send({ joined: true, warId });
    } catch (err) {
      request.log.error(err, "/wars/:id/join error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.post("/wars/:id/action", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;
    const warId = (request.params as { id: string }).id;
    const parsed = actionBody.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    }

    try {
      const membership = await prisma.syndicateMember.findUnique({ where: { userId } });
      if (!membership) return reply.status(403).send({ error: "Join a syndicate first" });

      const war = await prisma.syndicateWar.findUnique({ where: { id: warId } });
      if (!war || war.status !== "active") return reply.status(404).send({ error: "Active war not found" });
      if (![war.attackerSyndicateId, war.defenderSyndicateId].includes(membership.syndicateId)) {
        return reply.status(403).send({ error: "You are not part of this war" });
      }

      const cooldownStart = new Date(Date.now() - 5 * 60 * 1000);
      const recent = await prisma.syndicateWarAction.findFirst({
        where: {
          warId,
          userId,
          createdAt: { gte: cooldownStart },
        },
        orderBy: { createdAt: "desc" },
      });
      if (recent) {
        return reply.status(429).send({ error: "Action recently submitted. Try again shortly." });
      }

      const actionCount = await prisma.syndicateWarAction.count({
        where: { warId, userId },
      });
      if (actionCount >= 12) {
        return reply.status(400).send({ error: "Personal war action limit reached for this war" });
      }

      const result = await prisma.$transaction(async (tx) => {
        const actionResult = await recordWarAction(
          tx,
          warId,
          userId,
          membership.syndicateId,
          parsed.data.actionType,
          parsed.data.payload as Prisma.InputJsonValue | undefined
        );
        await addWarParticipation(tx, userId, actionResult.points);
        await tx.eventLog.create({
          data: {
            userId,
            type: "war_action",
            message: `Completed ${parsed.data.actionType.replace(/_/g, " ")} during active war.`,
            metadata: {
              warId,
              actionType: parsed.data.actionType,
              points: actionResult.points,
            },
          },
        });
        return actionResult;
      });

      return reply.send({
        warId,
        actionType: parsed.data.actionType,
        pointsGained: result.points,
      });
    } catch (err) {
      request.log.error(err, "/wars/:id/action error");
      return reply.status(500).send({ error: err instanceof Error ? err.message : "Internal server error" });
    }
  });
}
