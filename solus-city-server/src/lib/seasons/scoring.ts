import { Prisma, PrismaClient } from "@prisma/client";
import {
  REPEAT_TARGET_SEASON_POINT_MULTIPLIER,
  SEASON_SCORE_BATTLE_WIN,
  SEASON_SCORE_CRIME_SUCCESS,
  SEASON_SCORE_HOSPITALIZE,
  SEASON_SCORE_MISSION_CLAIM,
} from "../config/balance";

type PrismaLike = PrismaClient | Prisma.TransactionClient;

export type SeasonScoringCategory = "battle_win" | "hospitalize" | "crime_success" | "mission_claim";

type SeasonAwardInput = {
  userId: string;
  category: SeasonScoringCategory;
  amount?: number;
  repeatPenaltyApplied?: boolean;
};

function getCategoryDelta(category: SeasonAwardInput["category"]) {
  switch (category) {
    case "battle_win":
      return { total: SEASON_SCORE_BATTLE_WIN, field: "pvpScore" as const };
    case "hospitalize":
      return { total: SEASON_SCORE_HOSPITALIZE, field: "pvpScore" as const };
    case "crime_success":
      return { total: SEASON_SCORE_CRIME_SUCCESS, field: "crimeScore" as const };
    case "mission_claim":
      return { total: SEASON_SCORE_MISSION_CLAIM, field: "missionScore" as const };
  }
}

export async function getCurrentSeason(prisma: PrismaLike, now: Date = new Date()) {
  return prisma.season.findFirst({
    where: {
      status: "active",
      startsAt: { lte: now },
      endsAt: { gt: now },
    },
    orderBy: { startsAt: "desc" },
  });
}

export async function ensureSeasonParticipation(prisma: PrismaLike, userId: string, now: Date = new Date()) {
  const season = await getCurrentSeason(prisma, now);
  if (!season) return null;

  const participation = await prisma.seasonParticipation.upsert({
    where: { seasonId_userId: { seasonId: season.id, userId } },
    update: {},
    create: { seasonId: season.id, userId },
  });

  return { season, participation };
}

export async function awardSeasonScore(prisma: PrismaLike, input: SeasonAwardInput, now: Date = new Date()) {
  const current = await ensureSeasonParticipation(prisma, input.userId, now);
  if (!current) return { pointsGained: 0, participation: null, season: null };

  const delta = getCategoryDelta(input.category);
  const amount = Math.max(0, input.amount ?? 1);
  if (amount <= 0) return { pointsGained: 0, participation: current.participation, season: current.season };

  const multiplier = input.repeatPenaltyApplied ? REPEAT_TARGET_SEASON_POINT_MULTIPLIER : 1;
  const pointsGained = Math.max(0, Math.round(delta.total * amount * multiplier));
  if (pointsGained <= 0) return { pointsGained: 0, participation: current.participation, season: current.season };

  const updated = await prisma.seasonParticipation.update({
    where: { seasonId_userId: { seasonId: current.season.id, userId: input.userId } },
    data: {
      score: { increment: pointsGained },
      [delta.field]: { increment: pointsGained },
    },
  });

  await prisma.profile.update({
    where: { userId: input.userId },
    data: { seasonScore: { increment: pointsGained } },
  });

  return {
    pointsGained,
    participation: updated,
    season: current.season,
  };
}

