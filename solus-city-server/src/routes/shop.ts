import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { requireAuth } from "../lib/auth";
import { applyIncome, applyHappiness, computeCombatStats } from "../lib/game";
import { MAX_BUY_QTY } from "../lib/constants";

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
  // GET /shop/items — list all items with owned qty
  fastify.get("/shop/items", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;
    try {
      const [items, inventory, profile, beforeStats] = await Promise.all([
        prisma.item.findMany({ orderBy: [{ category: "asc" }, { price: "asc" }] }),
        prisma.inventory.findMany({ where: { userId } }),
        prisma.profile.findUnique({ where: { userId } }),
        computeCombatStats(userId, prisma),
      ]);
      if (!profile) return reply.status(404).send({ error: "Profile not found" });
      const ownedMap = new Map(inventory.map((inv) => [inv.itemId, inv.qty]));

      const enriched = items.map((item) => {
        const owned = ownedMap.get(item.id) ?? 0;
        const projectedQty = owned + 1;
        const apDelta = item.atk;
        const dpDelta = item.def;

        return {
          id: item.id,
          category: item.category,
          name: item.name,
          atk: item.atk,
          def: item.def,
          speed: item.speed,
          dex: item.dex,
          price: item.price,
          levelRequirement: item.levelRequirement,
          rarity: item.rarity,
          description: item.description,
          stackable: item.stackable,
          isUnique: item.isUnique,
          owned,
          locked: profile.level < item.levelRequirement,
          powerPreview: {
            apNow: beforeStats.totalStats.ap,
            apAfterOne: beforeStats.totalStats.ap + apDelta,
            dpNow: beforeStats.totalStats.dp,
            dpAfterOne: beforeStats.totalStats.dp + dpDelta,
            projectedQty,
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

  // POST /shop/buy — purchase units
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
      const totalCost = item.price * qty;

      const updatedProfile = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "userId" FROM "Profile" WHERE "userId" = ${userId} FOR UPDATE`;

        const profile = await tx.profile.findUnique({ where: { userId } });
        if (!profile) {
          throw new ShopRouteError(404, "Profile not found");
        }
        if (profile.level < item.levelRequirement) {
          throw new ShopRouteError(400, `Requires level ${item.levelRequirement}`);
        }

        const existing = await tx.inventory.findUnique({ where: { userId_itemId: { userId, itemId } } });
        if (item.isUnique && (existing?.qty ?? 0) > 0) {
          throw new ShopRouteError(400, "Unique item already owned");
        }

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
          update: { qty: { increment: qty } },
          create: { userId, itemId, qty },
        });

        await tx.eventLog.create({
          data: {
            userId,
            type: item.category === "equipment" ? "bought_equipment" : "shop",
            message: `Bought ${qty}x ${item.name}`,
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
          atk: item.atk,
          def: item.def,
          speed: item.speed,
          dex: item.dex,
          price: item.price,
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
