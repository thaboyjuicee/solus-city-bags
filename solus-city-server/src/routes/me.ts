import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { requireAuth } from "../lib/auth";
import {
  applyEnergy,
  applyHappiness,
  applyHospitalRecovery,
  applyIncome,
  applyNerve,
  computeCombatStats,
} from "../lib/game";
import { BASE_INCOME_PER_HOUR } from "../lib/constants";
import { decayHeat } from "../lib/player/heat";
import { fetchActiveProtectionEffects } from "../lib/combat/protection";
import { ensurePlayerMissionsAssigned } from "../lib/missions/assign";
import { getActiveRotation } from "../lib/economy/blackMarket";
import { serializeMeDashboard } from "../lib/serializers/me";
import { getAvailablePerkPoints } from "../lib/player/perks";
import { getCurrentSeason } from "../lib/seasons/scoring";
import { serializeSeasonHistoryEntry, serializeSeasonSummary } from "../lib/serializers/seasons";
import { getRolePermissions } from "../lib/syndicates/roles";
import { getTerritoryBonusForSyndicate } from "../lib/syndicates/territories";
import { serializeWarSummary } from "../lib/serializers/syndicates";
import { buildPrestigePreviewFromProfile } from "../lib/seasons/prestige";
import { getProjectedRewardTier } from "../lib/seasons/rewards";
import { getSeasonHistoryForUser } from "../lib/seasons/history";
import { getCurrentChampionship } from "../lib/syndicates/championships";
import { deleteAccount } from "../lib/player/accountDeletion";

const updateProfileBody = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Name must be at least 3 characters")
    .max(20, "Name cannot be longer than 20 characters"),
});

