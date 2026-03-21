import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../lib/auth";
import { ensurePlayerMissionsAssigned } from "../lib/missions/assign";
import { claimMissionReward } from "../lib/missions/rewards";

export default async function missionsRoutes(
  fastify: FastifyInstance,
  { prisma }: { prisma: PrismaClient }
) {
  fastify.get("/missions", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;

    try {
      await ensurePlayerMissionsAssigned(prisma, userId);
      const missions = await prisma.playerMission.findMany({
        where: {
          userId,
          startsAt: { lte: new Date() },
          endsAt: { gt: new Date() },
        },
        include: { missionDefinition: { include: { rewardItem: true } } },
        orderBy: { createdAt: "asc" },
      });

      const serialized = missions.map((mission) => ({
        id: mission.id,
        type: mission.missionDefinition.type,
        code: mission.missionDefinition.code,
        name: mission.missionDefinition.name,
        description: mission.missionDefinition.description,
        goalType: mission.missionDefinition.goalType,
        goalValue: mission.missionDefinition.goalValue,
        progress: mission.progress,
        completed: mission.completed,
        claimed: mission.claimed,
        startsAt: mission.startsAt,
        endsAt: mission.endsAt,
        rewards: {
          cash: mission.missionDefinition.rewardCash,
          rp: mission.missionDefinition.rewardRp,
          item: mission.missionDefinition.rewardItem
            ? { id: mission.missionDefinition.rewardItem.id, name: mission.missionDefinition.rewardItem.name }
            : null,
        },
      }));

      return reply.send({
        daily: serialized.filter((mission) => mission.type === "daily"),
        weekly: serialized.filter((mission) => mission.type === "weekly"),
      });
    } catch (err) {
      request.log.error(err, "/missions error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.post("/missions/:id/claim", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;
    const params = request.params as { id?: string };
    if (!params.id) return reply.status(400).send({ error: "Mission id is required" });

    try {
      const result = await prisma.$transaction((tx) => claimMissionReward(tx, userId, params.id!));
      return reply.send(result);
    } catch (err) {
      return reply.status(400).send({ error: err instanceof Error ? err.message : "Mission claim failed" });
    }
  });
}
