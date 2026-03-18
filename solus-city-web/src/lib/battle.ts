// Shared types and helpers for the targets → battle-result flow.

export interface BattleResult {
  battleId: string;
  opponent: {
    id: string;
    type: "player" | "npc";
    name: string;
    level: number;
  };
  result: "win" | "loss";
  win: boolean;
  outcomeType: "win" | "loss" | "evaded";
  loot: number;
  rpChange: number;
  xpGained: number;
  attackerAP: number;
  defenderDP: number;
  pWin: number;
  roll: number;
  criticalHit: boolean;
  evadeChance: number;
  evadeRoll: number;
  critChance: number;
  critRoll: number;
  damageDealt: number;
  damageTaken: number;
  hospitalizedTarget: boolean;
  hospitalizedSelf: boolean;
  attackerHospitalized: boolean;
  defenderHospitalized: boolean;
  eventTimestamp: string;
  updatedProfile: {
    cash: number;
    rp: number;
    energy: number;
    health: number;
    maxHealth: number;
    level: number;
    xp: number;
    ap: number;
    dp: number;
  };
}

// sessionStorage key used to hand the result from targets → battle-result page
export const BATTLE_RESULT_KEY = "solus_city_battle_result";

// Ported verbatim from TargetsScreen.tsx / BattleResultScreen.tsx
export function formatHospitalMessage(recoverAt?: string): string {
  if (!recoverAt) return "You are in the hospital.";

  const msUntil = new Date(recoverAt).getTime() - Date.now();
  const minsUntil = Math.ceil(Math.max(0, msUntil) / 60000);
  const timeString = new Date(recoverAt).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  if (minsUntil <= 0) return "You are in the hospital. It should clear automatically.";
  return `You are in hospital. You can attack again in about ${minsUntil} minute${
    minsUntil === 1 ? "" : "s"
  } (until ${timeString}).`;
}
