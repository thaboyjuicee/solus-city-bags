import { getWantedTier } from "../player/heat";

export function getWinChanceBand(probability: number) {
  if (probability >= 0.75) return "safe";
  if (probability >= 0.6) return "favorable";
  if (probability >= 0.45) return "even";
  if (probability >= 0.3) return "risky";
  return "dangerous";
}

export function getLootBand(value: number) {
  if (value >= 4000) return "jackpot";
  if (value >= 1500) return "high";
  if (value >= 500) return "medium";
  return "low";
}

type SerializeTargetInput = {
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
  winChanceBand: string;
  lootBand: string;
  heatBand: string;
  recentlyFarmedPenalty: boolean;
  syndicateBadge: string | null;
  mismatchPenaltyApplied?: boolean;
};

export function serializeTargetPreview(input: SerializeTargetInput) {
  return {
    id: input.id,
    type: input.type,
    displayName: input.displayName,
    wallet: input.wallet,
    rp: input.rp,
    level: input.level,
    shieldActive: input.shieldActive,
    inHospital: input.inHospital,
    avatarKey: input.avatarKey,
    flavor: input.flavor,
    winChanceBand: input.winChanceBand,
    lootBand: input.lootBand,
    heatBand: input.heatBand,
    recentlyFarmedPenalty: input.recentlyFarmedPenalty,
    syndicateBadge: input.syndicateBadge,
    mismatchPenaltyApplied: input.mismatchPenaltyApplied ?? false,
  };
}

export function getHeatBand(heat: number) {
  return getWantedTier(heat);
}
