import { Prisma, PrismaClient, Profile } from "@prisma/client";
import {
  PRESTIGE_BONUS_MAX_ENERGY,
  PRESTIGE_BONUS_MAX_HAPPINESS,
  PRESTIGE_BONUS_MAX_NERVE,
  PRESTIGE_MIN_LEVEL,
  PRESTIGE_MIN_SEASON_RANK,
  PRESTIGE_MIN_TOTAL_STATS,
  PRESTIGE_RESET_HEAT,
  PRESTIGE_RESET_STARTING_CASH,
  PRESTIGE_RESET_VAULT_CASH,
} from "../config/balance";
import { getCurrentSeason } from "./scoring";

type PrismaLike = PrismaClient | Prisma.TransactionClient;

type ProfileLike = Pick<
  Profile,
  | "cash"
  | "defense"
  | "dexterity"
  | "level"
  | "maxEnergy"
  | "maxHappiness"
  | "maxNerve"
  | "prestigeLevel"
  | "prestigePoints"
  | "seasonScore"
  | "speed"
  | "strength"
  | "userId"
  | "vaultCash"
>;

export type PrestigeRequirement = {
  key: string;
  label: string;
  met: boolean;
  current: number | null;
  required: number | null;
};

export type PrestigePreview = {
  eligible: boolean;
  currentPrestigeLevel: number;
  nextPrestigeLevel: number;
  prestigePointsGain: number;
  prestigePointsAfter: number;
  requirements: PrestigeRequirement[];
  resets: string[];
  keeps: string[];
  permanentBonuses: Array<{ key: string; label: string; amount: number }>;
  nextProfile: {
    cash: number;
    vaultCash: number;
    heat: number;
    wantedTier: string;
    maxEnergy: number;
    maxNerve: number;
    maxHappiness: number;
  };
  reasons: string[];
};

function getCombinedStats(profile: ProfileLike) {
  return profile.strength + profile.speed + profile.defense + profile.dexterity;
}

export function buildPrestigePreviewFromProfile(profile: ProfileLike, seasonRank: number | null): PrestigePreview {
  const combinedStats = getCombinedStats(profile);
  const requirements: PrestigeRequirement[] = [
    {
      key: "level",
      label: "Reach level threshold",
      met: profile.level >= PRESTIGE_MIN_LEVEL,
      current: profile.level,
      required: PRESTIGE_MIN_LEVEL,
    },
    {
      key: "stats",
      label: "Build combined stats",
      met: combinedStats >= PRESTIGE_MIN_TOTAL_STATS,
      current: combinedStats,
      required: PRESTIGE_MIN_TOTAL_STATS,
    },
    {
      key: "season_rank",
      label: "Finish within the prestige season rank band",
      met: seasonRank !== null && seasonRank <= PRESTIGE_MIN_SEASON_RANK,
      current: seasonRank,
      required: PRESTIGE_MIN_SEASON_RANK,
    },
  ];

  const reasons = requirements.filter((entry) => !entry.met).map((entry) => entry.label);
  const permanentBonuses = [
    { key: "max_energy", label: "Max energy", amount: PRESTIGE_BONUS_MAX_ENERGY },
    { key: "max_nerve", label: "Max nerve", amount: PRESTIGE_BONUS_MAX_NERVE },
    { key: "max_happiness", label: "Max happiness", amount: PRESTIGE_BONUS_MAX_HAPPINESS },
  ];

  return {
    eligible: reasons.length === 0,
    currentPrestigeLevel: profile.prestigeLevel,
    nextPrestigeLevel: profile.prestigeLevel + 1,
    prestigePointsGain: 1,
    prestigePointsAfter: profile.prestigePoints + 1,
    requirements,
    resets: [
      "Wallet cash resets to the fresh-start bankroll.",
      "Vault cash returns to zero.",
      "Heat and wanted tier reset to low.",
      "Current season score resets for the new climb.",
      "Hospital penalties and active protection effects are cleared.",
    ],
    keeps: [
      "Prestige level and prestige points.",
      "Season history, hall of fame records, and prestige history.",
      "Unlocked perks, permanent gear, and account identity.",
      "Core combat stats and level progression stay intact for Wave 4.",
    ],
    permanentBonuses,
    nextProfile: {
      cash: PRESTIGE_RESET_STARTING_CASH,
      vaultCash: PRESTIGE_RESET_VAULT_CASH,
      heat: PRESTIGE_RESET_HEAT,
      wantedTier: "low",
      maxEnergy: profile.maxEnergy + PRESTIGE_BONUS_MAX_ENERGY,
      maxNerve: profile.maxNerve + PRESTIGE_BONUS_MAX_NERVE,
      maxHappiness: profile.maxHappiness + PRESTIGE_BONUS_MAX_HAPPINESS,
    },
    reasons,
  };
}

