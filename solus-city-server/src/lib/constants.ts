// All tunable game constants in one place

// --- Bars ---
export const ENERGY_MAX = 20;
export const ENERGY_REGEN_MINUTES = 5;    // 1 energy per 5 minutes
export const NERVE_MAX = 10;
export const NERVE_REGEN_MINUTES = 3;     // 1 nerve per 3 minutes
export const HEALTH_MAX = 100;
export const HAPPINESS_MAX = 50;
export const HAPPINESS_REGEN_MINUTES = 30; // 1 happiness per 30 minutes

// --- Income ---
export const INCOME_CAP_HOURS = 24;       // Income accrues for max 24h
export const BASE_INCOME_PER_HOUR = 100;  // Base cash income per hour

// --- Combat base stats (from items) ---
export const BASE_ATK = 10;               // Base attack power (no units)
export const BASE_DEF = 10;               // Base defense power (no units)

// --- Shield ---
export const SHIELD_DURATION_HOURS = 24;  // New account shield duration

// --- Battle ---
export const COOLDOWN_MINUTES = 10;       // Re-attack cooldown per target
export const LOOT_PERCENT = 0.08;         // 8% of defender cash stolen on win
export const LOOT_CAP = 5000;             // Maximum loot per attack
export const RP_WIN_BASE = 10;            // Base RP gain on win
export const RP_WIN_CLAMP_MIN = -5;       // Min RP bonus from RP difference
export const RP_WIN_CLAMP_MAX = 15;       // Max RP bonus from RP difference
export const RP_LOSS = -5;                // RP penalty on loss
export const RP_BAND_FRACTION = 0.25;     // Target RP band ± (rp * this)
export const RP_BAND_MIN = 200;           // Minimum RP band half-width
export const TARGET_COUNT = 10;           // How many targets to return
export const BATTLE_DAMAGE_MIN = 15;      // Minimum health damage dealt
export const BATTLE_DAMAGE_MAX = 40;      // Maximum health damage dealt
export const HOSPITAL_MINUTES_PER_DMG = 1; // Hospital time per damage dealt
export const EVASION_CHANCE_BASE = 0.05;  // Base evade chance
export const EVASION_CHANCE_MIN = 0.02;   // Minimum evade chance
export const EVASION_CHANCE_MAX = 0.24;   // Maximum evade chance
export const CRIT_CHANCE_BASE = 0.08;     // Base critical chance
export const CRIT_CHANCE_MIN = 0.03;      // Minimum critical chance
export const CRIT_CHANCE_MAX = 0.25;      // Maximum critical chance
export const CRIT_DAMAGE_MULTIPLIER = 1.8; // Critical damage multiplier
export const CRIT_XP_BONUS = 2;           // XP bonus on critical hit
export const EVASION_XP_REWARD = 3;       // XP reward when your hit is evaded

// --- Shop ---
export const MAX_BUY_QTY = 100;           // Max units per purchase

// --- Gym ---
export const GYM_ENERGY_COST = 5;         // Energy per gym train
export const GYM_STAT_GAIN_MIN = 1;       // Min stat points gained
export const GYM_STAT_GAIN_MAX = 3;       // Max stat points gained
export const GYM_XP_REWARD = 10;          // XP per gym train
export const GYM_HAPPY_COST = 5;          // Happiness spent per train (bonus gains)

// --- Crimes ---
export const CRIME_XP_BONUS_HAPPY = 0.5;  // Extra XP per happiness point spent

// --- Leveling ---
export const XP_PER_LEVEL = 100;          // XP needed per level
export const HEALTH_PER_LEVEL = 5;        // Max health gained per level
export const MAX_LEVEL = 100;

// --- NPC / AI targets ---
export const NPC_POOL_MIN = 8;

// --- Syndicates ---
export const SYNDICATE_MAX_MEMBERS = 20;
export const SYNDICATE_AP_BUFF = 0.05;
