import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { requireAuth } from "../lib/auth";
import { applyEnergy, applyHappiness, applyHospitalRecovery, applyIncome, applyNerve, isInHospital, processLevelUp } from "../lib/game";
import { applyHeat, decayHeat } from "../lib/player/heat";
import { ensurePlayerMissionsAssigned } from "../lib/missions/assign";
import { progressPlayerMissions } from "../lib/missions/progress";

const commitBody = z.object({
  crimeId: z.string().min(1),
});

export default async function crimeRoutes(
  fastify: FastifyInstance,
  { prisma }: { prisma: PrismaClient }
) {
  fastify.get("/crimes", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;
    try {
      const profile = await prisma.profile.findUnique({ where: { userId } });
      if (!profile) return reply.status(404).send({ error: "Profile not found" });

      const crimes = await prisma.crime.findMany({
        orderBy: { levelReq: "asc" },
      });

      return reply.send(
        crimes.map((crime) => ({
          ...crime,
          locked: crime.levelReq > profile.level,
        }))
      );
    } catch (err) {
      request.log.error(err, "/crimes error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.post("/crimes/commit", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;
    const parsed = commitBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid input" });
    }

    try {
      await ensurePlayerMissionsAssigned(prisma, userId);

      const [profile, crime, contrabandItem] = await Promise.all([
        prisma.profile.findUnique({ where: { userId } }),
        prisma.crime.findUnique({ where: { id: parsed.data.crimeId } }),
        prisma.item.findFirst({ where: { name: "Contraband Bundle" } }),
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
              metadata: { method: "natural_recovery" },
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

      const incomeUpdate = applyIncome(recoveredProfile);
      const energyUpdate = applyEnergy({ ...recoveredProfile, ...incomeUpdate });
      const nerveUpdate = applyNerve({ ...recoveredProfile, ...incomeUpdate, ...energyUpdate });
      const happinessUpdate = applyHappiness({ ...recoveredProfile, ...incomeUpdate, ...energyUpdate, ...nerveUpdate });
      const heatState = decayHeat({ ...recoveredProfile, ...incomeUpdate, ...energyUpdate, ...nerveUpdate, ...happinessUpdate });
      const updated = { ...recoveredProfile, ...incomeUpdate, ...energyUpdate, ...nerveUpdate, ...happinessUpdate, ...heatState };

      if (updated.nerve < crime.nerveCost) {
        await prisma.profile.update({
          where: { userId },
          data: {
            ...incomeUpdate,
            ...energyUpdate,
            ...nerveUpdate,
            ...happinessUpdate,
            heat: heatState.heat,
            wantedTier: heatState.wantedTier,
            lastHeatDecayAt: heatState.lastHeatDecayAt,
          },
        });
        return reply.status(400).send({ error: `Not enough nerve (need ${crime.nerveCost})` });
      }

      const roll = Math.random();
      const success = roll < crime.successRate;
      let cashGained = success
        ? crime.cashMin + Math.floor(Math.random() * (crime.cashMax - crime.cashMin + 1))
        : 0;
      let xpGained = success ? crime.xpReward : Math.floor(crime.xpReward / 2);
      let heatChange = Math.max(1, Math.round(crime.nerveCost / 2)) + (success ? 0 : 2);
      let specialOutcome: string | null = null;
      let contrabandDrop: string | null = null;

      if (success && Math.random() < 0.1) {
        specialOutcome = "clean_getaway";
        heatChange = Math.max(0, heatChange - 2);
      } else if (!success && Math.random() < 0.25) {
        specialOutcome = "police_attention";
        heatChange += 3;
      }

      if (success && crime.levelReq >= 5 && contrabandItem && Math.random() < 0.12) {
        contrabandDrop = contrabandItem.name;
      }

      const heatUpdate = applyHeat(updated, heatChange);
      const newXp = updated.xp + xpGained;
      const levelResult = processLevelUp({ ...updated, xp: newXp });

      const txResult = await prisma.$transaction(async (tx) => {
        const finalProfile = await tx.profile.update({
          where: { userId },
          data: {
            ...incomeUpdate,
            ...energyUpdate,
            ...nerveUpdate,
            ...happinessUpdate,
            nerve: updated.nerve - crime.nerveCost,
            cash: updated.cash + cashGained,
            xp: levelResult.xp ?? newXp,
            level: levelResult.level ?? updated.level,
            maxHealth: levelResult.maxHealth ?? updated.maxHealth,
            heat: heatUpdate.heat,
            wantedTier: heatUpdate.wantedTier,
            lastHeatDecayAt: heatUpdate.lastHeatDecayAt,
          },
        });

        if (contrabandItem && contrabandDrop) {
          await tx.inventory.upsert({
            where: { userId_itemId: { userId, itemId: contrabandItem.id } },
            update: { qty: { increment: 1 }, sourceType: "crime_drop" },
            create: { userId, itemId: contrabandItem.id, qty: 1, sourceType: "crime_drop" },
          });
        }

        const missionUpdates = await progressPlayerMissions(
          tx,
          userId,
          [
            { goalType: "crime_commit", amount: 1 },
            { goalType: "cash_earned", amount: cashGained },
          ]
        );

        await tx.eventLog.create({
          data: {
            userId,
            type: "crime",
            message: success
              ? `Committed ${crime.name} and earned $${cashGained.toLocaleString()}`
              : `Failed to commit ${crime.name}`,
            metadata: {
              crimeId: crime.id,
              crimeName: crime.name,
              success,
              cashGained,
              xpGained,
              heatChange,
              newHeat: heatUpdate.heat,
              wantedTier: heatUpdate.wantedTier,
              specialOutcome,
              contrabandDrop,
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
        success,
        crimeName: crime.name,
        cashGained,
        xpGained,
        leveledUp: levelResult.level ? levelResult.level > updated.level : false,
        newLevel: txResult.finalProfile.level,
        heatChange,
        newHeat: txResult.finalProfile.heat,
        wantedTier: txResult.finalProfile.wantedTier,
        specialOutcome,
        contrabandDrop,
        missionUpdates: txResult.missionUpdates,
        profile: {
          nerve: txResult.finalProfile.nerve,
          cash: txResult.finalProfile.cash,
          xp: txResult.finalProfile.xp,
          level: txResult.finalProfile.level,
        },
      });
    } catch (err) {
      request.log.error(err, "/crimes/commit error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });
}
