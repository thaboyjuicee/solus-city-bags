import { Prisma, PrismaClient } from "@prisma/client";
import {
  SEASON_REWARD_CHAMPIONSHIP_TIERS,
  SEASON_REWARD_CRIME_TIERS,
  SEASON_REWARD_OVERALL_TIERS,
  SEASON_REWARD_PVP_TIERS,
  SEASON_REWARD_SYNDICATE_TIERS,
} from "../config/balance";
import { getCurrentSeason } from "./scoring";

type PrismaLike = PrismaClient | Prisma.TransactionClient;

type RewardTierConfig = {
  key: string;
  label: string;
  minRank: number;
  maxRank: number;
  cash: number;
  rp: number;
  prestigePoints: number;
  title: string;
};

export type SeasonRewardTier = RewardTierConfig & {
  rankLabel: string;
};

export type SeasonRewardProjection = {
  overall: SeasonRewardTier | null;
  pvp: SeasonRewardTier | null;
  crime: SeasonRewardTier | null;
  syndicate: SeasonRewardTier | null;
  championship: SeasonRewardTier | null;
  ranks: {
    overall: number | null;
    pvp: number | null;
    crime: number | null;
    syndicate: number | null;
  };
};

export type CalculatedSeasonReward = {
  userId: string;
  totalCash: number;
  totalRp: number;
  prestigePoints: number;
  tiers: {
    overall: SeasonRewardTier | null;
    pvp: SeasonRewardTier | null;
    crime: SeasonRewardTier | null;
  };
};

function formatRankLabel(minRank: number, maxRank: number) {
  return minRank === maxRank ? `#${minRank}` : `#${minRank}-#${maxRank}`;
}

function serializeTier(tier: RewardTierConfig): SeasonRewardTier {
  return {
    ...tier,
    rankLabel: formatRankLabel(tier.minRank, tier.maxRank),
  };
}

export function getTierForRank(rank: number | null, tiers: readonly RewardTierConfig[]) {
  if (!rank) return null;
  const tier = tiers.find((entry) => rank >= entry.minRank && rank <= entry.maxRank);
  return tier ? serializeTier(tier) : null;
}

async function getSeasonRanks(prisma: PrismaLike, seasonId: string, userId: string) {
  const [overallRows, pvpRows, crimeRows] = await Promise.all([
    prisma.seasonParticipation.findMany({
      where: { seasonId },
      orderBy: [{ score: "desc" }, { createdAt: "asc" }],
      select: { userId: true },
    }),
    prisma.seasonParticipation.findMany({
      where: { seasonId },
      orderBy: [{ pvpScore: "desc" }, { score: "desc" }, { createdAt: "asc" }],
      select: { userId: true },
    }),
    prisma.seasonParticipation.findMany({
      where: { seasonId },
      orderBy: [{ crimeScore: "desc" }, { score: "desc" }, { createdAt: "asc" }],
      select: { userId: true },
    }),
  ]);

  const getRank = (rows: Array<{ userId: string }>) => {
    const index = rows.findIndex((entry) => entry.userId === userId);
    return index >= 0 ? index + 1 : null;
  };

  return {
    overall: getRank(overallRows),
    pvp: getRank(pvpRows),
    crime: getRank(crimeRows),
  };
}

async function getSyndicateRank(prisma: PrismaLike, syndicateId: string) {
  const rows = await prisma.syndicate.findMany({
    orderBy: [{ seasonPoints: "desc" }, { territoryCount: "desc" }, { warRating: "desc" }],
    select: { id: true },
  });
  const index = rows.findIndex((entry) => entry.id === syndicateId);
  return index >= 0 ? index + 1 : null;
}

export async function getProjectedRewardTier(prisma: PrismaLike, userId: string, seasonId?: string) {
  const season = seasonId ? await prisma.season.findUnique({ where: { id: seasonId } }) : await getCurrentSeason(prisma);
  if (!season) {
    return {
      overall: null,
      pvp: null,
      crime: null,
      syndicate: null,
      championship: null,
      ranks: { overall: null, pvp: null, crime: null, syndicate: null },
    } satisfies SeasonRewardProjection;
  }

  const membership = await prisma.syndicateMember.findUnique({ where: { userId } });
  const ranks = await getSeasonRanks(prisma, season.id, userId);
  const syndicateRank = membership ? await getSyndicateRank(prisma, membership.syndicateId) : null;

  return {
    overall: getTierForRank(ranks.overall, SEASON_REWARD_OVERALL_TIERS),
    pvp: getTierForRank(ranks.pvp, SEASON_REWARD_PVP_TIERS),
    crime: getTierForRank(ranks.crime, SEASON_REWARD_CRIME_TIERS),
    syndicate: getTierForRank(syndicateRank, SEASON_REWARD_SYNDICATE_TIERS),
    championship: null,
    ranks: {
      overall: ranks.overall,
      pvp: ranks.pvp,
      crime: ranks.crime,
      syndicate: syndicateRank,
    },
  } satisfies SeasonRewardProjection;
}