const deleteAccountBody = z.object({
  confirmation: z.literal("DELETE"),
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

      const incomeUpdate = applyIncome(profile);
      const energyUpdate = applyEnergy({ ...profile, ...incomeUpdate });
      const nerveUpdate = applyNerve({ ...profile, ...incomeUpdate, ...energyUpdate });
      const happinessUpdate = applyHappiness({ ...profile, ...incomeUpdate, ...energyUpdate, ...nerveUpdate });
      const hospitalUpdate = applyHospitalRecovery({ ...profile, ...incomeUpdate, ...energyUpdate, ...nerveUpdate, ...happinessUpdate });
      const heatUpdate = decayHeat({ ...profile, ...incomeUpdate, ...energyUpdate, ...nerveUpdate, ...happinessUpdate }, new Date());

      const updatedProfile = await prisma.profile.update({
        where: { userId },
        data: {
          ...incomeUpdate,
          ...energyUpdate,
          ...nerveUpdate,
          ...happinessUpdate,
          ...hospitalUpdate,
          heat: heatUpdate.heat,
          wantedTier: heatUpdate.wantedTier,
          lastHeatDecayAt: heatUpdate.lastHeatDecayAt,
        },
      });

      if (hospitalUpdate.health !== undefined) {
        await prisma.eventLog.create({
          data: {
            userId,
            type: "hospital",
            message: "Discharged from hospital. Health fully restored.",
            metadata: { method: "natural_recovery" },
          },
        });
      }

      await ensurePlayerMissionsAssigned(prisma, userId);

      const [
        combat,
        user,
        membership,
        negativeSlsSpend,
        activeProtectionEffects,
        missionsPreview,
        rotation,
        unlockedPerks,
        equippedInventory,
        season,
      ] = await Promise.all([
        computeCombatStats(userId, prisma),
        prisma.user.findUnique({ where: { id: userId } }),
        prisma.syndicateMember.findUnique({
          where: { userId },
          include: { syndicate: true },
        }),
        prisma.slsTransaction.aggregate({
          where: { userId, amount: { lt: 0 } },
          _sum: { amount: true },
        }),
        fetchActiveProtectionEffects(prisma, userId),
        prisma.playerMission.findMany({
          where: {
            userId,
            startsAt: { lte: new Date() },
            endsAt: { gt: new Date() },
          },
          include: { missionDefinition: { include: { rewardItem: true } } },
          orderBy: [{ completed: "asc" }, { endsAt: "asc" }],
          take: 5,
        }),
        getActiveRotation(prisma).catch(() => null),
        prisma.playerPerk.findMany({ where: { userId }, include: { perkDefinition: true } }),
        prisma.inventory.findMany({ where: { userId, equipped: true }, include: { item: true } }),
        getCurrentSeason(prisma),
      ]);

      const totalNegativeSpend = Math.abs(negativeSlsSpend._sum.amount ?? 0);
      const availablePerkPoints = getAvailablePerkPoints(updatedProfile, unlockedPerks.length);

      let currentSeason = null;
      let currentSeasonRank: number | null = null;
      if (season) {
        const [participation, ranks] = await Promise.all([
          prisma.seasonParticipation.findUnique({ where: { seasonId_userId: { seasonId: season.id, userId } } }),
          prisma.seasonParticipation.findMany({
            where: { seasonId: season.id },
            orderBy: [{ score: "desc" }, { createdAt: "asc" }],
            select: { userId: true },
          }),
        ]);
        const rank = ranks.findIndex((entry) => entry.userId === userId) + 1;
        currentSeasonRank = rank > 0 ? rank : null;
        currentSeason = serializeSeasonSummary({
          season,
          participation,
          rank: currentSeasonRank,
        });
      }

      const unlockedPerkSummary = unlockedPerks.reduce(
        (acc, perk) => {
          acc.total += 1;
          acc.branches[perk.perkDefinition.branch] = (acc.branches[perk.perkDefinition.branch] ?? 0) + 1;
          return acc;
        },
        { total: 0, branches: {} as Record<string, number> }
      );

      let activeTerritoryBonuses: Array<{ territoryId: string; territoryName: string; bonusType: string; bonusValue: number }> = [];
      let currentWarSummary: ReturnType<typeof serializeWarSummary> | null = null;
      let syndicateVaultSummary: { vaultCash: number; seasonPoints: number; territoryCount: number; warRating: number } | null = null;
      let currentSyndicateRole: string | null = membership?.role ?? null;
      let championshipSummary: {
        id: string;
        status: string;
        currentRound: number;
        seed: number | null;
        qualified: boolean;
        qualifyingPoints: number | null;
        nextMatch: {
          id: string;
          round: number;
          status: string;
          startsAt: Date;
          endsAt: Date;
          opponentName: string;
        } | null;
      } | null = null;

      if (membership) {
        activeTerritoryBonuses = await prisma.$transaction((tx) => getTerritoryBonusForSyndicate(tx, membership.syndicateId));
        const activeWar = await prisma.syndicateWar.findFirst({
          where: {
            status: "active",
            OR: [
              { attackerSyndicateId: membership.syndicateId },
              { defenderSyndicateId: membership.syndicateId },
            ],
          },
          include: {
            territory: true,
            attackerSyndicate: { select: { id: true, name: true } },
            defenderSyndicate: { select: { id: true, name: true } },
          },
          orderBy: { startsAt: "desc" },
        });
        currentWarSummary = activeWar ? serializeWarSummary(activeWar) : null;
        syndicateVaultSummary = {
          vaultCash: membership.syndicate.vaultCash,
          seasonPoints: membership.syndicate.seasonPoints,
          territoryCount: membership.syndicate.territoryCount,
          warRating: membership.syndicate.warRating,
        };

        const championship = await getCurrentChampionship(prisma);
        if (championship) {
          const qualifier = championship.entries.find((entry) => entry.syndicateId === membership.syndicateId);
          const match = championship.matches.find(
            (entry) => entry.syndicateAId === membership.syndicateId || entry.syndicateBId === membership.syndicateId
          );
          championshipSummary = {
            id: championship.id,
            status: championship.status,
            currentRound: championship.matches.reduce((max, entry) => Math.max(max, entry.round), 0),
            seed: qualifier?.seed ?? null,
            qualified: Boolean(qualifier),
            qualifyingPoints: qualifier?.qualifyingPoints ?? null,
            nextMatch: match
              ? {
                  id: match.id,
                  round: match.round,
                  status: match.status,
                  startsAt: match.startsAt,
                  endsAt: match.endsAt,
                  opponentName:
                    match.syndicateAId === membership.syndicateId ? match.syndicateB.name : match.syndicateA.name,
                }
              : null,
          };
        }
      }

      const [projectedSeasonRewards, seasonHistoryRows] = await Promise.all([
        getProjectedRewardTier(prisma, userId, season?.id),
        getSeasonHistoryForUser(prisma, userId, 3),
      ]);
      const prestigeSummary = buildPrestigePreviewFromProfile(
        { ...updatedProfile, prestigePoints: updatedProfile.prestigePoints },
        currentSeasonRank
      );

      return reply.send(
        serializeMeDashboard({
          id: userId,
          wallet: user?.wallet ?? "",
          profile: { ...updatedProfile, availablePerkPoints },
          combat,
          statBreakdown: combat,
          incomePerHour: BASE_INCOME_PER_HOUR,
          slsSpent: totalNegativeSpend,
          syndicate: membership
            ? {
                id: membership.syndicate.id,
                name: membership.syndicate.name,
                role: membership.role,
                buffType: membership.syndicate.buffType,
                buffValue: membership.syndicate.buffValue,
                vaultCash: membership.syndicate.vaultCash,
                seasonPoints: membership.syndicate.seasonPoints,
                territoryCount: membership.syndicate.territoryCount,
                warRating: membership.syndicate.warRating,
                permissions: getRolePermissions(membership.role),
              }
            : null,
          activeProtectionEffects,
          missionsPreview: missionsPreview.map((mission) => ({
            id: mission.id,
            type: mission.missionDefinition.type,
            code: mission.missionDefinition.code,
            name: mission.missionDefinition.name,
            description: mission.missionDefinition.description,
            progress: mission.progress,
            goalValue: mission.missionDefinition.goalValue,
            completed: mission.completed,
            claimed: mission.claimed,
            endsAt: mission.endsAt,
            rewards: {
              cash: mission.missionDefinition.rewardCash,
              rp: mission.missionDefinition.rewardRp,
              item: mission.missionDefinition.rewardItem
                ? { id: mission.missionDefinition.rewardItem.id, name: mission.missionDefinition.rewardItem.name }
                : null,
            },
          })),
          blackMarketEndsAt: rotation?.endsAt ?? null,
          currentSeason,
          unlockedPerkSummary,
          equipmentSummary: equippedInventory.map((row) => ({
            itemId: row.item.id,
            name: row.item.name,
            slot: row.item.slot ?? null,
            rarity: row.item.rarity ?? null,
          })),
          activeTerritoryBonuses,
          currentWarSummary,
          syndicateVaultSummary,
          currentSyndicateRole,
          prestigeSummary,
          projectedSeasonRewards,
          championshipSummary,
          seasonHistoryPreview: seasonHistoryRows.map((entry) =>
            serializeSeasonHistoryEntry({
              season: entry.season,
              participation: entry.participation,
              highlights: entry.highlights,
            })
          ),
        })
      );
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

    try {
      const updated = await prisma.profile.update({
        where: { userId },
        data: { name: parsed.data.name },
      });

      return reply.send({ name: updated.name });
    } catch (err) {
      request.log.error(err, "/me patch error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.delete("/me", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;
    const parsed = deleteAccountBody.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Type "DELETE" to confirm account deletion' });
    }

    try {
      await deleteAccount(prisma, userId);
      return reply.send({ success: true });
    } catch (err) {
      request.log.error(err, "/me delete error");
      return reply.status(500).send({ error: err instanceof Error ? err.message : "Internal server error" });
    }
  });
}

