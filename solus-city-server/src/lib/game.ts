import { Profile, PrismaClient } from "@prisma/client";
import {
  ENERGY_MAX,
  ENERGY_REGEN_MINUTES,
  NERVE_MAX,
  NERVE_REGEN_MINUTES,
  HAPPINESS_REGEN_MINUTES,
  INCOME_CAP_HOURS,
  BASE_INCOME_PER_HOUR,
  BASE_ATK,
  BASE_DEF,
  XP_PER_LEVEL,
  HEALTH_PER_LEVEL,
  MAX_LEVEL,
  SYNDICATE_AP_BUFF,
} from "./constants";

interface CombatBreakdown {
  baseStats: {
    strength: number;
    speed: number;
    defense: number;
    dexterity: number;
    ap: number;
    dp: number;
  };
  itemBonuses: {
    atk: number;
    def: number;
    speed: number;
    dex: number;
    ap: number;
    dp: number;
  };
  totalStats: {
    strength: number;
    speed: number;
    defense: number;
    dexterity: number;
    ap: number;
    dp: number;
  };
}

/**
 * Compute offline cash income since lastIncomeTs.
 * Caps at INCOME_CAP_HOURS worth of income.
 */
export function applyIncome(profile: Profile): Partial<Profile> {
  const now = new Date();
  const elapsedMs = now.getTime() - profile.lastIncomeTs.getTime();
  const elapsedHours = Math.min(elapsedMs / 1000 / 3600, INCOME_CAP_HOURS);
  const earned = elapsedHours * BASE_INCOME_PER_HOUR;
  return {
    cash: profile.cash + earned,
    lastIncomeTs: now,
  };
}

/**
 * Compute energy regeneration since lastEnergyTs.
 * 1 energy per ENERGY_REGEN_MINUTES minutes, clamped to maxEnergy.
 */
export function applyEnergy(profile: Profile): Partial<Profile> {
  const now = new Date();
  const elapsedMs = now.getTime() - profile.lastEnergyTs.getTime();
  const elapsedMinutes = elapsedMs / 1000 / 60;
  const regenTicks = Math.floor(elapsedMinutes / ENERGY_REGEN_MINUTES);

  if (regenTicks === 0) return {};

  const newEnergy = Math.min(profile.energy + regenTicks, profile.maxEnergy);
  const consumedMs = regenTicks * ENERGY_REGEN_MINUTES * 60 * 1000;
  const newLastEnergyTs = new Date(profile.lastEnergyTs.getTime() + consumedMs);

  return {
    energy: newEnergy,
    lastEnergyTs: newLastEnergyTs,
  };
}

/**
 * Compute nerve regeneration since lastNerveTs.
 * 1 nerve per NERVE_REGEN_MINUTES minutes, clamped to maxNerve.
 */
export function applyNerve(profile: Profile): Partial<Profile> {
  const now = new Date();
  const elapsedMs = now.getTime() - profile.lastNerveTs.getTime();
  const elapsedMinutes = elapsedMs / 1000 / 60;
  const regenTicks = Math.floor(elapsedMinutes / NERVE_REGEN_MINUTES);

  if (regenTicks === 0) return {};

  const newNerve = Math.min(profile.nerve + regenTicks, profile.maxNerve);
  const consumedMs = regenTicks * NERVE_REGEN_MINUTES * 60 * 1000;
  const newLastNerveTs = new Date(profile.lastNerveTs.getTime() + consumedMs);

  return {
    nerve: newNerve,
    lastNerveTs: newLastNerveTs,
  };
}

export function applyHappiness(profile: Profile): Partial<Profile> {
  const now = new Date();
  const elapsedMs = now.getTime() - profile.lastHappinessTs.getTime();
  const elapsedMinutes = elapsedMs / 1000 / 60;
  const regenTicks = Math.floor(elapsedMinutes / HAPPINESS_REGEN_MINUTES);

  if (regenTicks === 0) return {};

  const newHappiness = Math.min(profile.happiness + regenTicks, profile.maxHappiness);
  const consumedMs = regenTicks * HAPPINESS_REGEN_MINUTES * 60 * 1000;
  const newLastHappinessTs = new Date(profile.lastHappinessTs.getTime() + consumedMs);

  return {
    happiness: newHappiness,
    lastHappinessTs: newLastHappinessTs,
  };
}

/**
 * Check if user is in hospital. Returns true if hospitalUntil > now.
 */
export function isInHospital(profile: Profile): boolean {
  return profile.hospitalUntil > new Date();
}

/**
 * Discharge player from hospital when timer has expired.
 * If health is 0 (or below) after hospital time, restore to full health.
 */
export function applyHospitalRecovery(profile: Profile): Partial<Profile> {
  if (isInHospital(profile)) return {};
  if (profile.health > 0) return {};

  return {
    health: profile.maxHealth,
    hospitalUntil: new Date("1970-01-01T00:00:00.000Z"),
  };
}

/**
 * Process leveling — grants levels and maxHealth for accumulated XP.
 * Returns updated fields if level changed.
 */