export async function calculateSeasonRewards(prisma: PrismaLike, seasonId: string) {
  const participations = await prisma.seasonParticipation.findMany({
    where: { seasonId },
    orderBy: [{ score: "desc" }, { createdAt: "asc" }],
  });

  const pvpRanked = [...participations].sort((left, right) => right.pvpScore - left.pvpScore || right.score - left.score || left.createdAt.getTime() - right.createdAt.getTime());
  const crimeRanked = [...participations].sort((left, right) => right.crimeScore - left.crimeScore || right.score - left.score || left.createdAt.getTime() - right.createdAt.getTime());

  return participations.map((participation, overallIndex) => {
    const pvpRank = pvpRanked.findIndex((entry) => entry.userId === participation.userId) + 1;
    const crimeRank = crimeRanked.findIndex((entry) => entry.userId === participation.userId) + 1;
    const overallTier = getTierForRank(overallIndex + 1, SEASON_REWARD_OVERALL_TIERS);
    const pvpTier = getTierForRank(pvpRank || null, SEASON_REWARD_PVP_TIERS);
    const crimeTier = getTierForRank(crimeRank || null, SEASON_REWARD_CRIME_TIERS);

    return {
      userId: participation.userId,
      totalCash: (overallTier?.cash ?? 0) + (pvpTier?.cash ?? 0) + (crimeTier?.cash ?? 0),
      totalRp: (overallTier?.rp ?? 0) + (pvpTier?.rp ?? 0) + (crimeTier?.rp ?? 0),
      prestigePoints: (overallTier?.prestigePoints ?? 0) + (pvpTier?.prestigePoints ?? 0) + (crimeTier?.prestigePoints ?? 0),
      tiers: {
        overall: overallTier,
        pvp: pvpTier,
        crime: crimeTier,
      },
    } satisfies CalculatedSeasonReward;
  });
}

export async function grantSeasonRewards(prisma: PrismaLike, seasonId: string) {
  const rewards = await calculateSeasonRewards(prisma, seasonId);
  const participationMap = new Map(
    (
      await prisma.seasonParticipation.findMany({
        where: { seasonId },
        select: { userId: true, rewardClaimed: true },
      })
    ).map((entry) => [entry.userId, entry.rewardClaimed])
  );

  const grants: Array<CalculatedSeasonReward & { granted: boolean }> = [];

  for (const reward of rewards) {
    if (participationMap.get(reward.userId)) {
      grants.push({ ...reward, granted: false });
      continue;
    }

    await prisma.profile.update({
      where: { userId: reward.userId },
      data: {
        cash: { increment: reward.totalCash },
        rp: { increment: reward.totalRp },
        prestigePoints: { increment: reward.prestigePoints },
      },
    });

    await prisma.seasonParticipation.update({
      where: { seasonId_userId: { seasonId, userId: reward.userId } },
      data: { rewardClaimed: true },
    });

    await prisma.eventLog.create({
      data: {
        userId: reward.userId,
        type: "season_reward",
        message: `Season rewards delivered for season ${seasonId}`,
        metadata: reward,
      },
    });

    grants.push({ ...reward, granted: true });
  }

  return grants;
}

export function getSeasonRewardTierCatalog() {
  return {
    overall: SEASON_REWARD_OVERALL_TIERS.map((tier) => serializeTier(tier)),
    pvp: SEASON_REWARD_PVP_TIERS.map((tier) => serializeTier(tier)),
    crime: SEASON_REWARD_CRIME_TIERS.map((tier) => serializeTier(tier)),
    syndicates: SEASON_REWARD_SYNDICATE_TIERS.map((tier) => serializeTier(tier)),
    championships: SEASON_REWARD_CHAMPIONSHIP_TIERS.map((tier) => serializeTier(tier)),
  };
}

