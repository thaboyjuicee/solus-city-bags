import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { requireAuth } from "../lib/auth";
import { applyIncome, applyEnergy, applyNerve, applyHappiness, applyHospitalRecovery, computeCombatStats, nextEnergyAt, nextNerveAt, nextHappinessAt, isInHospital } from "../lib/game";
import { BASE_INCOME_PER_HOUR } from "../lib/constants";

const updateProfileBody = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Name must be at least 3 characters")
    .max(20, "Name cannot be longer than 20 characters"),
});

export default async function meRoutes(
  fastify: FastifyInstance,
  { prisma }: { prisma: PrismaClient }
) {
  fastify.get("/me", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;

    try {
      const profile = await prisma.profile.findUnique({ where: { userId } });
      if (!profile) {
        return reply.status(404).send({ error: "Profile not found" });
      }

      // Apply offline income, energy, and nerve regen
      const incomeUpdate = applyIncome(profile);
      const energyUpdate = applyEnergy({ ...profile, ...incomeUpdate });
      const nerveUpdate = applyNerve({ ...profile, ...incomeUpdate, ...energyUpdate });
      const happinessUpdate = applyHappiness({ ...profile, ...incomeUpdate, ...energyUpdate, ...nerveUpdate });
      const hospitalUpdate = applyHospitalRecovery({ ...profile, ...incomeUpdate, ...energyUpdate, ...nerveUpdate, ...happinessUpdate });

      const updatedProfile = await prisma.profile.update({
        where: { userId },
        data: { ...incomeUpdate, ...energyUpdate, ...nerveUpdate, ...happinessUpdate, ...hospitalUpdate },
      });

      if (hospitalUpdate.health !== undefined) {
        await prisma.eventLog.create({
          data: {
            userId,
            type: "hospital",
            message: "Discharged from hospital. Health fully restored.",
          },
        });
      }

      const combat = await computeCombatStats(userId, prisma);
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const membership = await prisma.syndicateMember.findUnique({
        where: { userId },
        include: { syndicate: true },
      });

      return reply.send({
        wallet: user?.wallet ?? "",
        name: updatedProfile.name,
        cash: updatedProfile.cash,
        rp: updatedProfile.rp,
        level: updatedProfile.level,
        xp: updatedProfile.xp,
        // Bars
        health: updatedProfile.health,
        maxHealth: updatedProfile.maxHealth,
        energy: updatedProfile.energy,
        maxEnergy: updatedProfile.maxEnergy,
        nerve: updatedProfile.nerve,
        maxNerve: updatedProfile.maxNerve,
        happiness: updatedProfile.happiness,
        maxHappiness: updatedProfile.maxHappiness,
        // Combat
        ap: combat.totalStats.ap,
        dp: combat.totalStats.dp,
        strength: updatedProfile.strength,
        speed: updatedProfile.speed,
        defense: updatedProfile.defense,
        dexterity: updatedProfile.dexterity,
        statBreakdown: combat,
        // Timers
        shieldUntil: updatedProfile.shieldUntil,
        hospitalUntil: updatedProfile.hospitalUntil,
        inHospital: isInHospital(updatedProfile),
        incomePerHour: BASE_INCOME_PER_HOUR,
        nextEnergyAt: nextEnergyAt(updatedProfile),
        nextNerveAt: nextNerveAt(updatedProfile),
        nextHappinessAt: nextHappinessAt(updatedProfile),
        slsSpent: updatedProfile.slsSpent,
        syndicate: membership
          ? {
              id: membership.syndicate.id,
              name: membership.syndicate.name,
              role: membership.role,
              buffType: membership.syndicate.buffType,
              buffValue: membership.syndicate.buffValue,
            }
          : null,
      });
    } catch (err) {
      request.log.error(err, "/me error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.patch("/me", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;

    const parsed = updateProfileBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    }
    const name = parsed.data.name;

    try {
      const existing = await prisma.profile.findUnique({ where: { userId } });
      if (!existing) return reply.status(404).send({ error: "Profile not found" });

      const updated = await prisma.profile.update({
        where: { userId },
        data: { name },
      });

      return reply.send({ name: updated.name });
    } catch (err) {
      request.log.error(err, "/me patch error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });
}
