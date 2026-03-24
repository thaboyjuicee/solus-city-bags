import { Prisma, PrismaClient } from "@prisma/client";
import { INVENTORY_DEFAULT_DURABILITY } from "../config/balance";
import { HOSPITAL_PENALTY_DURATION_HOURS } from "../config/balance";
import { getPlayerPerkContext } from "../player/perks";

type PrismaLike = PrismaClient | Prisma.TransactionClient;

export function groupInventoryRows(
  rows: Array<{
    userId: string;
    itemId: string;
    qty: number;
    equipped?: boolean;
    durability?: number | null;
    expiresAt?: Date | null;
    sourceType?: string | null;
    item: {
      id: string;
      name: string;
      category: string;
      subCategory?: string | null;
      rarity?: string | null;
      slot?: string | null;
      description?: string | null;
      effectType?: string | null;
      effectValue?: number | null;
      effectDurationSecs?: number | null;
      tradable?: boolean;
      consumable?: boolean;
    };
  }>
) {
  const serialized = rows.map((row) => ({
    id: `${row.userId}:${row.itemId}`,
    inventoryItemId: `${row.userId}:${row.itemId}`,
    userId: row.userId,
    itemId: row.itemId,
    qty: row.qty,
    equipped: !!row.equipped,
    durability: row.durability ?? null,
    expiresAt: row.expiresAt ?? null,
    sourceType: row.sourceType ?? null,
    item: row.item,
  }));
  const protectionTypes = ["loot_reduction_percent", "decoy_wallet_percent", "heat_mask_percent"];

  const equipped = serialized.filter((row) => row.equipped);
  const consumables = serialized.filter((row) => !row.equipped && row.item.consumable);
  const protection = serialized.filter(
    (row) => !row.equipped && protectionTypes.includes(row.item.effectType ?? "")
  );
  const contraband = serialized.filter(
    (row) => !row.equipped && row.item.subCategory === "contraband"
  );
  const utilities = serialized.filter(
    (row) =>
      !row.equipped &&
      !row.item.consumable &&
      !protectionTypes.includes(row.item.effectType ?? "") &&
      row.item.slot === "utility" &&
      row.item.subCategory !== "contraband"
  );
  const general = serialized.filter(
    (row) =>
      !row.equipped &&
      !row.item.consumable &&
      !protectionTypes.includes(row.item.effectType ?? "") &&
      row.item.slot !== "utility" &&
      row.item.subCategory !== "contraband"
  );

  return {
    equipped,
    consumables,
    utilities,
    contraband,
    protection,
    general,
  };
}

export async function getInventoryState(prisma: PrismaLike, userId: string) {
  const inventory = await prisma.inventory.findMany({
    where: { userId, qty: { gt: 0 } },
    include: { item: true },
    orderBy: [{ equipped: "desc" }, { qty: "desc" }],
  });
  return groupInventoryRows(inventory);
}

function parseInventoryItemId(inventoryItemId: string) {
  const [userId, itemId] = inventoryItemId.split(":");
  if (!userId || !itemId) throw new Error("Invalid inventory item id");
  return { userId, itemId };
}

export async function equipItem(prisma: PrismaClient, userId: string, inventoryItemId: string) {
  const parsed = parseInventoryItemId(inventoryItemId);
  if (parsed.userId !== userId) throw new Error("Item does not belong to you");

  return prisma.$transaction(async (tx) => {
    const row = await tx.inventory.findUnique({
      where: { userId_itemId: { userId, itemId: parsed.itemId } },
      include: { item: true },
    });
    if (!row || row.qty < 1) throw new Error("Item not found");
    if (!row.item.slot) throw new Error("Item cannot be equipped");

    await tx.inventory.updateMany({
      where: {
        userId,
        equipped: true,
        item: { slot: row.item.slot },
      },
      data: { equipped: false },
    });

    await tx.inventory.update({
      where: { userId_itemId: { userId, itemId: parsed.itemId } },
      data: {
        equipped: true,
        durability: row.durability ?? INVENTORY_DEFAULT_DURABILITY,
      },
    });

    return getInventoryState(tx, userId);
  });
}

