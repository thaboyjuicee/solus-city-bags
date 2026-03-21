import { Prisma, PrismaClient } from "@prisma/client";
import {
  REVENGE_BONUS_PERCENT,
  REVENGE_MIN_LOSS_THRESHOLD,
  REVENGE_WINDOW_HOURS,
} from "../config/balance";

type PrismaLike = PrismaClient | Prisma.TransactionClient;

type RevengeCreateInput = {
  victimUserId: string;
  attackerUserId: string;
  battleId: string;
  cashLost: number;
  hospitalized: boolean;
  now?: Date;
};

export function qualifiesForRevenge(cashLost: number, hospitalized: boolean) {
  return hospitalized || cashLost >= REVENGE_MIN_LOSS_THRESHOLD;
}

export async function maybeCreateRevengeMark(prisma: PrismaLike, input: RevengeCreateInput) {
  const now = input.now ?? new Date();
  if (
    input.victimUserId === input.attackerUserId ||
    !qualifiesForRevenge(input.cashLost, input.hospitalized)
  ) {
    return null;
  }

  await prisma.revengeMark.updateMany({
    where: {
      victimUserId: input.victimUserId,
      attackerUserId: input.attackerUserId,
      active: true,
    },
    data: { active: false, resolvedAt: now },
  });

  return prisma.revengeMark.create({
    data: {
      victimUserId: input.victimUserId,
      attackerUserId: input.attackerUserId,
      battleId: input.battleId,
      bonusPercent: REVENGE_BONUS_PERCENT,
      expiresAt: new Date(now.getTime() + REVENGE_WINDOW_HOURS * 60 * 60 * 1000),
    },
  });
}

export async function getActiveRevengeAgainst(
  prisma: PrismaLike,
  attackerId: string,
  victimId: string,
  now: Date = new Date()
) {
  return prisma.revengeMark.findFirst({
    where: {
      victimUserId: attackerId,
      attackerUserId: victimId,
      active: true,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function resolveRevenge(prisma: PrismaLike, markId: string, now: Date = new Date()) {
  return prisma.revengeMark.update({
    where: { id: markId },
    data: {
      active: false,
      resolvedAt: now,
    },
  });
}

export function getRevengeBonusPercent(mark: { bonusPercent: number } | null) {
  return mark?.bonusPercent ?? 0;
}
