export interface MissionReward {
  cash: number;
  rp: number;
  item: { id: string; name: string } | null;
}

export interface Mission {
  id: string;
  type: "daily" | "weekly";
  code: string;
  name: string;
  description: string;
  goalType?: string;
  goalValue: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
  endsAt: string;
  rewards: MissionReward;
}

export interface MeResponse {
  wallet: string;
  name: string;
  cash: number;
  vaultCash: number;
  rp: number;
  level: number;
  xp: number;
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  nerve: number;
  maxNerve: number;
  happiness: number;
  maxHappiness: number;
  ap: number;
  dp: number;
  strength: number;
  speed: number;
  defense: number;
  dexterity: number;
  shieldUntil: string;
  hospitalUntil: string | null;
  inHospital: boolean;
  incomePerHour: number;
  nextEnergyAt?: string;
  nextNerveAt?: string;
  nextHappinessAt?: string;
  slsSpent: number;
  heat: number;
  wantedTier: string;
  seasonScore: number;
  availablePerkPoints: number;
  prestigeLevel: number;
  hospitalExitPenalty: { type: string | null; until: string } | null;
  activeProtectionEffects: Array<{ id: string; type: string; value: number; endsAt: string; sourceName?: string }>;
  missionsPreview: Mission[];
  blackMarketEndsAt: string | null;
  currentSeason: SeasonSummary | null;
  unlockedPerkSummary: { total: number; branches: Record<string, number> };
  equipmentSummary: Array<{ itemId: string; name: string; slot: string | null; rarity: string | null }>;
  syndicate: {
    id: string;
    name: string;
    role: string;
    buffType: string;
    buffValue: number;
  } | null;
}

export interface HospitalOptions {
  hospitalized: boolean;
  remainingMinutes: number;
  cashReleaseCost: number;
  itemOptions: Array<{
    itemId: string;
    name: string;
    qty: number;
    effectType: string | null;
    effectValue: number | null;
    effectDurationSecs: number | null;
  }>;
  penaltyReleaseOptions: Array<{
    type: string;
    durationHours: number;
  }>;
}

export interface TargetPreview {
  id: string;
  type: "player" | "npc";
  displayName: string;
  wallet: string;
  rp: number;
  level: number;
  shieldActive: boolean;
  inHospital: boolean;
  avatarKey?: string;
  flavor?: string;
  winChanceBand: "safe" | "favorable" | "even" | "risky" | "dangerous";
  lootBand: "low" | "medium" | "high" | "jackpot";
  heatBand: "low" | "watched" | "wanted" | "dangerous" | "most_wanted";
  recentlyFarmedPenalty: boolean;
  syndicateBadge: string | null;
  mismatchPenaltyApplied?: boolean;
}

export interface BlackMarketRotation {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  theme: string | null;
  secondsRemaining: number;
}

export interface BlackMarketListing {
  id: string;
  basePrice: number;
  finalPrice: number;
  stock: number;
  remainingStock: number;
  riskPercent: number;
  requiredHeatMin: number;
  requiredLevelMin: number;
  listingType: string;
  active: boolean;
  canAfford?: boolean;
  item: {
    id: string;
    name: string;
    category: string;
    subCategory: string | null;
    description: string | null;
    effectType: string | null;
    effectValue: number | null;
    effectDurationSecs: number | null;
    riskType: string | null;
    riskValue: number | null;
    consumable: boolean;
    rarity: string | null;
    slot: string | null;
    tradable: boolean;
    maxStack: number | null;
  };
}

export interface AttackLogEntry {
  id: string;
  createdAt: string;
  type: string;
  attackerName: string;
  defenderName: string;
  targetType: "player" | "npc";
  result: "win" | "loss";
  outcomeType?: "evaded";
  damageDealt: number;
  damageTaken: number;
  loot: number;
  cashStolen: number;
  heatChange: number;
  rpChange: number;
  xpGained: number;
  hospitalResult: string;
  revengeTargetId?: string;
  revengeAvailable: boolean;
  revengeExpiresAt?: string | null;
  revengeBonusPreview?: number;
  metadata?: Record<string, unknown> | null;
  protectionTriggered?: string[];
}

export interface PerkDefinition {
  id: string;
  branch: string;
  code: string;
  name: string;
  description: string;
  effectType: string;
  effectValue: number;
  tier: number;
  active: boolean;
  prerequisitePerk?: { id: string; code: string; name: string } | null;
}

export interface PlayerPerk {
  id: string;
  unlockedAt: string;
  perkDefinition: PerkDefinition;
}

export interface PerksResponse {
  branches: Array<{ code: string; name: string; description: string }>;
  definitions: PerkDefinition[];
  unlocked: PlayerPerk[];
  availablePoints: number;
}

export interface InventoryRow {
  id: string;
  inventoryItemId: string;
  itemId: string;
  qty: number;
  equipped: boolean;
  durability: number | null;
  expiresAt: string | null;
  sourceType: string | null;
  item: {
    id: string;
    name: string;
    category: string;
    subCategory: string | null;
    rarity: string | null;
    slot: string | null;
    description: string | null;
    effectType: string | null;
    effectValue: number | null;
    effectDurationSecs: number | null;
    tradable: boolean;
    consumable: boolean;
  };
}

export interface InventoryResponse {
  equipped: InventoryRow[];
  consumables: InventoryRow[];
  utilities: InventoryRow[];
  contraband: InventoryRow[];
  protection: InventoryRow[];
  general: InventoryRow[];
}

export interface SeasonSummary {
  id: string;
  name: string;
  status: string;
  startsAt: string;
  endsAt: string;
  timeRemainingMs: number;
  rewardPreview: unknown;
  prestigeEnabled: boolean;
  player: {
    rank: number | null;
    score: number;
    pvpScore: number;
    crimeScore: number;
    missionScore: number;
  } | null;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  wallet: string;
  level: number;
  rp?: number;
  score?: number;
  seasonScore?: number;
  pvpScore?: number;
  crimeScore?: number;
  missionScore?: number;
  isMe: boolean;
}

export interface LeaderboardResponse {
  type: "season" | "pvp" | "crime";
  seasonId?: string;
  entries: LeaderboardEntry[];
}

export type WarSummaryResponse = {
  id: string;
  status: string;
  startsAt: string;
  endsAt: string;
  attackerScore: number;
  defenderScore: number;
  territory?: { id: string; name: string; code: string } | null;
  attackerSyndicate?: { id: string; name: string } | null;
  defenderSyndicate?: { id: string; name: string } | null;
};

export type SyndicateOverviewResponse = {
  id: string;
  name: string;
  description: string;
  vaultCash: number;
  seasonPoints: number;
  territoryCount: number;
  warRating: number;
  safehouseLevel?: number;
};

export type TerritorySummaryResponse = {
  id: string;
  name: string;
  code: string;
  bonusType: string;
  bonusValue: number;
  active: boolean;
  owner?: { id: string; name: string } | null;
  influence: number;
  contestState: string;
};
