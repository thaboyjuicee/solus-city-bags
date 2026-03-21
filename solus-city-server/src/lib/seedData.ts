import { PrismaClient } from "@prisma/client";

type SeedItem = {
  category: string;
  subCategory: string;
  name: string;
  atk: number;
  def: number;
  speed: number;
  dex: number;
  price: number;
  levelRequirement: number;
  rarity: string;
  slot: string | null;
  description: string;
  effectType: string | null;
  effectValue: number | null;
  effectDurationSecs: number | null;
  riskType: string | null;
  riskValue: number | null;
  blackMarketOnly: boolean;
  consumable: boolean;
  stealable: boolean;
  tradable: boolean;
  maxStack: number | null;
  stackable: boolean;
  isUnique: boolean;
};

type SeedMissionDefinition = {
  type: string;
  code: string;
  name: string;
  description: string;
  goalType: string;
  goalValue: number;
  rewardCash: number;
  rewardRp: number;
  rewardItemName: string | null;
};

type SeedPerkDefinition = {
  branch: string;
  code: string;
  name: string;
  description: string;
  effectType: string;
  effectValue: number;
  tier: number;
  prerequisiteCode: string | null;
};

const defaultItems: SeedItem[] = ([
  ["unit", "crew", "Recruit", 5, 3, 0, 0, 100, 1, "common", "Entry unit"],
  ["unit", "crew", "Soldier", 12, 10, 0, 0, 500, 2, "common", "Reliable frontline"],
  ["unit", "crew", "Elite", 30, 25, 0, 0, 2000, 6, "rare", "Trained tactical unit"],
  ["unit", "crew", "Mercenary", 50, 35, 0, 0, 5000, 10, "rare", "Paid heavy hitter"],
  ["unit", "crew", "Assassin", 80, 20, 0, 0, 10000, 14, "epic", "Glass cannon specialist"],
  ["unit", "crew", "Guardian", 20, 90, 0, 0, 10000, 14, "epic", "Defensive tank"],
  ["unit", "crew", "Warlord", 120, 100, 0, 0, 25000, 22, "legendary", "Endgame command unit"],
  ["equipment", "weapon", "Knife", 10, 0, 0, 0, 350, 1, "common", "Light melee weapon"],
  ["equipment", "weapon", "Pistol", 25, 0, 0, 0, 1200, 4, "uncommon", "Standard sidearm"],
  ["equipment", "armor", "Kevlar Vest", 0, 30, 0, 0, 1800, 5, "uncommon", "Layered body armor"],
  ["equipment", "mobility", "Tactical Boots", 0, 0, 8, 0, 1400, 5, "uncommon", "Mobility upgrade"],
  ["equipment", "intel", "Smart Goggles", 0, 0, 0, 8, 1600, 6, "rare", "Targeting assist optics"],
  ["equipment", "intel", "Combat Drone", 15, 0, 0, 10, 4200, 12, "epic", "Autonomous support platform"],
 ] as const).map(([category, subCategory, name, atk, def, speed, dex, price, levelRequirement, rarity, description]) => ({
  category,
  subCategory,
  name,
  atk,
  def,
  speed,
  dex,
  price,
  levelRequirement,
  rarity,
  slot: subCategory === "weapon" ? "weapon" : subCategory === "armor" ? "armor" : category === "equipment" ? "utility" : null,
  description,
  effectType: null,
  effectValue: null,
  effectDurationSecs: null,
  riskType: null,
  riskValue: null,
  blackMarketOnly: false,
  consumable: false,
  stealable: true,
  tradable: true,
  maxStack: category === "equipment" ? 1 : 25,
  stackable: true,
  isUnique: false,
}));

