import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { requireAuth } from "../lib/auth";
import { applyIncome, applyEnergy, applyNerve, applyHappiness, applyHospitalRecovery, isInHospital, processLevelUp } from "../lib/game";

const commitBody = z.object({
  crimeId: z.string().min(1),
});

export default async function crimeRoutes(
  fastify: FastifyInstance,
  { prisma }: { prisma: PrismaClient }
) {
  // GET /crimes — list available crimes for player's level
  fastify.get("/crimes", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;
    try {
      const profile = await prisma.profile.findUnique({ where: { userId } });
      if (!profile) return reply.status(404).send({ error: "Profile not found" });

      const crimes = await prisma.crime.findMany({
        orderBy: { levelReq: "asc" },
      });

      const crimesWithState = crimes.map((crime) => ({
        ...crime,
        locked: crime.levelReq > profile.level,
      }));

      return reply.send(crimesWithState);
    } catch (err) {
      request.log.error(err, "/crimes error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  // POST /crimes/commit — attempt a crime
  fastify.post("/crimes/commit", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;

    const parsed = commitBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid input" });
    }
    const { crimeId } = parsed.data;

    try {
      const [profile, crime] = await Promise.all([
        prisma.profile.findUnique({ where: { userId } }),
        prisma.crime.findUnique({ where: { id: crimeId } }),
      ]);

      if (!profile) return reply.status(404).send({ error: "Profile not found" });
      if (!crime) return reply.status(404).send({ error: "Crime not found" });

      const hospitalUpdate = applyHospitalRecovery(profile);
      const recoveredProfile = { ...profile, ...hospitalUpdate };
      if (hospitalUpdate.health !== undefined) {
        await prisma.$transaction([
          prisma.profile.update({ where: { userId }, data: hospitalUpdate }),
          prisma.eventLog.create({
            data: {
              userId,
              type: "hospital",
              message: "Discharged from hospital. Health fully restored.",
            },
          }),
        ]);
      }

      if (isInHospital(recoveredProfile)) {
        return reply.status(400).send({ error: "You are in the hospital" });
      }

      if (recoveredProfile.level < crime.levelReq) {
        return reply.status(400).send({ error: `Requires level ${crime.levelReq}` });
      }

      // Apply regen
      const incomeUpdate = applyIncome(recoveredProfile);
      const energyUpdate = applyEnergy({ ...recoveredProfile, ...incomeUpdate });
      const nerveUpdate = applyNerve({ ...recoveredProfile, ...incomeUpdate, ...energyUpdate });
      const happinessUpdate = applyHappiness({ ...recoveredProfile, ...incomeUpdate, ...energyUpdate, ...nerveUpdate });
      const updated = { ...recoveredProfile, ...incomeUpdate, ...energyUpdate, ...nerveUpdate, ...happinessUpdate };

      if (updated.nerve < crime.nerveCost) {
        await prisma.profile.update({ where: { userId }, data: { ...incomeUpdate, ...energyUpdate, ...nerveUpdate, ...happinessUpdate } });
        return reply.status(400).send({ error: `Not enough nerve (need ${crime.nerveCost})` });
      }

      // Roll for success
      const roll = Math.random();
      const success = roll < crime.successRate;

      let cashGained = 0;
      let xpGained = crime.xpReward;

      if (success) {
        cashGained = crime.cashMin + Math.floor(Math.random() * (crime.cashMax - crime.cashMin + 1));
      } else {
        xpGained = Math.floor(xpGained / 2); // Half XP on failure
      }

      const newXp = updated.xp + xpGained;
      const levelResult = processLevelUp({ ...updated, xp: newXp });

      const updateData: Record<string, unknown> = {
        ...incomeUpdate,
        ...energyUpdate,
        ...nerveUpdate,
        ...happinessUpdate,
        nerve: updated.nerve - crime.nerveCost,
        cash: updated.cash + cashGained,
        xp: levelResult.xp ?? newXp,
        level: levelResult.level ?? updated.level,
        maxHealth: levelResult.maxHealth ?? updated.maxHealth,
      };

      const finalProfile = await prisma.profile.update({
        where: { userId },
        data: updateData,
      });

      // Log event
      const eventMsg = success
        ? `Committed ${crime.name} and earned $${cashGained.toLocaleString()}`
        : `Failed to commit ${crime.name}`;

      await prisma.eventLog.create({
        data: { userId, type: "crime", message: eventMsg },
      });

      if (levelResult.level && levelResult.level > updated.level) {
        await prisma.eventLog.create({
          data: { userId, type: "level_up", message: `Reached level ${levelResult.level}!` },
        });
      }

      return reply.send({
        success,
        crimeName: crime.name,
        cashGained,
        xpGained,
        leveledUp: levelResult.level ? levelResult.level > updated.level : false,
        newLevel: finalProfile.level,
        profile: {
          nerve: finalProfile.nerve,
          cash: finalProfile.cash,
          xp: finalProfile.xp,
          level: finalProfile.level,
        },
      });
    } catch (err) {
      request.log.error(err, "/crimes/commit error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });
}
