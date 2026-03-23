import type { Profile } from "@prisma/client";
import {
  HOSPITAL_SLS_RELEASE_DAILY_MULTIPLIER,
  HOSPITAL_SLS_RELEASE_USD_BASE,
} from "../config/balance";

type HospitalReleaseProfile = Pick<Profile, "hospitalUntil" | "hospitalReleaseCount" | "hospitalReleaseDate">;

function isSameUtcDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

export function getHospitalSlsReleasePricing(
  profile: HospitalReleaseProfile,
  slsPrice: number | null,
  now: Date = new Date()
) {
  const minutesRemaining = Math.max(0, Math.ceil((profile.hospitalUntil.getTime() - now.getTime()) / 60000));
  const sameDay =
    profile.hospitalReleaseDate != null && isSameUtcDay(profile.hospitalReleaseDate, now);
  const releaseCount = sameDay ? profile.hospitalReleaseCount : 0;
  const multiplier = Math.pow(HOSPITAL_SLS_RELEASE_DAILY_MULTIPLIER, releaseCount);
  const costUsd = HOSPITAL_SLS_RELEASE_USD_BASE * multiplier;
  const slsReleaseCost = slsPrice && slsPrice > 0 ? costUsd / slsPrice : null;

  return {
    minutesRemaining,
    releaseCount,
    multiplier,
    costUsd: Number(costUsd.toFixed(2)),
    slsReleaseCost: slsReleaseCost ? Number(slsReleaseCost.toFixed(6)) : null,
  };
}

export function getReleasedHealth(maxHealth: number, recoveryBonus = 0) {
  return Math.min(maxHealth, Math.max(1, Math.ceil(maxHealth * (0.25 + recoveryBonus))));
}
