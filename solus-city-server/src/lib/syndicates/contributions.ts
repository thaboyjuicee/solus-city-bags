import { Prisma } from "@prisma/client";
import { CONTRIBUTION_VAULT_DEPOSIT_MULTIPLIER, CONTRIBUTION_WAR_ACTION_MULTIPLIER } from "../config/balance";

export function applySyndicateVaultTransfer(
  walletCash: number,
  syndicateVaultCash: number,
  amount: number,
  direction: "deposit" | "withdraw"
) {
  if (amount <= 0) throw new Error("Amount must be positive");
  if (direction === "deposit") {
    if (amount > walletCash) throw new Error("Insufficient wallet cash");
    return {
      walletCash: walletCash - amount,
      syndicateVaultCash: syndicateVaultCash + amount,
    };
  }

  if (amount > syndicateVaultCash) throw new Error("Insufficient syndicate vault cash");
  return {
    walletCash: walletCash + amount,
    syndicateVaultCash: syndicateVaultCash - amount,
  };
}

export async function addContributionScore(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number
) {
  const membership = await tx.syndicateMember.findUnique({ where: { userId } });
  if (!membership) return null;

  return tx.syndicateMember.update({
    where: { id: membership.id },
    data: {
      contributionScore: { increment: Math.max(0, Math.round(amount)) },
      lastActiveAt: new Date(),
    },
  });
}

export async function addWarParticipation(
  tx: Prisma.TransactionClient,
  userId: string,
  points: number
) {
  const membership = await tx.syndicateMember.findUnique({ where: { userId } });
  if (!membership) return null;

  return tx.syndicateMember.update({
    where: { id: membership.id },
    data: {
      warParticipation: { increment: Math.max(0, Math.round(points * CONTRIBUTION_WAR_ACTION_MULTIPLIER)) },
      contributionScore: { increment: Math.max(0, Math.round(points)) },
      lastActiveAt: new Date(),
    },
  });
}

export async function addVaultContribution(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number
) {
  return addContributionScore(tx, userId, amount * CONTRIBUTION_VAULT_DEPOSIT_MULTIPLIER);
}

export async function addTerritoryContribution(
  tx: Prisma.TransactionClient,
  userId: string,
  territoryId: string,
  syndicateId: string,
  actionType: string,
  influenceDelta: number
) {
  await tx.territoryContribution.create({
    data: {
      territoryId,
      syndicateId,
      userId,
      actionType,
      influenceDelta,
    },
  });

  return addContributionScore(tx, userId, Math.max(1, influenceDelta));
}