const waveOneItems: SeedItem[] = [
  {
    category: "consumable",
    subCategory: "recovery",
    name: "Medkit",
    atk: 0,
    def: 0,
    speed: 0,
    dex: 0,
    price: 900,
    levelRequirement: 2,
    rarity: "uncommon",
    slot: null,
    description: "Reduce a hospital timer with quick street treatment.",
    effectType: "hospital_release_partial",
    effectValue: 0.5,
    effectDurationSecs: 1800,
    riskType: "heat",
    riskValue: 3,
    blackMarketOnly: true,
    consumable: true,
    stealable: true,
    tradable: false,
    maxStack: 10,
    stackable: true,
    isUnique: false,
  },
  {
    category: "consumable",
    subCategory: "recovery",
    name: "Adrenal Shot",
    atk: 0,
    def: 0,
    speed: 0,
    dex: 0,
    price: 2200,
    levelRequirement: 4,
    rarity: "rare",
    slot: null,
    description: "Force an immediate discharge from the hospital.",
    effectType: "hospital_release_full",
    effectValue: 1,
    effectDurationSecs: null,
    riskType: "heat",
    riskValue: 6,
    blackMarketOnly: true,
    consumable: true,
    stealable: true,
    tradable: false,
    maxStack: 5,
    stackable: true,
    isUnique: false,
  },
  {
    category: "equipment",
    subCategory: "intel",
    name: "Fake ID",
    atk: 0,
    def: 0,
    speed: 0,
    dex: 4,
    price: 1600,
    levelRequirement: 3,
    rarity: "rare",
    slot: "utility",
    description: "Softens heat spikes after dirty deals.",
    effectType: "heat_mask_percent",
    effectValue: 0.15,
    effectDurationSecs: 21600,
    riskType: "sting",
    riskValue: 7,
    blackMarketOnly: true,
    consumable: false,
    stealable: false,
    tradable: true,
    maxStack: 1,
    stackable: false,
    isUnique: false,
  },
  {
    category: "equipment",
    subCategory: "utility",
    name: "Decoy Wallet",
    atk: 0,
    def: 4,
    speed: 0,
    dex: 0,
    price: 1400,
    levelRequirement: 3,
    rarity: "uncommon",
    slot: "utility",
    description: "Sacrifice dummy cash so thieves get less of the real thing.",
    effectType: "decoy_wallet_percent",
    effectValue: 0.2,
    effectDurationSecs: 43200,
    riskType: "sting",
    riskValue: 5,
    blackMarketOnly: true,
    consumable: false,
    stealable: true,
    tradable: true,
    maxStack: 1,
    stackable: true,
    isUnique: false,
  },
  {
    category: "equipment",
    subCategory: "intel",
    name: "Burner Phone",
    atk: 0,
    def: 0,
    speed: 2,
    dex: 2,
    price: 1800,
    levelRequirement: 4,
    rarity: "uncommon",
    slot: "utility",
    description: "Spoofs comms and trims a bit of PvP loot exposure.",
    effectType: "loot_reduction_percent",
    effectValue: 0.08,
    effectDurationSecs: 43200,
    riskType: "sting",
    riskValue: 4,
    blackMarketOnly: true,
    consumable: false,
    stealable: true,
    tradable: true,
    maxStack: 1,
    stackable: true,
    isUnique: false,
  },
  {
    category: "equipment",
    subCategory: "utility",
    name: "Smuggler Bag",
    atk: 0,
    def: 6,
    speed: 0,
    dex: 2,
    price: 2600,
    levelRequirement: 5,
    rarity: "rare",
    slot: "utility",
    description: "Carries illicit gear while taking the edge off raids.",
    effectType: "loot_reduction_percent",
    effectValue: 0.12,
    effectDurationSecs: 64800,
    riskType: "heat",
    riskValue: 8,
    blackMarketOnly: true,
    consumable: false,
    stealable: true,
    tradable: true,
    maxStack: 1,
    stackable: true,
    isUnique: false,
  },
  {
    category: "consumable",
    subCategory: "armor",
    name: "Cheap Armor Patch",
    atk: 0,
    def: 2,
    speed: 0,
    dex: 0,
    price: 1100,
    levelRequirement: 2,
    rarity: "common",
    slot: null,
    description: "Low-grade reinforcement that trims cash losses in a fight.",
    effectType: "loot_reduction_percent",
    effectValue: 0.15,
    effectDurationSecs: 21600,
    riskType: "heat",
    riskValue: 2,
    blackMarketOnly: true,
    consumable: true,
    stealable: true,
    tradable: false,
    maxStack: 10,
    stackable: true,
    isUnique: false,
  },
  {
    category: "consumable",
    subCategory: "contraband",
    name: "Contraband Bundle",
    atk: 0,
    def: 0,
    speed: 0,
    dex: 0,
    price: 3000,
    levelRequirement: 6,
    rarity: "epic",
    slot: null,
    description: "Packed with hot goods that attract heat and side profits.",
    effectType: "contraband_drop",
    effectValue: 1,
    effectDurationSecs: null,
    riskType: "heat",
    riskValue: 10,
    blackMarketOnly: true,
    consumable: true,
    stealable: true,
    tradable: false,
    maxStack: 5,
    stackable: true,
    isUnique: false,
  },
];

