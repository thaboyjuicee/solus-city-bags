export const PERK_BRANCHES = [
  { code: "enforcer", name: "Enforcer", description: "PvP pressure, loot, and revenge edges." },
  { code: "hustler", name: "Hustler", description: "Crime cash, heat control, and underworld deals." },
  { code: "grinder", name: "Grinder", description: "Recovery, training, and steady progression." },
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
