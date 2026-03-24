import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { requireAuth } from "../lib/auth";
import { applyIncome, applyHappiness, computeCombatBreakdownFromState, computeCombatStats } from "../lib/game";
import { MAX_BUY_QTY } from "../lib/constants";
import { getPlayerPerkContext } from "../lib/player/perks";

class ShopRouteError extends Error {
  status: number;
  payload: { error: string };

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.payload = { error: message };
  }
}

const buyBody = z.object({
  itemId: z.string().min(1),
  qty: z.number().int().min(1).max(MAX_BUY_QTY),
});

export default async function shopRoutes(
  fastify: FastifyInstance,
  { prisma }: { prisma: PrismaClient }
) {
  fastify.get("/shop/items", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;
    try {
      const [items, inventory, profile, member, perkContext] = await Promise.all([
        prisma.item.findMany({ where: { blackMarketOnly: false }, orderBy: [{ category: "asc" }, { price: "asc" }] }),
        prisma.inventory.findMany({ where: { userId }, include: { item: true } }),
        prisma.profile.findUnique({ where: { userId } }),
        prisma.syndicateMember.findUnique({ where: { userId } }),
        getPlayerPerkContext(userId, prisma),
      ]);
      if (!profile) return reply.status(404).send({ error: "Profile not found" });
      const ownedMap = new Map(inventory.map((inv) => [inv.itemId, inv.qty]));
      const beforeStats = computeCombatBreakdownFromState({
        profile,
        inventory,
        hasSyndicateBuff: !!member,
        perkEffects: perkContext.effects,
      });

      const enriched = items.map((item) => {
        const previewInventory = inventory.map((row) => ({
          ...row,
          item: { ...row.item },
        }));
        const existingIndex = previewInventory.findIndex((row) => row.itemId === item.id);
        const shouldAutoEquip =
          !!item.slot &&
          !previewInventory.some((row) => row.equipped && row.item.slot === item.slot);

        if (existingIndex >= 0) {
          previewInventory[existingIndex] = {
            ...previewInventory[existingIndex],
            qty: previewInventory[existingIndex].qty + 1,
            equipped: previewInventory[existingIndex].equipped || shouldAutoEquip,
          };
        } else {
          previewInventory.push({
            userId,
            itemId: item.id,
            qty: 1,
            expiresAt: null,
            sourceType: "shop_preview",
            equipped: shouldAutoEquip,
            durability: item.slot ? 100 : null,
            item,
          });
        }

        const afterStats = computeCombatBreakdownFromState({
          profile,
          inventory: previewInventory,
          hasSyndicateBuff: !!member,
          perkEffects: perkContext.effects,
        });

        return {
        id: item.id,
        category: item.category,
        subCategory: item.subCategory,
        name: item.name,
        atk: item.atk,
        def: item.def,
        speed: item.speed,
        dex: item.dex,
        price: item.price,
        levelRequirement: item.levelRequirement,
        rarity: item.rarity,
        slot: item.slot,
        tradable: item.tradable,
        maxStack: item.maxStack,
        description: item.description,
        consumable: item.consumable,
        effectType: item.effectType,
        effectValue: item.effectValue,
        stackable: item.stackable,
        isUnique: item.isUnique,
        owned: ownedMap.get(item.id) ?? 0,
        locked: profile.level < item.levelRequirement,
        powerPreview: {
          apNow: beforeStats.totalStats.ap,
          apAfterOne: afterStats.totalStats.ap,
          dpNow: beforeStats.totalStats.dp,
          dpAfterOne: afterStats.totalStats.dp,
        },
      };
      });

      return reply.send({
        units: enriched.filter((i) => i.category === "unit"),
        equipment: enriched.filter((i) => i.category === "equipment"),
        all: enriched,
      });
    } catch (err) {
      request.log.error(err, "/shop/items error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.post("/shop/buy", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;
    const parsed = buyBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    }
    const { itemId, qty } = parsed.data;

    try {
      const item = await prisma.item.findUnique({ where: { id: itemId } });
      if (!item) return reply.status(404).send({ error: "Item not found" });
      if (item.blackMarketOnly) return reply.status(400).send({ error: "Only available on the black market" });
      const totalCost = item.price * qty;

      const updatedProfile = await prisma.$transaction(async (tx) => {
        const profile = await tx.profile.findUnique({ where: { userId } });
        if (!profile) throw new ShopRouteError(404, "Profile not found");
        if (profile.level < item.levelRequirement) throw new ShopRouteError(400, `Requires level ${item.levelRequirement}`);

        const existing = await tx.inventory.findUnique({ where: { userId_itemId: { userId, itemId } } });
        if (item.isUnique && (existing?.qty ?? 0) > 0) throw new ShopRouteError(400, "Unique item already owned");
        if (item.maxStack && (existing?.qty ?? 0) + qty > item.maxStack) throw new ShopRouteError(400, `Max stack is ${item.maxStack}`);

        const incomeUpdate = applyIncome(profile);
        const happinessUpdate = applyHappiness({ ...profile, ...incomeUpdate });
        const currentCash = profile.cash + (incomeUpdate.cash! - profile.cash);
        if (currentCash < totalCost) {
          await tx.profile.update({ where: { userId }, data: { ...incomeUpdate, ...happinessUpdate } });
          throw new ShopRouteError(400, "Insufficient cash");
        }

        const updated = await tx.profile.update({
          where: { userId },
          data: { ...incomeUpdate, ...happinessUpdate, cash: currentCash - totalCost },
        });

        await tx.inventory.upsert({
          where: { userId_itemId: { userId, itemId } },
          update: { qty: { increment: qty }, sourceType: "shop", durability: item.slot ? 100 : null },
          create: { userId, itemId, qty, sourceType: "shop", durability: item.slot ? 100 : null },
        });

        if (item.slot) {
          const equippedSameSlot = await tx.inventory.findFirst({
            where: { userId, equipped: true, item: { slot: item.slot } },
          });
          if (!equippedSameSlot) {
            await tx.inventory.update({
              where: { userId_itemId: { userId, itemId } },
              data: { equipped: true },
            });
          }
        }

        await tx.eventLog.create({
          data: {
            userId,
            type: item.category === "equipment" ? "bought_equipment" : "shop",
            message: `Bought ${qty}x ${item.name}`,
            metadata: { itemId: item.id, qty, pricePaid: totalCost, slot: item.slot, rarity: item.rarity },
          },
        });

        return updated;
      });

      const afterStats = await computeCombatStats(userId, prisma);

      return reply.send({
        success: true,
        newCash: updatedProfile.cash,
        item: {
          id: item.id,
          name: item.name,
          category: item.category,
          subCategory: item.subCategory,
          atk: item.atk,
          def: item.def,
          speed: item.speed,
          dex: item.dex,
          price: item.price,
          rarity: item.rarity,
          slot: item.slot,
          tradable: item.tradable,
          maxStack: item.maxStack,
          effectType: item.effectType,
          effectValue: item.effectValue,
        },
        qty,
        newCombat: {
          ap: afterStats.totalStats.ap,
          dp: afterStats.totalStats.dp,
        },
      });
    } catch (err) {
      if (err instanceof ShopRouteError) {
        return reply.status(err.status).send(err.payload);
      }
      request.log.error(err, "/shop/buy error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });
}