export async function previewPrestige(prisma: PrismaLike, userId: string) {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) {
    throw new Error("Profile not found");
  }

  const season = await getCurrentSeason(prisma);
  let seasonRank: number | null = null;

  if (season) {
    const ranks = await prisma.seasonParticipation.findMany({
      where: { seasonId: season.id },
      orderBy: [{ score: "desc" }, { createdAt: "asc" }],
      select: { userId: true },
    });
    const rankIndex = ranks.findIndex((entry) => entry.userId === userId);
    seasonRank = rankIndex >= 0 ? rankIndex + 1 : null;
  }

  return buildPrestigePreviewFromProfile(profile, seasonRank);
}

export async function canPrestige(prisma: PrismaLike, userId: string) {
  const preview = await previewPrestige(prisma, userId);
  return preview.eligible;
}

export async function executePrestige(prisma: PrismaLike, userId: string, now: Date = new Date()) {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) {
    throw new Error("Profile not found");
  }

  const season = await getCurrentSeason(prisma, now);
  let seasonRank: number | null = null;
  if (season) {
    const ranks = await prisma.seasonParticipation.findMany({
      where: { seasonId: season.id },
      orderBy: [{ score: "desc" }, { createdAt: "asc" }],
      select: { userId: true },
    });
    const rankIndex = ranks.findIndex((entry) => entry.userId === userId);
    seasonRank = rankIndex >= 0 ? rankIndex + 1 : null;
  }

  const preview = buildPrestigePreviewFromProfile(profile, seasonRank);
  if (!preview.eligible) {
    throw new Error(preview.reasons[0] ?? "Not eligible to prestige");
  }

  const nextMaxEnergy = profile.maxEnergy + PRESTIGE_BONUS_MAX_ENERGY;
  const nextMaxNerve = profile.maxNerve + PRESTIGE_BONUS_MAX_NERVE;
  const nextMaxHappiness = profile.maxHappiness + PRESTIGE_BONUS_MAX_HAPPINESS;

  const updatedProfile = await prisma.profile.update({
    where: { userId },
    data: {
      prestigeLevel: { increment: 1 },
      prestigePoints: { increment: preview.prestigePointsGain },
      cash: PRESTIGE_RESET_STARTING_CASH,
      vaultCash: PRESTIGE_RESET_VAULT_CASH,
      heat: PRESTIGE_RESET_HEAT,
      wantedTier: "low",
      seasonScore: 0,
      hospitalExitPenaltyType: null,
      hospitalExitPenaltyUntil: null,
      shieldUntil: now,
      hospitalUntil: new Date("1970-01-01T00:00:00.000Z"),
      maxEnergy: nextMaxEnergy,
      energy: nextMaxEnergy,
      maxNerve: nextMaxNerve,
      nerve: nextMaxNerve,
      maxHappiness: nextMaxHappiness,
      happiness: nextMaxHappiness,
    },
  });

  await prisma.protectionEffect.deleteMany({ where: { userId } });
  await prisma.prestigeHistory.create({
    data: {
      userId,
      fromPrestige: profile.prestigeLevel,
      toPrestige: updatedProfile.prestigeLevel,
      seasonId: season?.id ?? null,
      grantedBonusJson: {
        maxEnergy: PRESTIGE_BONUS_MAX_ENERGY,
        maxNerve: PRESTIGE_BONUS_MAX_NERVE,
        maxHappiness: PRESTIGE_BONUS_MAX_HAPPINESS,
      },
    },
  });
  await prisma.eventLog.create({
    data: {
      userId,
      type: "prestige",
      message: `Advanced to prestige ${updatedProfile.prestigeLevel}`,
      metadata: {
        fromPrestige: profile.prestigeLevel,
        toPrestige: updatedProfile.prestigeLevel,
        preview,
      },
    },
  });

  return {
    preview,
    profile: updatedProfile,
  };
}

