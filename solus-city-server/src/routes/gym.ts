import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { requireAuth } from "../lib/auth";
import { applyEnergy, applyHappiness, applyHospitalRecovery, applyIncome, applyNerve, isInHospital, processLevelUp } from "../lib/game";
import { GYM_ENERGY_COST, GYM_HAPPY_COST, GYM_STAT_GAIN_MAX, GYM_STAT_GAIN_MIN, GYM_XP_REWARD } from "../lib/constants";
import { decayHeat } from "../lib/player/heat";
import { ensurePlayerMissionsAssigned } from "../lib/missions/assign";
import { progressPlayerMissions } from "../lib/missions/progress";
import { getPlayerPerkContext } from "../lib/player/perks";
import { getHospitalPenaltyEffects } from "../lib/player/hospitalPenalty";

const trainBody = z.object({
  stat: z.enum(["strength", "speed", "defense", "dexterity"]),
});

export default async function gymRoutes(
  fastify: FastifyInstance,
  { prisma }: { prisma: PrismaClient }
) {
  fastify.post("/gym/train", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;
    const parsed = trainBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid stat. Choose: strength, speed, defense, dexterity" });
    }

    try {
      await ensurePlayerMissionsAssigned(prisma, userId);
      const [profile, perkContext] = await Promise.all([
        prisma.profile.findUnique({ where: { userId } }),
        getPlayerPerkContext(userId, prisma),
      ]);
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
              metadata: { method: "natural_recovery" },
            },
          }),
        ]);
      }

      if (isInHospital(recoveredProfile)) {
        return reply.status(400).send({ error: "You are in the hospital and cannot train" });
      }

      const incomeUpdate = applyIncome(recoveredProfile);
      const energyUpdate = applyEnergy({ ...recoveredProfile, ...incomeUpdate });
      const nerveUpdate = applyNerve({ ...recoveredProfile, ...incomeUpdate, ...energyUpdate });
      const happinessUpdate = applyHappiness({ ...recoveredProfile, ...incomeUpdate, ...energyUpdate, ...nerveUpdate });
      const heatUpdate = decayHeat({ ...recoveredProfile, ...incomeUpdate, ...energyUpdate, ...nerveUpdate, ...happinessUpdate });
      const updated = { ...recoveredProfile, ...incomeUpdate, ...energyUpdate, ...nerveUpdate, ...happinessUpdate, ...heatUpdate };
      const hospitalPenaltyEffects = getHospitalPenaltyEffects(updated);

      if (updated.energy < GYM_ENERGY_COST) {
        await prisma.profile.update({
          where: { userId },
          data: { ...incomeUpdate, ...energyUpdate, ...nerveUpdate, ...happinessUpdate, heat: heatUpdate.heat, wantedTier: heatUpdate.wantedTier, lastHeatDecayAt: heatUpdate.lastHeatDecayAt },
        });
        return reply.status(400).send({ error: `Not enough energy (need ${GYM_ENERGY_COST})` });
      }

      const baseGain = GYM_STAT_GAIN_MIN + Math.floor(Math.random() * (GYM_STAT_GAIN_MAX - GYM_STAT_GAIN_MIN + 1));
      const happyBonus = updated.happiness >= GYM_HAPPY_COST ? 1 : 0;
      const trainingBonus = Math.min(0.5, perkContext.effects.training_efficiency_percent ?? 0);
      const totalGain = Math.max(
        1,
        Math.round((baseGain + happyBonus) * (1 + trainingBonus) * hospitalPenaltyEffects.gymGainMultiplier)
      );
      const happySpent = happyBonus > 0 ? GYM_HAPPY_COST : 0;
      const newXp = updated.xp + GYM_XP_REWARD;
      const levelResult = processLevelUp({ ...updated, xp: newXp });

      const txResult = await prisma.$transaction(async (tx) => {
        const finalProfile = await tx.profile.update({
          where: { userId },
          data: {
            ...incomeUpdate,
            ...energyUpdate,
            ...nerveUpdate,
            ...happinessUpdate,
            energy: updated.energy - GYM_ENERGY_COST,
            happiness: Math.max(0, updated.happiness - happySpent),
            xp: levelResult.xp ?? newXp,
            level: levelResult.level ?? updated.level,
            maxHealth: levelResult.maxHealth ?? updated.maxHealth,
            heat: heatUpdate.heat,
            wantedTier: heatUpdate.wantedTier,
            lastHeatDecayAt: heatUpdate.lastHeatDecayAt,
            [parsed.data.stat]: (updated as Record<string, unknown>)[parsed.data.stat] as number + totalGain,
          },
        });

        const missionUpdates = await progressPlayerMissions(tx, userId, [{ goalType: "gym_train", amount: 1 }]);

        await tx.eventLog.create({
          data: {
            userId,
            type: "gym",
            message: `Trained ${parsed.data.stat} and gained +${totalGain} points`,
            metadata: {
              stat: parsed.data.stat,
              gained: totalGain,
              xpGained: GYM_XP_REWARD,
              trainingBonus,
              hospitalPenaltyType: updated.hospitalExitPenaltyType,
            },
          },
        });

        if (levelResult.level && levelResult.level > updated.level) {
          await tx.eventLog.create({
            data: {
              userId,
              type: "level_up",
              message: `Reached level ${levelResult.level}!`,
              metadata: { level: levelResult.level },
            },
          });
        }

        return { finalProfile, missionUpdates };
      });

      return reply.send({
        stat: parsed.data.stat,
        gained: totalGain,
        happyBonus: happyBonus > 0,
        xpGained: GYM_XP_REWARD,
        leveledUp: levelResult.level ? levelResult.level > updated.level : false,
        newLevel: txResult.finalProfile.level,
        missionUpdates: txResult.missionUpdates,
        profile: {
          energy: txResult.finalProfile.energy,
          happiness: txResult.finalProfile.happiness,
          strength: txResult.finalProfile.strength,
          speed: txResult.finalProfile.speed,
          defense: txResult.finalProfile.defense,
          dexterity: txResult.finalProfile.dexterity,
          xp: txResult.finalProfile.xp,
          level: txResult.finalProfile.level,
        },
      });
    } catch (err) {
      request.log.error(err, "/gym/train error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });
}
