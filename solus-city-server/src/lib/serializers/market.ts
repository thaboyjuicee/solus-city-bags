export function serializeMarketRotation(rotation: {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  theme: string | null;
}) {
  return {
    id: rotation.id,
    startsAt: rotation.startsAt,
    endsAt: rotation.endsAt,
    status: rotation.status,
    theme: rotation.theme,
    secondsRemaining: Math.max(0, Math.floor((rotation.endsAt.getTime() - Date.now()) / 1000)),
  };
}

export function serializeMarketListing(listing: {
  id: string;
  basePrice: number;
  finalPrice: number;
  stock: number;
  remainingStock: number;
  riskPercent: number;
  requiredHeatMin: number;
  requiredLevelMin: number;
  listingType: string;
  active: boolean;
  item: {
    id: string;
    name: string;
    category: string;
    subCategory: string | null;
    description: string | null;
    effectType: string | null;
    effectValue: number | null;
    effectDurationSecs: number | null;
    riskType: string | null;
    riskValue: number | null;
    consumable: boolean;
    rarity?: string | null;
    slot?: string | null;
    tradable?: boolean;
    maxStack?: number | null;
  };
}) {
  return {
    id: listing.id,
    basePrice: listing.basePrice,
    finalPrice: listing.finalPrice,
    stock: listing.stock,
    remainingStock: listing.remainingStock,
    riskPercent: listing.riskPercent,
    requiredHeatMin: listing.requiredHeatMin,
    requiredLevelMin: listing.requiredLevelMin,
    listingType: listing.listingType,
    active: listing.active,
    item: {
      ...listing.item,
      rarity: listing.item.rarity ?? null,
      slot: listing.item.slot ?? null,
      tradable: listing.item.tradable ?? false,
      maxStack: listing.item.maxStack ?? null,
    },
  };
}
