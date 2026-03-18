import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { requireAuth } from "../lib/auth";
import { applyIncome, applyEnergy, applyNerve, applyHappiness, applyHospitalRecovery, isInHospital, processLevelUp } from "../lib/game";
import { GYM_ENERGY_COST, GYM_STAT_GAIN_MIN, GYM_STAT_GAIN_MAX, GYM_XP_REWARD, GYM_HAPPY_COST } from "../lib/constants";

const trainBody = z.object({
  stat: z.enum(["strength", "speed", "defense", "dexterity"]),
});

export default async function gymRoutes(
  fastify: FastifyInstance,
  { prisma }: { prisma: PrismaClient }
) {
  // POST /gym/train — spend energy to train a combat stat
  fastify.post("/gym/train", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;

    const parsed = trainBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid stat. Choose: strength, speed, defense, dexterity" });
    }
    const { stat } = parsed.data;

    try {
      const profile = await prisma.profile.findUnique({ where: { userId } });
      if (!profile) return reply.status(404).send({ error: "Profile not found" });

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
        return reply.status(400).send({ error: "You are in the hospital and cannot train" });
      }

      // Apply regen
      const incomeUpdate = applyIncome(recoveredProfile);
      const energyUpdate = applyEnergy({ ...recoveredProfile, ...incomeUpdate });
      const nerveUpdate = applyNerve({ ...recoveredProfile, ...incomeUpdate, ...energyUpdate });
      const happinessUpdate = applyHappiness({ ...recoveredProfile, ...incomeUpdate, ...energyUpdate, ...nerveUpdate });
      const updated = { ...recoveredProfile, ...incomeUpdate, ...energyUpdate, ...nerveUpdate, ...happinessUpdate };

      if (updated.energy < GYM_ENERGY_COST) {
        await prisma.profile.update({ where: { userId }, data: { ...incomeUpdate, ...energyUpdate, ...nerveUpdate, ...happinessUpdate } });
        return reply.status(400).send({ error: `Not enough energy (need ${GYM_ENERGY_COST})` });
      }

      // Calculate stat gain (higher with happiness)
      const baseGain = GYM_STAT_GAIN_MIN + Math.floor(Math.random() * (GYM_STAT_GAIN_MAX - GYM_STAT_GAIN_MIN + 1));
      const happyBonus = updated.happiness >= GYM_HAPPY_COST ? 1 : 0;
      const totalGain = baseGain + happyBonus;
      const happySpent = happyBonus > 0 ? GYM_HAPPY_COST : 0;

      // Apply XP and check level up
      const newXp = updated.xp + GYM_XP_REWARD;
      const levelResult = processLevelUp({ ...updated, xp: newXp });

      const updateData: Record<string, unknown> = {
        ...incomeUpdate,
        ...energyUpdate,
        ...nerveUpdate,
        ...happinessUpdate,
        energy: updated.energy - GYM_ENERGY_COST,
        happiness: Math.max(0, updated.happiness - happySpent),
        xp: levelResult.xp ?? newXp,
        level: levelResult.level ?? updated.level,
        maxHealth: levelResult.maxHealth ?? updated.maxHealth,
        [stat]: (updated as Record<string, unknown>)[stat] as number + totalGain,
      };

      const finalProfile = await prisma.profile.update({
        where: { userId },
        data: updateData,
      });

      // Log event
      await prisma.eventLog.create({
        data: {
          userId,
          type: "gym",
          message: `Trained ${stat} and gained +${totalGain} points`,
        },
      });

      // Log level up
      if (levelResult.level && levelResult.level > updated.level) {
        await prisma.eventLog.create({
          data: {
            userId,
            type: "level_up",
            message: `Reached level ${levelResult.level}!`,
          },
        });
      }

      return reply.send({
        stat,
        gained: totalGain,
        happyBonus: happyBonus > 0,
        xpGained: GYM_XP_REWARD,
        leveledUp: levelResult.level ? levelResult.level > updated.level : false,
        newLevel: finalProfile.level,
        profile: {
          energy: finalProfile.energy,
          happiness: finalProfile.happiness,
          strength: finalProfile.strength,
          speed: finalProfile.speed,
          defense: finalProfile.defense,
          dexterity: finalProfile.dexterity,
          xp: finalProfile.xp,
          level: finalProfile.level,
        },
      });
    } catch (err) {
      request.log.error(err, "/gym/train error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });
}
