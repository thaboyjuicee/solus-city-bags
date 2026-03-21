import { HEAT_DECAY_INTERVAL_MINUTES, HEAT_DECAY_PER_INTERVAL, HEAT_MAX } from "../config/balance";
import { getWantedTierDisplay, type WantedTier } from "./wanted";

type HeatProfile = {
  heat: number;
  wantedTier: string;
  lastHeatDecayAt: Date;
};

export function clampHeat(value: number): number {
  return Math.max(0, Math.min(HEAT_MAX, Math.round(value)));
}

export function getWantedTier(heat: number): WantedTier {
  return getWantedTierDisplay(clampHeat(heat)).tier;
}

export function decayHeat<T extends HeatProfile>(profile: T, now: Date = new Date()) {
  const intervalMs = HEAT_DECAY_INTERVAL_MINUTES * 60 * 1000;
  const elapsedMs = now.getTime() - profile.lastHeatDecayAt.getTime();
  const ticks = Math.max(0, Math.floor(elapsedMs / intervalMs));

  if (ticks === 0) {
    return {
      heat: profile.heat,
      wantedTier: getWantedTier(profile.heat),
      lastHeatDecayAt: profile.lastHeatDecayAt,
      decayedBy: 0,
    };
  }

  const heat = clampHeat(profile.heat - ticks * HEAT_DECAY_PER_INTERVAL);
  return {
    heat,
    wantedTier: getWantedTier(heat),
    lastHeatDecayAt: new Date(profile.lastHeatDecayAt.getTime() + ticks * intervalMs),
    decayedBy: clampHeat(profile.heat) - heat,
  };
}

export function applyHeat<T extends HeatProfile>(profile: T, delta: number, now: Date = new Date()) {
  const decayed = decayHeat(profile, now);
  const heat = clampHeat(decayed.heat + delta);
  return {
    heat,
    wantedTier: getWantedTier(heat),
    lastHeatDecayAt: decayed.lastHeatDecayAt,
    heatChange: delta,
  };
}
