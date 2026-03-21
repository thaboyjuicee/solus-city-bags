import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../lib/auth";

export default async function attackLogsRoutes(
  fastify: FastifyInstance,
  { prisma }: { prisma: PrismaClient }
) {
  fastify.get("/logs/attacks", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;

    try {
      const [logs, revengeMarks] = await Promise.all([
        prisma.attackLog.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 }),
        prisma.revengeMark.findMany({
          where: { victimUserId: userId, active: true, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: "desc" },
        }),
      ]);

      const revengeByTarget = new Map(revengeMarks.map((mark) => [mark.attackerUserId, mark]));

      const enriched = logs.map((entry) => {
        const revenge = entry.revengeTargetId ? revengeByTarget.get(entry.revengeTargetId) : undefined;
        const outcomeType =
          entry.type === "attack_evaded" || entry.type === "attacked_by_player_evaded" ? "evaded" : undefined;

        return {
          id: entry.id,
          createdAt: entry.createdAt,
          type: entry.type,
          attackerName: entry.attackerName,
          defenderName: entry.defenderName,
          targetType: entry.targetType,
          result: entry.result,
          outcomeType,
          damageDealt: entry.damageDealt,
          damageTaken: entry.damageTaken,
          loot: entry.loot,
          cashStolen: entry.cashStolen,
          heatChange: entry.heatChange,
          rpChange: entry.rpChange,
          xpGained: entry.xpGained,
          hospitalResult: entry.hospitalResult,
          revengeTargetId: revenge?.attackerUserId ?? entry.revengeTargetId,
          revengeAvailable: !!revenge,
          revengeExpiresAt: revenge?.expiresAt ?? null,
          revengeBonusPreview: revenge?.bonusPercent ?? 0,
          metadata: entry.metadata,
          protectionTriggered: (entry.metadata as { protectionTriggered?: string[] } | null)?.protectionTriggered ?? [],
        };
      });

      return reply.send(enriched);
    } catch (err) {
      request.log.error(err, "/logs/attacks error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });
}