const defaultCrimes = [
  { name: "Pickpocket", nerveCost: 1, cashMin: 10, cashMax: 50, xpReward: 5, successRate: 0.9, levelReq: 1 },
  { name: "Shoplift", nerveCost: 2, cashMin: 30, cashMax: 120, xpReward: 8, successRate: 0.8, levelReq: 1 },
  { name: "Mug a Stranger", nerveCost: 3, cashMin: 80, cashMax: 300, xpReward: 12, successRate: 0.7, levelReq: 3 },
  { name: "Rob a Store", nerveCost: 4, cashMin: 200, cashMax: 800, xpReward: 18, successRate: 0.6, levelReq: 5 },
  { name: "Grand Theft Auto", nerveCost: 5, cashMin: 500, cashMax: 2000, xpReward: 25, successRate: 0.5, levelReq: 8 },
  { name: "Armed Robbery", nerveCost: 6, cashMin: 1000, cashMax: 4000, xpReward: 35, successRate: 0.4, levelReq: 12 },
  { name: "Hack a Corporation", nerveCost: 8, cashMin: 3000, cashMax: 10000, xpReward: 50, successRate: 0.3, levelReq: 18 },
  { name: "Heist", nerveCost: 10, cashMin: 8000, cashMax: 25000, xpReward: 75, successRate: 0.2, levelReq: 25 },
];

const defaultMissionDefinitions: SeedMissionDefinition[] = ([
  ["daily", "daily_commit_5_crimes", "Make Noise", "Commit 5 crimes before the city cools off.", "crime_commit", 5, 2500, 12, null],
  ["daily", "daily_win_2_battles", "Street Cred", "Win 2 battles against live targets or NPCs.", "battle_win", 2, 3000, 15, null],
  ["daily", "daily_train_3_times", "No Days Off", "Train any stat 3 times in the gym.", "gym_train", 3, 2200, 10, null],
  ["daily", "daily_buy_black_market", "After Hours Shopping", "Buy 1 listing from the black market.", "black_market_buy", 1, 2800, 14, "Cheap Armor Patch"],
  ["daily", "daily_deposit_vault", "Lay Low", "Deposit cash in the vault once.", "vault_deposit", 1, 2000, 9, null],
  ["weekly", "weekly_earn_50000_cash", "Big Week", "Earn 50,000 wallet cash through city activity.", "cash_earned", 50000, 12000, 50, "Smuggler Bag"],
  ["weekly", "weekly_hospitalize_5_players", "Leave a Mark", "Hospitalize 5 opponents in battle.", "hospitalize_player", 5, 10000, 45, null],
  ["weekly", "weekly_complete_20_crimes", "Crime Spree", "Commit 20 crimes this week.", "crime_commit", 20, 9000, 35, null],
  ["weekly", "weekly_claim_7_dailies", "Consistent Pressure", "Claim 7 daily mission rewards.", "daily_claim", 7, 15000, 60, "Fake ID"],
 ] as const).map(([type, code, name, description, goalType, goalValue, rewardCash, rewardRp, rewardItemName]) => ({
  type,
  code,
  name,
  description,
  goalType,
  goalValue,
  rewardCash,
  rewardRp,
  rewardItemName,
}));

const defaultPerkDefinitions: SeedPerkDefinition[] = [
  { branch: "enforcer", code: "enforcer_loot_plus_1", name: "Shake Down I", description: "Boost PvP wallet steals a little.", effectType: "loot_percent", effectValue: 0.08, tier: 1, prerequisiteCode: null },
  { branch: "enforcer", code: "enforcer_battle_edge_1", name: "Battle Edge I", description: "Gain a small AP edge.", effectType: "battle_ap_percent", effectValue: 0.06, tier: 1, prerequisiteCode: null },
  { branch: "enforcer", code: "enforcer_revenge_bonus_1", name: "Score to Settle", description: "Improve revenge payouts.", effectType: "revenge_bonus_percent", effectValue: 0.08, tier: 1, prerequisiteCode: null },
  { branch: "enforcer", code: "enforcer_loot_plus_2", name: "Shake Down II", description: "Further improve PvP loot.", effectType: "loot_percent", effectValue: 0.1, tier: 2, prerequisiteCode: "enforcer_loot_plus_1" },
  { branch: "enforcer", code: "enforcer_battle_edge_2", name: "Battle Edge II", description: "A stronger AP bonus.", effectType: "battle_ap_percent", effectValue: 0.08, tier: 2, prerequisiteCode: "enforcer_battle_edge_1" },
  { branch: "hustler", code: "hustler_crime_payout_1", name: "Fast Hands", description: "Increase crime payouts slightly.", effectType: "crime_payout_percent", effectValue: 0.1, tier: 1, prerequisiteCode: null },
  { branch: "hustler", code: "hustler_heat_reduction_1", name: "Keep It Quiet", description: "Trim heat gained from shady activity.", effectType: "heat_reduction_percent", effectValue: 0.12, tier: 1, prerequisiteCode: null },
  { branch: "hustler", code: "hustler_black_market_discount_1", name: "Connected Buyer", description: "Unlock small black market discounts.", effectType: "black_market_discount_percent", effectValue: 0.08, tier: 1, prerequisiteCode: null },
  { branch: "hustler", code: "hustler_crime_payout_2", name: "Fast Hands II", description: "A stronger crime payout bonus.", effectType: "crime_payout_percent", effectValue: 0.12, tier: 2, prerequisiteCode: "hustler_crime_payout_1" },
  { branch: "hustler", code: "hustler_heat_reduction_2", name: "Keep It Quiet II", description: "Further reduce heat spikes.", effectType: "heat_reduction_percent", effectValue: 0.14, tier: 2, prerequisiteCode: "hustler_heat_reduction_1" },
  { branch: "grinder", code: "grinder_training_efficiency_1", name: "Solid Routine", description: "Prepare for future training gains.", effectType: "training_efficiency_percent", effectValue: 0.08, tier: 1, prerequisiteCode: null },
  { branch: "grinder", code: "grinder_recovery_efficiency_1", name: "Tough Recovery", description: "Prepare for better recovery efficiency.", effectType: "recovery_efficiency_percent", effectValue: 0.08, tier: 1, prerequisiteCode: null },
  { branch: "grinder", code: "grinder_hospital_reduction_1", name: "Bounce Back", description: "Reduce hospital time when released by items.", effectType: "hospital_time_reduction_percent", effectValue: 0.12, tier: 1, prerequisiteCode: null },
  { branch: "grinder", code: "grinder_recovery_efficiency_2", name: "Tough Recovery II", description: "A stronger recovery boost.", effectType: "recovery_efficiency_percent", effectValue: 0.1, tier: 2, prerequisiteCode: "grinder_recovery_efficiency_1" },
  { branch: "grinder", code: "grinder_hospital_reduction_2", name: "Bounce Back II", description: "Further reduce hospital release friction.", effectType: "hospital_time_reduction_percent", effectValue: 0.14, tier: 2, prerequisiteCode: "grinder_hospital_reduction_1" },
];

