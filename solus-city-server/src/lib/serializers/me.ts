import type { Profile } from "@prisma/client";
import { isInHospital, nextEnergyAt, nextHappinessAt, nextNerveAt } from "../game";

type SerializeMeInput = {
  wallet: string;
  profile: Profile;
  combat: { totalStats: { ap: number; dp: number } };
  statBreakdown: unknown;
  incomePerHour: number;
  slsSpent: number;
  syndicate: {
    id: string;
    name: string;
    role: string;
    buffType: string;
    buffValue: number;
  } | null;
  activeProtectionEffects: Array<{
    id: string;
    type: string;
    value: number;
    endsAt: Date;
    sourceName?: string;
  }>;
  missionsPreview: unknown[];
  blackMarketEndsAt: Date | null;
  currentSeason: unknown;
  unlockedPerkSummary: { total: number; branches: Record<string, number> };
  equipmentSummary: Array<{ itemId: string; name: string; slot: string | null; rarity: string | null }>;
};

export function serializeMeDashboard(input: SerializeMeInput) {
  const { profile } = input;
  const activePenalty =
    profile.hospitalExitPenaltyUntil && profile.hospitalExitPenaltyUntil > new Date()
      ? {
          type: profile.hospitalExitPenaltyType,
          until: profile.hospitalExitPenaltyUntil,
        }
      : null;

  return {
    wallet: input.wallet,
    name: profile.name,
    cash: profile.cash,
    vaultCash: profile.vaultCash,
    rp: profile.rp,
    level: profile.level,
    xp: profile.xp,
    health: profile.health,
    maxHealth: profile.maxHealth,
    energy: profile.energy,
    maxEnergy: profile.maxEnergy,
    nerve: profile.nerve,
    maxNerve: profile.maxNerve,
    happiness: profile.happiness,
    maxHappiness: profile.maxHappiness,
    ap: input.combat.totalStats.ap,
    dp: input.combat.totalStats.dp,
    strength: profile.strength,
    speed: profile.speed,
    defense: profile.defense,
    dexterity: profile.dexterity,
    statBreakdown: input.statBreakdown,
    shieldUntil: profile.shieldUntil,
    hospitalUntil: profile.hospitalUntil,
    inHospital: isInHospital(profile),
    incomePerHour: input.incomePerHour,
    nextEnergyAt: nextEnergyAt(profile),
    nextNerveAt: nextNerveAt(profile),
    nextHappinessAt: nextHappinessAt(profile),
    slsSpent: input.slsSpent,
    syndicate: input.syndicate,
    heat: profile.heat,
    wantedTier: profile.wantedTier,
    seasonScore: profile.seasonScore,
    availablePerkPoints: profile.availablePerkPoints,
    prestigeLevel: profile.prestigeLevel,
    hospitalExitPenalty: activePenalty,
    activeProtectionEffects: input.activeProtectionEffects,
    missionsPreview: input.missionsPreview,
    blackMarketEndsAt: input.blackMarketEndsAt,
    currentSeason: input.currentSeason,
    unlockedPerkSummary: input.unlockedPerkSummary,
    equipmentSummary: input.equipmentSummary,
  };
}
