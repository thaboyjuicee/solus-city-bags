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

export interface PrestigeRequirement {
  key: string;
  label: string;
  met: boolean;
  current: number | null;
  required: number | null;
}

export interface PrestigePreview {
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
}

export interface SeasonRewardTier {
  key: string;
  label: string;
  minRank: number;
  maxRank: number;
  cash: number;
  rp: number;
  prestigePoints: number;
  title: string;
  rankLabel: string;
}

export interface SeasonRewardProjection {
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
}

export interface SeasonRewardPreviewResponse {
  seasonId: string;
  seasonName: string;
  endsAt: string;
  timeRemainingMs: number;
  projected: SeasonRewardProjection;
  rewardTiers: {
    overall: SeasonRewardTier[];
    pvp: SeasonRewardTier[];
    crime: SeasonRewardTier[];
    syndicates: SeasonRewardTier[];
    championships: SeasonRewardTier[];
  };
}

export interface HallOfFameEntry {
  id: string;
  category: string;
  rank: number;
  display: Record<string, unknown>;
  season: {
    id: string;
    name: string;
    status: string;
    startsAt: string;
    endsAt: string;
  };
  user: { id: string; name: string } | null;
  syndicate: { id: string; name: string } | null;
}

export interface SeasonHistoryEntry {
  season: SeasonSummary;
  rewardClaimed: boolean;
  highlights: Array<{
    id: string;
    category: string;
    rank: number;
    display: Record<string, unknown>;
  }>;
}

export interface ChampionshipSummary {
  id: string;
  status: string;
  startsAt: string;
  endsAt: string;
  currentRound: number;
  season: { id: string; name: string };
  qualifiers: Array<{
    seed: number;
    qualifyingPoints: number;
    syndicate: { id: string; name: string };
  }>;
  matches: Array<{
    id: string;
    round: number;
    status: string;
    scoreA: number;
    scoreB: number;
    startsAt: string;
    endsAt: string;
    syndicateA: { id: string; name: string };
    syndicateB: { id: string; name: string };
    winnerSyndicate: { id: string; name: string } | null;
  }>;
}

export interface MeResponse {
  id: string;
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
  prestigePoints: number;
  hospitalExitPenalty: { type: string | null; until: string } | null;
  activeProtectionEffects: Array<{ id: string; type: string; value: number; endsAt: string; sourceName?: string }>;
  missionsPreview: Mission[];
  blackMarketEndsAt: string | null;
  currentSeason: SeasonSummary | null;
  unlockedPerkSummary: { total: number; branches: Record<string, number> };
  equipmentSummary: Array<{ itemId: string; name: string; slot: string | null; rarity: string | null }>;
  activeTerritoryBonuses?: Array<{ territoryId: string; territoryName: string; bonusType: string; bonusValue: number }>;
  currentWarSummary?: {
    id: string;
    status: string;
    startsAt: string;
    endsAt: string;
    attackerScore: number;
    defenderScore: number;
    territory?: { id: string; name: string; code: string } | null;
    attackerSyndicate?: { id: string; name: string } | null;
    defenderSyndicate?: { id: string; name: string } | null;
  } | null;
  syndicateVaultSummary?: {
    vaultCash: number;
    seasonPoints: number;
    territoryCount: number;
    warRating: number;
  } | null;
  currentSyndicateRole?: string | null;
  prestigeSummary?: PrestigePreview | null;
  projectedSeasonRewards?: SeasonRewardProjection | null;
  championshipSummary?: {
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
      startsAt: string;
      endsAt: string;
      opponentName: string;
    } | null;
  } | null;
  seasonHistoryPreview?: SeasonHistoryEntry[];
  syndicate: {
    id: string;
    name: string;
    role: string;
    buffType: string;
    buffValue: number;
    vaultCash?: number;
    seasonPoints?: number;
    territoryCount?: number;
    warRating?: number;
    permissions?: {
      manageRoles: boolean;
      withdrawVault: boolean;
      manageWar: boolean;
      recruit: boolean;
    };
  } | null;
}

export interface HospitalOptions {
  hospitalized: boolean;
  remainingMinutes: number;
  slsReleaseCost: number | null;
  slsReleaseUsd: number;
  slsReleaseMultiplier: number;
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

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  wallet?: string;
  level?: number;
  rp?: number;
  ap?: number;
  dp?: number;
  score?: number;
  seasonScore?: number;
  pvpScore?: number;
  crimeScore?: number;
  missionScore?: number;
  territoryOwner?: string;
  territoryCount?: number;
  warRating?: number;
  bonusType?: string;
  bonusValue?: number;
  membersCount?: number;
  prestigeLevel?: number;
  prestigePoints?: number;
  category?: string;
  seasonName?: string;
  display?: Record<string, unknown>;
  isMe: boolean;
}

export interface LeaderboardResponse {
  type: "season" | "pvp" | "crime" | "syndicates" | "territories" | "prestige" | "hall_of_fame";
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

