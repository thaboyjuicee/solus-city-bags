export const PERK_BRANCHES = [
  { code: "enforcer", name: "Enforcer", description: "PvP pressure, loot, and revenge edges." },
  { code: "hustler", name: "Hustler", description: "Crime cash, heat control, and underworld deals." },
  { code: "grinder", name: "Grinder", description: "Recovery, training, and steady progression." },
] as const;

export const WANTED_TIER_BANDS = [
  { tier: "low", min: 0, max: 19, label: "Low" },
  { tier: "watched", min: 20, max: 39, label: "Watched" },
  { tier: "wanted", min: 40, max: 59, label: "Wanted" },
  { tier: "dangerous", min: 60, max: 79, label: "Dangerous" },
  { tier: "most_wanted", min: 80, max: 100, label: "Most Wanted" },
] as const;

export const PROTECTION_EFFECT_TYPES = [
  "loot_reduction_percent",
  "decoy_wallet_percent",
  "decoy_wallet_flat",
  "heat_mask_percent",
] as const;

export const INVENTORY_GROUPS = [
  "equipped",
  "consumables",
  "utilities",
  "contraband",
  "protection",
  "general",
] as const;

export const SEASON_CATEGORIES = ["battle_win", "hospitalize", "crime_success", "mission_claim"] as const;
