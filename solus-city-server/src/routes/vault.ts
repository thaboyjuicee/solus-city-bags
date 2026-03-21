import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { requireAuth } from "../lib/auth";
import { applyVaultTransfer } from "../lib/economy/vault";
import { ensurePlayerMissionsAssigned } from "../lib/missions/assign";
import { progressPlayerMissions } from "../lib/missions/progress";

const amountBody = z.object({
  amount: z.number().positive(),
});

export default async function vaultRoutes(
  fastify: FastifyInstance,
  { prisma }: { prisma: PrismaClient }
) {
  fastify.get("/vault", { preHandler: requireAuth }, async (request, reply) => {
    const profile = await prisma.profile.findUnique({ where: { userId: request.user.userId } });
    if (!profile) return reply.status(404).send({ error: "Profile not found" });
    return reply.send({ walletCash: profile.cash, vaultCash: profile.vaultCash });
  });

  fastify.post("/vault/deposit", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = amountBody.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Invalid input" });
    const { userId } = request.user;

    try {
      await ensurePlayerMissionsAssigned(prisma, userId);
      const profile = await prisma.profile.findUnique({ where: { userId } });
      if (!profile) return reply.status(404).send({ error: "Profile not found" });
      const balances = applyVaultTransfer(profile.cash, profile.vaultCash, parsed.data.amount, "deposit");

      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.profile.update({
          where: { userId },
          data: { cash: balances.walletCash, vaultCash: balances.vaultCash },
        });
        const missionUpdates = await progressPlayerMissions(tx, userId, [{ goalType: "vault_deposit", amount: 1 }]);
        await tx.eventLog.create({
          data: {
            userId,
            type: "vault_deposit",
            message: `Deposited $${parsed.data.amount.toLocaleString()} into the vault.`,
            metadata: { amount: parsed.data.amount, walletCash: balances.walletCash, vaultCash: balances.vaultCash },
          },
        });
        return { updated, missionUpdates };
      });

      return reply.send({ walletCash: result.updated.cash, vaultCash: result.updated.vaultCash, missionUpdates: result.missionUpdates });
    } catch (err) {
      return reply.status(400).send({ error: err instanceof Error ? err.message : "Vault deposit failed" });
    }
  });

  fastify.post("/vault/withdraw", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = amountBody.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Invalid input" });
    const { userId } = request.user;

    try {
      const profile = await prisma.profile.findUnique({ where: { userId } });
      if (!profile) return reply.status(404).send({ error: "Profile not found" });
      const balances = applyVaultTransfer(profile.cash, profile.vaultCash, parsed.data.amount, "withdraw");

      const updated = await prisma.$transaction(async (tx) => {
        const next = await tx.profile.update({
          where: { userId },
          data: { cash: balances.walletCash, vaultCash: balances.vaultCash },
        });
        await tx.eventLog.create({
          data: {
            userId,
            type: "vault_withdraw",
            message: `Withdrew $${parsed.data.amount.toLocaleString()} from the vault.`,
            metadata: { amount: parsed.data.amount, walletCash: balances.walletCash, vaultCash: balances.vaultCash },
          },
        });
        return next;
      });

      return reply.send({ walletCash: updated.cash, vaultCash: updated.vaultCash });
    } catch (err) {
      return reply.status(400).send({ error: err instanceof Error ? err.message : "Vault withdraw failed" });
    }
  });
}
