import {
  NEWBIE_PROTECTION_LEVEL_MAX,
  PVP_STEAL_MAX_PERCENT,
  PVP_STEAL_MIN_PERCENT,
  REPEAT_TARGET_LOOT_REDUCTION_MULTIPLIER,
} from "../config/balance";
import { HEAT_MAX } from "../config/balance";
import { applyLootProtection, type ActiveProtectionEffect } from "./protection";

export function getRepeatTargetLootMultiplier(recentAttackCount: number): number {
  return recentAttackCount > 0 ? REPEAT_TARGET_LOOT_REDUCTION_MULTIPLIER : 1;
}

type WalletLootInput = {
  availableWalletCash: number;
  defenderHeat: number;
  defenderLevel: number;
  recentAttackCount: number;
  protectionEffects: ActiveProtectionEffect[];
  defenderPenaltyType?: string | null;
  defenderPenaltyActive?: boolean;
};

export function calculateWalletCashSteal({
  availableWalletCash,
  defenderHeat,
  defenderLevel,
  recentAttackCount,
  protectionEffects,
  defenderPenaltyType,
  defenderPenaltyActive,
}: WalletLootInput) {
  if (availableWalletCash <= 0) {
    return {
      cashStolen: 0,
      lootProtectedAmount: 0,
      antiFarmPenaltyApplied: false,
      protectionTriggered: [] as string[],
      stealPercent: 0,
    };
  }

  const heatFactor = Math.max(0, Math.min(1, defenderHeat / HEAT_MAX));
  let stealPercent = PVP_STEAL_MIN_PERCENT + (PVP_STEAL_MAX_PERCENT - PVP_STEAL_MIN_PERCENT) * heatFactor;

  if (defenderLevel <= NEWBIE_PROTECTION_LEVEL_MAX) {
    stealPercent *= 0.75;
  }
  if (defenderPenaltyActive && defenderPenaltyType === "exposed") {
    stealPercent *= 1.15;
  }

  let baseAmount = availableWalletCash * stealPercent;
  const antiFarmPenaltyApplied = recentAttackCount > 0;
  if (antiFarmPenaltyApplied) {
    baseAmount *= getRepeatTargetLootMultiplier(recentAttackCount);
  }

  const protection = applyLootProtection(baseAmount, protectionEffects);
  const cashStolen = Math.min(
    Math.max(0, Math.floor(protection.finalAmount)),
    Math.max(0, Math.floor(availableWalletCash))
  );

  return {
    cashStolen,
    lootProtectedAmount: Math.min(
      Math.max(0, Math.floor(protection.protectedAmount)),
      Math.max(0, Math.floor(availableWalletCash - cashStolen))
    ),
    antiFarmPenaltyApplied,
    protectionTriggered: protection.triggered,
    stealPercent,
  };
}