export async function unequipItem(prisma: PrismaClient, userId: string, inventoryItemId: string) {
  const parsed = parseInventoryItemId(inventoryItemId);
  if (parsed.userId !== userId) throw new Error("Item does not belong to you");

  return prisma.$transaction(async (tx) => {
    await tx.inventory.update({
      where: { userId_itemId: { userId, itemId: parsed.itemId } },
      data: { equipped: false },
    });

    return getInventoryState(tx, userId);
  });
}

export async function useInventoryItem(
  prisma: PrismaClient,
  userId: string,
  inventoryItemId: string,
  now: Date = new Date()
) {
  const parsed = parseInventoryItemId(inventoryItemId);
  if (parsed.userId !== userId) throw new Error("Item does not belong to you");

  return prisma.$transaction(async (tx) => {
    const [row, profile] = await Promise.all([
      tx.inventory.findUnique({
        where: { userId_itemId: { userId, itemId: parsed.itemId } },
        include: { item: true },
      }),
      tx.profile.findUnique({ where: { userId } }),
    ]);

    if (!row || row.qty < 1) throw new Error("Item not found");
    if (!profile) throw new Error("Profile not found");
    if (!row.item.consumable && !row.item.effectType) throw new Error("Item cannot be used");

    const perkContext = await getPlayerPerkContext(userId, tx);
    const recoveryBonus = Math.min(0.5, perkContext.effects.recovery_efficiency_percent ?? 0);
    const hospitalReductionBonus = Math.min(0.5, perkContext.effects.hospital_time_reduction_percent ?? 0);

    let profilePatch: Record<string, unknown> = {};
    let eventType = "inventory_use";

    if (row.item.effectType === "hospital_release_full") {
      profilePatch = {
        hospitalUntil: new Date("1970-01-01T00:00:00.000Z"),
        health: Math.min(profile.maxHealth, Math.ceil(profile.maxHealth * (0.5 + recoveryBonus))),
      };
    } else if (row.item.effectType === "hospital_release_partial") {
      const remainingMs = Math.max(0, profile.hospitalUntil.getTime() - now.getTime());
      const reductionMs = Math.floor(remainingMs * ((row.item.effectValue ?? 0.5) + hospitalReductionBonus));
      profilePatch = {
        hospitalUntil: new Date(Math.max(now.getTime(), profile.hospitalUntil.getTime() - reductionMs)),
        health: Math.min(profile.maxHealth, Math.max(1, Math.ceil(profile.maxHealth * (0.25 + recoveryBonus)))),
      };
    } else if (
      ["loot_reduction_percent", "decoy_wallet_percent", "heat_mask_percent"].includes(row.item.effectType ?? "")
    ) {
      await tx.protectionEffect.create({
        data: {
          userId,
          type: row.item.effectType ?? "utility",
          value: row.item.effectValue ?? 0,
          startsAt: now,
          endsAt: new Date(
            now.getTime() +
              (row.item.effectDurationSecs ?? HOSPITAL_PENALTY_DURATION_HOURS.shaken * 3600) * 1000
          ),
          sourceItemId: row.item.id,
        },
      });
      eventType = "inventory_protection";
    } else if (row.item.effectType === "contraband_drop") {
      profilePatch = { cash: profile.cash + 1000 };
    } else {
      throw new Error("Item use is not supported yet");
    }

    await tx.inventory.update({
      where: { userId_itemId: { userId, itemId: parsed.itemId } },
      data: {
        qty: { decrement: 1 },
        equipped: false,
        durability: row.item.slot
          ? Math.max(0, (row.durability ?? INVENTORY_DEFAULT_DURABILITY) - 5)
          : row.durability,
      },
    });

    if (Object.keys(profilePatch).length > 0) {
      await tx.profile.update({
        where: { userId },
        data: profilePatch,
      });
    }

    await tx.eventLog.create({
      data: {
        userId,
        type: eventType,
        message: `Used ${row.item.name}`,
        metadata: {
          inventoryItemId,
          itemId: row.item.id,
          effectType: row.item.effectType,
          effectValue: row.item.effectValue,
        },
      },
    });

    return {
      usedItem: { id: row.item.id, name: row.item.name },
      inventory: await getInventoryState(tx, userId),
    };
  });
}
