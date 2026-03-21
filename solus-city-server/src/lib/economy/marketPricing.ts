import { BLACK_MARKET_STING_MAX_PERCENT } from "../config/balance";

export function calculateBlackMarketPrice(
  basePrice: number,
  riskPercent: number,
  listingType: string
): number {
  const riskMarkup = Math.min(riskPercent, BLACK_MARKET_STING_MAX_PERCENT) / 100;
  const listingMarkup = listingType === "bundle" ? 0.22 : listingType === "consumable" ? 0.12 : 0.16;
  return Math.max(1, Math.round(basePrice * (1 + listingMarkup + riskMarkup)));
}

export function calculateBlackMarketHeatGain(riskPercent: number, itemRiskValue: number = 0): number {
  return Math.max(1, Math.round((riskPercent + itemRiskValue) / 6));
}
