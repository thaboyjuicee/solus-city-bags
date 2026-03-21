export const HEAT_MAX = 100;
export const HEAT_DECAY_PER_INTERVAL = 2;
export const HEAT_DECAY_INTERVAL_MINUTES = 30;

export const PVP_STEAL_MIN_PERCENT = 0.03;
export const PVP_STEAL_MAX_PERCENT = 0.1;
export const REPEAT_TARGET_LOOT_REDUCTION_WINDOW_MINUTES = 60;
export const REPEAT_TARGET_LOOT_REDUCTION_MULTIPLIER = 0.45;
export const NEWBIE_PROTECTION_LEVEL_MAX = 5;

export const BLACK_MARKET_ROTATION_HOURS = 6;
export const BLACK_MARKET_MAX_LISTINGS = 6;
export const BLACK_MARKET_STING_MAX_PERCENT = 22;

export const HOSPITAL_CASH_RELEASE_BASE = 250;
export const HOSPITAL_CASH_RELEASE_PER_LEVEL = 25;
export const HOSPITAL_CASH_RELEASE_PER_MINUTE = 5;
export const HOSPITAL_PENALTY_DURATION_HOURS = {
  weakened: 4,
  shaken: 6,
  exposed: 8,
} as const;

export const DAILY_MISSION_COUNT = 3;
export const WEEKLY_MISSION_COUNT = 2;

export const PERK_POINT_LEVEL_INTERVAL = 5;
export const PERK_BRANCH_MAX_TIER = 3;

export const REVENGE_WINDOW_HOURS = 24;
export const REVENGE_BONUS_PERCENT = 0.15;
export const REVENGE_MIN_LOSS_THRESHOLD = 750;

export const SEASON_SCORE_BATTLE_WIN = 12;
export const SEASON_SCORE_HOSPITALIZE = 6;
export const SEASON_SCORE_CRIME_SUCCESS = 4;
export const SEASON_SCORE_MISSION_CLAIM = 8;

export const MISMATCH_POWER_RATIO_THRESHOLD = 1.8;
export const MISMATCH_LEVEL_GAP_THRESHOLD = 8;
export const MISMATCH_LOOT_MULTIPLIER = 0.4;
export const MISMATCH_SEASON_POINTS_MULTIPLIER = 0.5;
export const REPEAT_TARGET_SEASON_POINT_MULTIPLIER = 0.5;

export const INVENTORY_DEFAULT_DURABILITY = 100;
export const INVENTORY_EQUIP_SLOTS = ["weapon", "armor", "utility"] as const;

export const WAR_WINDOW_HOURS = 12;
export const WAR_MAX_CONCURRENT = 2;
export const WAR_POINT_BATTLE_WIN = 8;
export const WAR_POINT_BATTLE_HOSPITALIZE = 4;
export const WAR_POINT_SUPPLY_DELIVER = 6;
export const WAR_POINT_NODE_SECURE = 10;

export const TERRITORY_INFLUENCE_DONATE_CASH = 8;
export const TERRITORY_INFLUENCE_LOCAL_TASK = 5;
export const TERRITORY_INFLUENCE_WAR_CONTROL = 12;
export const TERRITORY_DECAY_INTERVAL_HOURS = 24;
export const TERRITORY_DECAY_AMOUNT = 6;

export const WAR_UNDERDOG_BONUS_MULTIPLIER = 1.15;
export const SYNDICATE_VAULT_MIN_WITHDRAW = 100;
export const SYNDICATE_VAULT_MAX_WITHDRAW_PERCENT = 0.5;
export const CONTRIBUTION_VAULT_DEPOSIT_MULTIPLIER = 0.05;
export const CONTRIBUTION_WAR_ACTION_MULTIPLIER = 1;

export const PRESTIGE_MIN_LEVEL = 25;
export const PRESTIGE_MIN_TOTAL_STATS = 400;
export const PRESTIGE_MIN_SEASON_RANK = 50;
export const PRESTIGE_BONUS_MAX_ENERGY = 2;
export const PRESTIGE_BONUS_MAX_NERVE = 1;
export const PRESTIGE_BONUS_MAX_HAPPINESS = 3;
export const PRESTIGE_RESET_STARTING_CASH = 1000;
export const PRESTIGE_RESET_VAULT_CASH = 0;
export const PRESTIGE_RESET_HEAT = 0;

export const CHAMPIONSHIP_QUALIFIER_COUNT = 4;
export const CHAMPIONSHIP_ROUND_DURATION_HOURS = 24;
export const CHAMPIONSHIP_TIE_POLICY = "higher_seed" as const;
export const CHAMPIONSHIP_ADVANCE_BUFFER_MINUTES = 15;

export const SEASON_REWARD_OVERALL_TIERS = [
  { key: "legend", label: "Legend", minRank: 1, maxRank: 1, cash: 6000, rp: 500, prestigePoints: 2, title: "Season Champion" },
  { key: "elite", label: "Elite", minRank: 2, maxRank: 5, cash: 3000, rp: 250, prestigePoints: 1, title: "Elite Finisher" },
  { key: "contender", label: "Contender", minRank: 6, maxRank: 10, cash: 1500, rp: 100, prestigePoints: 0, title: "Top Ten" },
  { key: "operator", label: "Operator", minRank: 11, maxRank: 25, cash: 750, rp: 50, prestigePoints: 0, title: "Strong Season" },
] as const;

export const SEASON_REWARD_PVP_TIERS = [
  { key: "apex", label: "Apex", minRank: 1, maxRank: 1, cash: 2500, rp: 150, prestigePoints: 1, title: "PvP Apex" },
  { key: "vanguard", label: "Vanguard", minRank: 2, maxRank: 5, cash: 1200, rp: 80, prestigePoints: 0, title: "PvP Vanguard" },
  { key: "striker", label: "Striker", minRank: 6, maxRank: 10, cash: 600, rp: 40, prestigePoints: 0, title: "PvP Striker" },
] as const;

export const SEASON_REWARD_CRIME_TIERS = [
  { key: "kingpin", label: "Kingpin", minRank: 1, maxRank: 1, cash: 2200, rp: 140, prestigePoints: 1, title: "Crime Kingpin" },
  { key: "earner", label: "Earner", minRank: 2, maxRank: 5, cash: 1000, rp: 70, prestigePoints: 0, title: "Crime Earner" },
  { key: "runner", label: "Runner", minRank: 6, maxRank: 10, cash: 500, rp: 35, prestigePoints: 0, title: "Crime Runner" },
] as const;

export const SEASON_REWARD_SYNDICATE_TIERS = [
  { key: "dynasty", label: "Dynasty", minRank: 1, maxRank: 1, cash: 0, rp: 0, prestigePoints: 0, title: "Top Syndicate" },
  { key: "cartel", label: "Cartel", minRank: 2, maxRank: 3, cash: 0, rp: 0, prestigePoints: 0, title: "Top Syndicate Finalist" },
] as const;

export const SEASON_REWARD_CHAMPIONSHIP_TIERS = [
  { key: "champion", label: "Champion", minRank: 1, maxRank: 1, cash: 0, rp: 0, prestigePoints: 0, title: "Syndicate Champion" },
] as const;