export function processLevelUp(profile: Profile): Partial<Profile> {
  let { level, xp, maxHealth } = profile;
  let leveled = false;

  while (xp >= XP_PER_LEVEL * level && level < MAX_LEVEL) {
    xp -= XP_PER_LEVEL * level;
    level += 1;
    maxHealth += HEALTH_PER_LEVEL;
    leveled = true;
  }

  if (!leveled) return {};
  return { level, xp, maxHealth };
}

/**
 * Compute AP and DP for a user.
 * AP = BASE_ATK + strength + floor(speed / 2) + sum(item.atk * inventory.qty) + speed item bonus / 2
 * DP = BASE_DEF + defense + floor(dexterity / 2) + sum(item.def * inventory.qty) + dexterity item bonus / 2
 */
export async function computeAPDP(
  userId: string,
  prisma: PrismaClient
): Promise<{ ap: number; dp: number }> {
  const stats = await computeCombatStats(userId, prisma);
  return { ap: stats.totalStats.ap, dp: stats.totalStats.dp };
}

export async function computeCombatStats(
  userId: string,
  prisma: PrismaClient
): Promise<CombatBreakdown> {
  const [inventory, profile] = await Promise.all([
    prisma.inventory.findMany({
      where: { userId },
      include: { item: true },
    }),
    prisma.profile.findUnique({ where: { userId } }),
  ]);

  const baseStrength = profile?.strength ?? 0;
  const baseSpeed = profile?.speed ?? 0;
  const baseDefense = profile?.defense ?? 0;
  const baseDexterity = profile?.dexterity ?? 0;

  let atkBonus = 0;
  let defBonus = 0;
  let speedBonus = 0;
  let dexBonus = 0;

  for (const inv of inventory) {
    atkBonus += inv.item.atk * inv.qty;
    defBonus += inv.item.def * inv.qty;
    speedBonus += (inv.item.speed ?? 0) * inv.qty;
    dexBonus += (inv.item.dex ?? 0) * inv.qty;
  }

  const member = await prisma.syndicateMember.findUnique({ where: { userId } });
  const buffMultiplier = member ? 1 + SYNDICATE_AP_BUFF : 1;

  const speedApBonus = Math.floor(speedBonus / 2);
  const dexDpBonus = Math.floor(dexBonus / 2);
  const baseAp = BASE_ATK + baseStrength + Math.floor(baseSpeed / 2);
  const baseDp = BASE_DEF + baseDefense + Math.floor(baseDexterity / 2);
  const totalAp = Math.round((baseAp + atkBonus + speedApBonus) * buffMultiplier);
  const totalDp = baseDp + defBonus + dexDpBonus;

  return {
    baseStats: {
      strength: baseStrength,
      speed: baseSpeed,
      defense: baseDefense,
      dexterity: baseDexterity,
      ap: baseAp,
      dp: baseDp,
    },
    itemBonuses: {
      atk: atkBonus,
      def: defBonus,
      speed: speedBonus,
      dex: dexBonus,
      ap: atkBonus + speedApBonus,
      dp: defBonus + dexDpBonus,
    },
    totalStats: {
      strength: baseStrength,
      speed: baseSpeed + speedBonus,
      defense: baseDefense,
      dexterity: baseDexterity + dexBonus,
      ap: totalAp,
      dp: totalDp,
    },
  };
}

/**
 * Compute when the next energy point will be available.
 */
export function nextEnergyAt(profile: Profile): Date {
  if (profile.energy >= profile.maxEnergy) return new Date();

  const elapsedMs = Date.now() - profile.lastEnergyTs.getTime();
  const elapsedMinutes = elapsedMs / 1000 / 60;
  const minutesUntilNext = ENERGY_REGEN_MINUTES - (elapsedMinutes % ENERGY_REGEN_MINUTES);
  return new Date(Date.now() + minutesUntilNext * 60 * 1000);
}

/**
 * Compute when the next nerve point will be available.
 */
export function nextNerveAt(profile: Profile): Date {
  if (profile.nerve >= profile.maxNerve) return new Date();

  const elapsedMs = Date.now() - profile.lastNerveTs.getTime();
  const elapsedMinutes = elapsedMs / 1000 / 60;
  const minutesUntilNext = NERVE_REGEN_MINUTES - (elapsedMinutes % NERVE_REGEN_MINUTES);
  return new Date(Date.now() + minutesUntilNext * 60 * 1000);
}

export function nextHappinessAt(profile: Profile): Date {
  if (profile.happiness >= profile.maxHappiness) return new Date();

  const elapsedMs = Date.now() - profile.lastHappinessTs.getTime();
  const elapsedMinutes = elapsedMs / 1000 / 60;
  const minutesUntilNext = HAPPINESS_REGEN_MINUTES - (elapsedMinutes % HAPPINESS_REGEN_MINUTES);
  return new Date(Date.now() + minutesUntilNext * 60 * 1000);
}

/**
 * Clamp a value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
