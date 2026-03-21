import { PrismaClient } from "@prisma/client";
import { PROTECTION_EFFECT_TYPES } from "../config/game";

export type ActiveProtectionEffect = {
  id: string;
  type: string;
  value: number;
  startsAt: Date;
  endsAt: Date;
  sourceItemId?: string | null;
  sourceName?: string;
  sourceType: "effect" | "inventory";
};

export async function fetchActiveProtectionEffects(
  prisma: PrismaClient,
  userId: string,
  now: Date = new Date()
): Promise<ActiveProtectionEffect[]> {
  const [effects, inventoryItems] = await Promise.all([
    prisma.protectionEffect.findMany({
      where: { userId, startsAt: { lte: now }, endsAt: { gt: now } },
      include: { sourceItem: true },
    }),
    prisma.inventory.findMany({
      where: {
        userId,
        qty: { gt: 0 },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        item: { effectType: { in: [...PROTECTION_EFFECT_TYPES] } },
      },
      include: { item: true },
    }),
  ]);

  return [
    ...effects.map((effect) => ({
      id: effect.id,
      type: effect.type,
      value: effect.value,
      startsAt: effect.startsAt,
      endsAt: effect.endsAt,
      sourceItemId: effect.sourceItemId,
      sourceName: effect.sourceItem?.name,
      sourceType: "effect" as const,
    })),
    ...inventoryItems
      .filter((entry) => entry.item.effectType)
      .map((entry) => ({
        id: `${entry.userId}:${entry.itemId}`,
        type: entry.item.effectType!,
        value: entry.item.effectValue ?? 0,
        startsAt: now,
        endsAt: entry.expiresAt ?? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
        sourceItemId: entry.itemId,
        sourceName: entry.item.name,
        sourceType: "inventory" as const,
      })),
  ];
}

export function applyLootProtection(
  amount: number,
  effects: ActiveProtectionEffect[]
): {
  finalAmount: number;
  protectedAmount: number;
  triggered: string[];
} {
  let protectedAmount = 0;
  const triggered: string[] = [];

  for (const effect of effects) {
    if (effect.type === "loot_reduction_percent" || effect.type === "decoy_wallet_percent") {
      protectedAmount += amount * effect.value;
      triggered.push(effect.sourceName ?? effect.type);
    }
    if (effect.type === "decoy_wallet_flat") {
      protectedAmount += effect.value;
      triggered.push(effect.sourceName ?? effect.type);
    }
  }

  const finalAmount = Math.max(0, Math.floor(amount - protectedAmount));
  return {
    finalAmount,
    protectedAmount: Math.max(0, Math.floor(amount - finalAmount)),
    triggered,
  };
}
