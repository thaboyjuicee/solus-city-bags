import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../lib/auth";
import { applyEnergy, applyHappiness, applyIncome, computeCombatStats } from "../lib/game";
import { RP_BAND_FRACTION, RP_BAND_MIN, TARGET_COUNT } from "../lib/constants";
import { buildNpcForPlayer, NPC_POOL } from "../lib/npcs";
import { decayHeat } from "../lib/player/heat";
import { REPEAT_TARGET_LOOT_REDUCTION_WINDOW_MINUTES } from "../lib/config/balance";
import { getHeatBand, getLootBand, getWinChanceBand, serializeTargetPreview } from "../lib/serializers/targets";
import { getMismatchAdjustment } from "../lib/matchmaking";

export default async function targetsRoutes(
  fastify: FastifyInstance,
  { prisma }: { prisma: PrismaClient }
) {
  fastify.get("/targets", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;

    try {
      const attackerProfile = await prisma.profile.findUnique({ where: { userId } });
      if (!attackerProfile) return reply.status(404).send({ error: "Profile not found" });

      const incomeUpdate = applyIncome(attackerProfile);
      const energyUpdate = applyEnergy({ ...attackerProfile, ...incomeUpdate });
      const happinessUpdate = applyHappiness({ ...attackerProfile, ...incomeUpdate, ...energyUpdate });
      const heatUpdate = decayHeat({ ...attackerProfile, ...incomeUpdate, ...energyUpdate, ...happinessUpdate });
      await prisma.profile.update({
        where: { userId },
        data: { ...incomeUpdate, ...energyUpdate, ...happinessUpdate, heat: heatUpdate.heat, wantedTier: heatUpdate.wantedTier, lastHeatDecayAt: heatUpdate.lastHeatDecayAt },
      });

      const attackerStats = await computeCombatStats(userId, prisma);
      const attackerAp = attackerStats.totalStats.ap;
      const attackerPower = attackerStats.totalStats.ap + attackerStats.totalStats.dp;
      const rp = attackerProfile.rp;
      const band = Math.max(rp * RP_BAND_FRACTION, RP_BAND_MIN);
      const rpMin = Math.max(0, rp - band);
      const rpMax = rp + band;
      const now = new Date();
      const repeatWindowStart = new Date(now.getTime() - REPEAT_TARGET_LOOT_REDUCTION_WINDOW_MINUTES * 60 * 1000);

      const candidates = await prisma.profile.findMany({
        where: {
          rp: { gte: rpMin, lte: rpMax },
          shieldUntil: { lte: now },
          hospitalUntil: { lte: now },
          userId: { not: userId },
        },
        include: { user: true },
        take: TARGET_COUNT,
      });

      const playerTargets = await Promise.all(
        candidates.map(async (target) => {
          const [stats, farmedCount, membership] = await Promise.all([
            computeCombatStats(target.userId, prisma),
            prisma.attackLog.count({
              where: {
                userId,
                defenderId: target.userId,
                createdAt: { gte: repeatWindowStart },
                result: "win",
              },
            }),
            prisma.syndicateMember.findUnique({
              where: { userId: target.userId },
              include: { syndicate: true },
            }),
          ]);

          const mismatch = getMismatchAdjustment({
            attackerPower,
            defenderPower: stats.totalStats.ap + stats.totalStats.dp,
            attackerLevel: attackerProfile.level,
            defenderLevel: target.level,
          });
          const winChance = attackerAp / (attackerAp + stats.totalStats.dp);
          const estimatedLoot = Math.min(target.cash * 0.08, 5000) * mismatch.lootMultiplier;

          return serializeTargetPreview({
            id: target.userId,
            type: "player",
            displayName: target.name || `${target.user.wallet.slice(0, 6)}...`,
            wallet: `${target.user.wallet.slice(0, 6)}...${target.user.wallet.slice(-4)}`,
            rp: target.rp,
            level: target.level,
            shieldActive: false,
            inHospital: false,
            winChanceBand: getWinChanceBand(winChance),
            lootBand: getLootBand(estimatedLoot),
            heatBand: getHeatBand(target.heat),
            recentlyFarmedPenalty: farmedCount > 0,
            syndicateBadge: membership?.syndicate.name ?? null,
            mismatchPenaltyApplied: mismatch.mismatchPenaltyApplied,
          });
        })
      );

      const remaining = Math.max(0, TARGET_COUNT - playerTargets.length);
      const npcTargets = NPC_POOL.slice(0, remaining).map((template) => {
        const built = buildNpcForPlayer(attackerProfile.level, attackerProfile.rp, template);
        return serializeTargetPreview({
          id: built.id,
          type: "npc",
          displayName: built.displayName,
          wallet: "NPC",
          rp: built.rp,
          level: built.level,
          shieldActive: false,
          inHospital: false,
          avatarKey: built.avatarKey,
          flavor: built.flavor,
          winChanceBand: getWinChanceBand(attackerAp / (attackerAp + built.defensePower)),
          lootBand: getLootBand(Math.min(built.cash * 0.08, 5000)),
          heatBand: "low",
          recentlyFarmedPenalty: false,
          syndicateBadge: null,
          mismatchPenaltyApplied: false,
        });
      });

      return reply.send([...playerTargets, ...npcTargets]);
    } catch (err) {
      request.log.error(err, "/targets error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });
}
