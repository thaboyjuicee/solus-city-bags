import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { requireAuth } from "../lib/auth";
import { equipItem, getInventoryState, unequipItem, useInventoryItem } from "../lib/economy/items";

const inventoryBody = z.object({
  inventoryItemId: z.string().min(1),
});

export default async function inventoryRoutes(
  fastify: FastifyInstance,
  { prisma }: { prisma: PrismaClient }
) {
  fastify.get("/inventory", { preHandler: requireAuth }, async (request, reply) => {
    try {
      return reply.send(await getInventoryState(prisma, request.user.userId));
    } catch (err) {
      request.log.error(err, "/inventory error");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.post("/inventory/equip", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = inventoryBody.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Invalid input" });

    try {
      return reply.send({ inventory: await equipItem(prisma, request.user.userId, parsed.data.inventoryItemId) });
    } catch (err) {
      return reply.status(400).send({ error: err instanceof Error ? err.message : "Equip failed" });
    }
  });

  fastify.post("/inventory/unequip", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = inventoryBody.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Invalid input" });

    try {
      return reply.send({ inventory: await unequipItem(prisma, request.user.userId, parsed.data.inventoryItemId) });
    } catch (err) {
      return reply.status(400).send({ error: err instanceof Error ? err.message : "Unequip failed" });
    }
  });

  fastify.post("/inventory/use", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = inventoryBody.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Invalid input" });

    try {
      return reply.send(await useInventoryItem(prisma, request.user.userId, parsed.data.inventoryItemId));
    } catch (err) {
      return reply.status(400).send({ error: err instanceof Error ? err.message : "Use failed" });
    }
  });
}