export async function ensureSeedData(prisma: PrismaClient) {
  const items = [...defaultItems, ...waveOneItems];

  for (const item of items) {
    const existing = await prisma.item.findFirst({ where: { name: item.name } });
    if (!existing) {
      await prisma.item.create({ data: item });
    } else {
      await prisma.item.update({
        where: { id: existing.id },
        data: item,
      });
    }
  }

  const seededPerks = new Map<string, string>();
  for (const perk of defaultPerkDefinitions) {
    const created = await prisma.perkDefinition.upsert({
      where: { code: perk.code },
      update: {
        branch: perk.branch,
        name: perk.name,
        description: perk.description,
        effectType: perk.effectType,
        effectValue: perk.effectValue,
        tier: perk.tier,
        active: true,
      },
      create: {
        branch: perk.branch,
        code: perk.code,
        name: perk.name,
        description: perk.description,
        effectType: perk.effectType,
        effectValue: perk.effectValue,
        tier: perk.tier,
        active: true,
      },
    });
    seededPerks.set(perk.code, created.id);
  }

  for (const perk of defaultPerkDefinitions) {
    await prisma.perkDefinition.update({
      where: { code: perk.code },
      data: {
        prerequisitePerkId: perk.prerequisiteCode ? seededPerks.get(perk.prerequisiteCode) ?? null : null,
      },
    });
  }

  const crimeCount = await prisma.crime.count();
  if (crimeCount === 0) {
    await prisma.crime.createMany({ data: defaultCrimes });
  }

  for (const definition of defaultMissionDefinitions) {
    const rewardItem = definition.rewardItemName
      ? await prisma.item.findFirst({ where: { name: definition.rewardItemName } })
      : null;

    await prisma.missionDefinition.upsert({
      where: { code: definition.code },
      update: {
        type: definition.type,
        name: definition.name,
        description: definition.description,
        goalType: definition.goalType,
        goalValue: definition.goalValue,
        rewardCash: definition.rewardCash,
        rewardRp: definition.rewardRp,
        rewardItemId: rewardItem?.id ?? null,
        active: true,
      },
      create: {
        type: definition.type,
        code: definition.code,
        name: definition.name,
        description: definition.description,
        goalType: definition.goalType,
        goalValue: definition.goalValue,
        rewardCash: definition.rewardCash,
        rewardRp: definition.rewardRp,
        rewardItemId: rewardItem?.id ?? null,
        active: true,
      },
    });
  }

  const now = new Date();
  const activeSeason = await prisma.season.findFirst({
    where: { status: "active", startsAt: { lte: now }, endsAt: { gt: now } },
  });

  if (!activeSeason) {
    const startsAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const endsAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
    await prisma.season.create({
      data: {
        name: `${startsAt.toLocaleString("en-US", { month: "long" })} Dev Season`,
        status: "active",
        startsAt,
        endsAt,
        rewardJson: { top1: "Bragging rights", top10: "Future prestige preview" },
        prestigeEnabled: false,
      },
    });
  }
}

export async function seedDatabase() {
  const prisma = new PrismaClient();
  try {
    await ensureSeedData(prisma);
  } finally {
    await prisma.$disconnect();
  }
}
