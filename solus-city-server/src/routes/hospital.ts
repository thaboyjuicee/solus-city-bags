import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { requireAuth } from "../lib/auth";
import { isInHospital } from "../lib/game";
import {
  HOSPITAL_PENALTY_DURATION_HOURS,
} from "../lib/config/balance";
import { getPlayerPerkContext } from "../lib/player/perks";
import {
  getHospitalSlsReleasePricing,
  getReleasedHealth,
} from "../lib/player/hospital";
import { fetchSlsPrice } from "../lib/economy/sls";

const releaseItemBody = z.object({
  itemId: z.string().min(1),
});

const penaltyReleaseBody = z.object({
  type: z.enum(["weakened", "shaken", "exposed"]),
});

export default async function hospitalRoutes(
  fastify: FastifyInstance,
  { prisma }: { prisma: PrismaClient }
) {
  fastify.get("/hospital/options", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;

    try {
      const [profile, items, perkContext] = await Promise.all([
        prisma.profile.findUnique({ where: { userId } }),
        prisma.inventory.findMany({
          where: { userId, qty: { gt: 0 }, item: { effectType: { in: ["hospital_release_full", "hospital_release_partial"] } } },
          include: { item: true },
        }),
        getPlayerPerkContext(userId, prisma),
      ]);

      if (!profile) return reply.status(404).send({ error: "Profile not found" });
      const slsPrice = await fetchSlsPrice();
      const { minutesRemaining, slsReleaseCost, costUsd, multiplier } = getHospitalSlsReleasePricing(profile, slsPrice);

      return reply.send({
        hospitalized: isInHospital(profile),
        remainingMinutes: minutesRemaining,
        slsReleaseCost,
        slsReleaseUsd: costUsd,
        slsReleaseMultiplier: multiplier,
        recoveryBonus: perkContext.effects.recovery_efficiency_percent ?? 0,
        hospitalReductionBonus: perkContext.effects.hospital_time_reduction_percent ?? 0,
        itemOptions: items.map((entry) => ({
          itemId: entry.itemId,
          name: entry.item.name,
          qty: entry.qty,
          effectType: entry.item.effectType,
          effectValue: entry.item.effectValue,
          effectDurationSecs: entry.item.effectDurationSecs,
        })),
        penaltyReleaseOptions: Object.entries(HOSPITAL_PENALTY_DURATION_HOURS).map(([type, hours]) => ({
          type,
          durationHours: hours,
        })),
      });
    } catch (err) {
      request.log.error(err, "/hospital/options error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.post("/hospital/release-item", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;
    const parsed = releaseItemBody.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Invalid input" });

    try {
      const [profile, inventory, perkContext] = await Promise.all([
        prisma.profile.findUnique({ where: { userId } }),
        prisma.inventory.findUnique({
          where: { userId_itemId: { userId, itemId: parsed.data.itemId } },
          include: { item: true },
        }),
        getPlayerPerkContext(userId, prisma),
      ]);

      if (!profile) return reply.status(404).send({ error: "Profile not found" });
      if (!isInHospital(profile)) return reply.status(400).send({ error: "You are not hospitalized" });
      if (!inventory || inventory.qty <= 0 || !inventory.item.effectType?.startsWith("hospital_release")) {
        return reply.status(400).send({ error: "You do not own a valid recovery item" });
      }

      const recoveryBonus = Math.min(0.5, perkContext.effects.recovery_efficiency_percent ?? 0);
      const hospitalReductionBonus = Math.min(0.5, perkContext.effects.hospital_time_reduction_percent ?? 0);
      const remainingMs = Math.max(0, profile.hospitalUntil.getTime() - Date.now());
      const partialReduction = inventory.item.effectDurationSecs
        ? inventory.item.effectDurationSecs * 1000
        : Math.floor(remainingMs * ((inventory.item.effectValue ?? 0.5) + hospitalReductionBonus));
      const fullRelease = inventory.item.effectType === "hospital_release_full";
      const nextHospitalUntil = fullRelease || remainingMs <= partialReduction
        ? new Date(0)
        : new Date(profile.hospitalUntil.getTime() - partialReduction);

      const updated = await prisma.$transaction(async (tx) => {
        const next = await tx.profile.update({
          where: { userId },
          data: {
            health: fullRelease
              ? Math.min(profile.maxHealth, Math.ceil(profile.maxHealth * (0.5 + recoveryBonus)))
              : getReleasedHealth(profile.maxHealth, recoveryBonus),
            hospitalUntil: nextHospitalUntil,
          },
        });

        await tx.inventory.update({
          where: { userId_itemId: { userId, itemId: inventory.itemId } },
          data: { qty: { decrement: 1 } },
        });

        await tx.eventLog.create({
          data: {
            userId,
            type: "hospital_release",
            message: `Used ${inventory.item.name} for hospital recovery.`,
            metadata: { method: "item", itemId: inventory.itemId, itemName: inventory.item.name },
          },
        });

        return next;
      });

      return reply.send({ success: true, itemUsed: inventory.item.name, hospitalUntil: updated.hospitalUntil });
    } catch (err) {
      request.log.error(err, "/hospital/release-item error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.post("/hospital/accept-penalty-release", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;
    const parsed = penaltyReleaseBody.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Invalid input" });

    try {
      const [profile, perkContext] = await Promise.all([
        prisma.profile.findUnique({ where: { userId } }),
        getPlayerPerkContext(userId, prisma),
      ]);
      if (!profile) return reply.status(404).send({ error: "Profile not found" });
      if (!isInHospital(profile)) return reply.status(400).send({ error: "You are not hospitalized" });
      if (profile.hospitalExitPenaltyUntil && profile.hospitalExitPenaltyUntil > new Date()) {
        return reply.status(400).send({ error: "An active exit penalty is already applied" });
      }

      const recoveryBonus = Math.min(0.5, perkContext.effects.recovery_efficiency_percent ?? 0);
      const until = new Date(Date.now() + HOSPITAL_PENALTY_DURATION_HOURS[parsed.data.type] * 60 * 60 * 1000);
      const updated = await prisma.$transaction(async (tx) => {
        const next = await tx.profile.update({
          where: { userId },
          data: {
            health: getReleasedHealth(profile.maxHealth, recoveryBonus),
            hospitalUntil: new Date(0),
            hospitalExitPenaltyType: parsed.data.type,
            hospitalExitPenaltyUntil: until,
          },
        });

        await tx.eventLog.create({
          data: {
            userId,
            type: "hospital_release",
            message: `Accepted a ${parsed.data.type} penalty to leave the hospital early.`,
            metadata: { method: "penalty", penaltyType: parsed.data.type, until },
          },
        });

        return next;
      });

      return reply.send({
        success: true,
        penaltyType: updated.hospitalExitPenaltyType,
        penaltyUntil: updated.hospitalExitPenaltyUntil,
        hospitalUntil: updated.hospitalUntil,
      });
    } catch (err) {
      request.log.error(err, "/hospital/accept-penalty-release error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });
}
