import { Prisma, PrismaClient } from "@prisma/client";

async function disbandSyndicate(tx: Prisma.TransactionClient, syndicateId: string) {
  await tx.syndicateWarAction.deleteMany({ where: { syndicateId } });

  const involvedWars = await tx.syndicateWar.findMany({
    where: {
      OR: [{ attackerSyndicateId: syndicateId }, { defenderSyndicateId: syndicateId }],
    },
    select: { id: true },
  });

  if (involvedWars.length > 0) {
    const warIds = involvedWars.map((war) => war.id);
    await tx.syndicateWarAction.deleteMany({ where: { warId: { in: warIds } } });
    await tx.syndicateWar.deleteMany({ where: { id: { in: warIds } } });
  }

  await tx.territoryContribution.deleteMany({ where: { syndicateId } });
  await tx.territoryControl.deleteMany({ where: { syndicateId } });
  await tx.championshipMatch.deleteMany({
    where: {
      OR: [{ syndicateAId: syndicateId }, { syndicateBId: syndicateId }, { winnerSyndicateId: syndicateId }],
    },
  });
  await tx.championshipEntry.deleteMany({ where: { syndicateId } });
  await tx.hallOfFameEntry.deleteMany({ where: { syndicateId } });
  await tx.syndicateMember.deleteMany({ where: { syndicateId } });
  await tx.syndicate.delete({ where: { id: syndicateId } });
}

async function detachUserFromSyndicate(tx: Prisma.TransactionClient, userId: string) {
  const membership = await tx.syndicateMember.findUnique({ where: { userId } });
  if (!membership) return;

  if (membership.role !== "leader") {
    await tx.syndicateMember.delete({ where: { id: membership.id } });
    return;
  }

  const memberCount = await tx.syndicateMember.count({ where: { syndicateId: membership.syndicateId } });
  if (memberCount <= 1) {
    await disbandSyndicate(tx, membership.syndicateId);
    return;
  }

  const nextLeader = await tx.syndicateMember.findFirst({
    where: { syndicateId: membership.syndicateId, userId: { not: userId } },
    orderBy: [{ contributionScore: "desc" }, { joinedAt: "asc" }],
  });

  if (!nextLeader) {
    await disbandSyndicate(tx, membership.syndicateId);
    return;
  }

  await tx.syndicate.update({
    where: { id: membership.syndicateId },
    data: { leaderId: nextLeader.userId },
  });

  await tx.syndicateMember.update({
    where: { id: nextLeader.id },
    data: { role: "leader", lastActiveAt: new Date() },
  });

  await tx.syndicateMember.delete({ where: { id: membership.id } });
}

export async function deleteAccount(prisma: PrismaClient, userId: string) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user || !user.profile) {
      throw new Error("Account not found");
    }

    await detachUserFromSyndicate(tx, userId);

    await tx.attackCooldown.deleteMany({
      where: {
        OR: [{ attackerId: userId }, { defenderId: userId }],
      },
    });

    await tx.revengeMark.deleteMany({
      where: {
        OR: [{ victimUserId: userId }, { attackerUserId: userId }],
      },
    });

    await tx.seasonLeaderboardSnapshot.updateMany({
      where: { userId },
      data: { userId: null },
    });

    await tx.hallOfFameEntry.updateMany({
      where: { userId },
      data: { userId: null },
    });

    await Promise.all([
      tx.territoryContribution.deleteMany({ where: { userId } }),
      tx.syndicateWarAction.deleteMany({ where: { userId } }),
      tx.prestigeHistory.deleteMany({ where: { userId } }),
      tx.seasonParticipation.deleteMany({ where: { userId } }),
      tx.playerPerk.deleteMany({ where: { userId } }),
      tx.playerMission.deleteMany({ where: { userId } }),
      tx.blackMarketPurchase.deleteMany({ where: { userId } }),
      tx.protectionEffect.deleteMany({ where: { userId } }),
      tx.slsTransaction.deleteMany({ where: { userId } }),
      tx.eventLog.deleteMany({ where: { userId } }),
      tx.attackLog.deleteMany({ where: { userId } }),
      tx.inventory.deleteMany({ where: { userId } }),
    ]);

    await tx.battle.deleteMany({
      where: {
        OR: [{ attackerId: userId }, { defenderId: userId }],
      },
    });

    await tx.profile.delete({ where: { userId } });
    await tx.user.delete({ where: { id: userId } });

    return { deletedUserId: userId };
  });
}
