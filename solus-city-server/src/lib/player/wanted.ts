import { WANTED_TIER_BANDS } from "../config/game";

export type WantedTier = (typeof WANTED_TIER_BANDS)[number]["tier"];

export function getWantedTierInfo(tier: WantedTier) {
  return WANTED_TIER_BANDS.find((band) => band.tier === tier) ?? WANTED_TIER_BANDS[0];
}

export function getWantedTierDisplay(heat: number) {
  return WANTED_TIER_BANDS.find((band) => heat >= band.min && heat <= band.max) ?? WANTED_TIER_BANDS[0];
}
