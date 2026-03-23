import type { Profile } from "@prisma/client";
import { HOSPITAL_PENALTY_EFFECTS } from "../config/balance";

type HospitalPenaltyProfileLike = Pick<Profile, "hospitalExitPenaltyType" | "hospitalExitPenaltyUntil">;

export type HospitalPenaltyType = keyof typeof HOSPITAL_PENALTY_EFFECTS;

export type HospitalPenaltyEffects = {
  combatApMultiplier: number;
  combatDpMultiplier: number;
  crimeSuccessMultiplier: number;
  crimePayoutMultiplier: number;
  gymGainMultiplier: number;
  lootTakenMultiplier: number;
};

const NEUTRAL_EFFECTS: HospitalPenaltyEffects = {
  combatApMultiplier: 1,
  combatDpMultiplier: 1,
  crimeSuccessMultiplier: 1,
  crimePayoutMultiplier: 1,
  gymGainMultiplier: 1,
  lootTakenMultiplier: 1,
};

export function hasActiveHospitalExitPenalty(
  profile: HospitalPenaltyProfileLike | null | undefined,
  now: Date = new Date()
): boolean {
  return Boolean(
    profile?.hospitalExitPenaltyType &&
      profile?.hospitalExitPenaltyUntil &&
      profile.hospitalExitPenaltyUntil > now
  );
}

export function getActiveHospitalExitPenalty(
  profile: HospitalPenaltyProfileLike | null | undefined,
  now: Date = new Date()
): { type: HospitalPenaltyType; until: Date } | null {
  if (!hasActiveHospitalExitPenalty(profile, now)) {
    return null;
  }

  const type = profile?.hospitalExitPenaltyType;
  if (!type || !(type in HOSPITAL_PENALTY_EFFECTS)) {
    return null;
  }

  return {
    type: type as HospitalPenaltyType,
    until: profile!.hospitalExitPenaltyUntil!,
  };
}

export function getHospitalPenaltyEffectsByType(
  type: string | null | undefined,
  active = true
): HospitalPenaltyEffects {
  if (!active || !type || !(type in HOSPITAL_PENALTY_EFFECTS)) {
    return NEUTRAL_EFFECTS;
  }

  return HOSPITAL_PENALTY_EFFECTS[type as HospitalPenaltyType];
}

export function getHospitalPenaltyEffects(
  profile: HospitalPenaltyProfileLike | null | undefined,
  now: Date = new Date()
): HospitalPenaltyEffects {
  const activePenalty = getActiveHospitalExitPenalty(profile, now);
  if (!activePenalty) {
    return NEUTRAL_EFFECTS;
  }

  return getHospitalPenaltyEffectsByType(activePenalty.type, true);
}
