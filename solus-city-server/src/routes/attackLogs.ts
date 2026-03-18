import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../lib/auth";
import { isInHospital } from "../lib/game";

export default async function attackLogsRoutes(
  fastify: FastifyInstance,
  { prisma }: { prisma: PrismaClient }
) {
  fastify.get("/logs/attacks", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;

    try {
      const [profile, logs] = await Promise.all([
        prisma.profile.findUnique({ where: { userId } }),
        prisma.attackLog.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 }),
      ]);

      if (!profile) return reply.status(404).send({ error: "Profile not found" });
      const now = new Date();

      const enriched = await Promise.all(
        logs.map(async (entry) => {
          let revengeAvailable = !!entry.revengeAvailable;
          const outcomeType =
            entry.type === "attack_evaded" || entry.type === "attacked_by_player_evaded" ? "evaded" : undefined;

          if (entry.targetType === "player" && entry.revengeTargetId && revengeAvailable) {
            const [targetProfile, cooldown] = await Promise.all([
              prisma.profile.findUnique({ where: { userId: entry.revengeTargetId } }),
              prisma.attackCooldown.findUnique({
                where: {
                  attackerId_defenderId: {
                    attackerId: userId,
                    defenderId: entry.revengeTargetId,
                  },
                },
              }),
            ]);

            if (!targetProfile || isInHospital(profile) || isInHospital(targetProfile) || targetProfile.shieldUntil > now || (cooldown && cooldown.nextAttackTs > now)) {
              revengeAvailable = false;
            }
          } else {
            revengeAvailable = false;
          }

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
            rpChange: entry.rpChange,
            xpGained: entry.xpGained,
            hospitalResult: entry.hospitalResult,
            revengeTargetId: entry.revengeTargetId,
            revengeAvailable,
          };
        })
      );

      return reply.send(enriched);
    } catch (err) {
      request.log.error(err, "/logs/attacks error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });
}
