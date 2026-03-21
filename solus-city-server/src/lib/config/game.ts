export const WANTED_TIER_BANDS = [
  { tier: "low", min: 0, max: 19, label: "Low Heat", color: "#66bb6a" },
  { tier: "watched", min: 20, max: 39, label: "Watched", color: "#fdd835" },
  { tier: "wanted", min: 40, max: 59, label: "Wanted", color: "#ff9800" },
  { tier: "dangerous", min: 60, max: 79, label: "Dangerous", color: "#ef5350" },
  { tier: "most_wanted", min: 80, max: 100, label: "Most Wanted", color: "#b71c1c" },
] as const;

export const HOSPITAL_PENALTY_LABELS = {
  weakened: "Weakened",
  shaken: "Shaken",
  exposed: "Exposed",
} as const;

export const PROTECTION_EFFECT_TYPES = [
  "loot_reduction_percent",
  "decoy_wallet_percent",
  "decoy_wallet_flat",
  "heat_mask_percent",
] as const;

export const HOSPITAL_RECOVERY_EFFECT_TYPES = [
  "hospital_release_full",
  "hospital_release_partial",
] as const;
