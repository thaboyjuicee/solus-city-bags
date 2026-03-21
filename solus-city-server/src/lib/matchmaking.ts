import {
  MISMATCH_LEVEL_GAP_THRESHOLD,
  MISMATCH_LOOT_MULTIPLIER,
  MISMATCH_POWER_RATIO_THRESHOLD,
  MISMATCH_SEASON_POINTS_MULTIPLIER,
} from "./config/balance";

type MismatchInput = {
  attackerPower: number;
  defenderPower: number;
  attackerLevel: number;
  defenderLevel: number;
};

export function getHiddenPower(attackerPower: number, defenderPower: number) {
  if (defenderPower <= 0) return Infinity;
  return attackerPower / defenderPower;
}

export function getMismatchAdjustment(input: MismatchInput) {
  const powerRatio = getHiddenPower(input.attackerPower, input.defenderPower);
  const levelGap = input.attackerLevel - input.defenderLevel;
  const mismatchPenaltyApplied =
    powerRatio >= MISMATCH_POWER_RATIO_THRESHOLD && levelGap >= MISMATCH_LEVEL_GAP_THRESHOLD;

  return {
    powerRatio,
    levelGap,
    mismatchPenaltyApplied,
    lootMultiplier: mismatchPenaltyApplied ? MISMATCH_LOOT_MULTIPLIER : 1,
    seasonPointMultiplier: mismatchPenaltyApplied ? MISMATCH_SEASON_POINTS_MULTIPLIER : 1,
  };
}
