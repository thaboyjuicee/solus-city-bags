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
  hospitalExitPenalty: { type: string | null; until: string } | null;
  activeProtectionEffects: Array<{ id: string; type: string; value: number; endsAt: string; sourceName?: string }>;
  missionsPreview: Mission[];
  blackMarketEndsAt: string | null;
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
  metadata?: Record<string, unknown> | null;
  protectionTriggered?: string[];
}
