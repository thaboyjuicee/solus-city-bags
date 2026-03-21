import { Prisma } from "@prisma/client";
import {
  WAR_MAX_CONCURRENT,
  WAR_POINT_BATTLE_HOSPITALIZE,
  WAR_POINT_BATTLE_WIN,
  WAR_POINT_NODE_SECURE,
  WAR_POINT_SUPPLY_DELIVER,
  WAR_UNDERDOG_BONUS_MULTIPLIER,
  WAR_WINDOW_HOURS,
} from "../config/balance";
import { applyTerritoryInfluence } from "./territories";

export async function getActiveWarForSyndicates(
  tx: Prisma.TransactionClient,
  attackerSyndicateId: string,
  defenderSyndicateId: string,
  now: Date = new Date()
) {
  return tx.syndicateWar.findFirst({
    where: {
      status: "active",
      startsAt: { lte: now },
      endsAt: { gt: now },
      OR: [
        { attackerSyndicateId, defenderSyndicateId },
        { attackerSyndicateId: defenderSyndicateId, defenderSyndicateId: attackerSyndicateId },
      ],
    },
    include: { territory: true },
  });
}

export async function createWar(
  tx: Prisma.TransactionClient,
  attackerSyndicateId: string,
  defenderSyndicateId: string,
  territoryId?: string | null,
  now: Date = new Date()
) {
  const activeCount = await tx.syndicateWar.count({
    where: {
      status: "active",
      OR: [
        { attackerSyndicateId },
        { defenderSyndicateId: attackerSyndicateId },
        { attackerSyndicateId: defenderSyndicateId },
        { defenderSyndicateId },
      ],
    },
  });
  if (activeCount >= WAR_MAX_CONCURRENT) throw new Error("War capacity reached");

  const startsAt = now;
  const endsAt = new Date(now.getTime() + WAR_WINDOW_HOURS * 60 * 60 * 1000);

  return tx.syndicateWar.create({
    data: {
      attackerSyndicateId,
      defenderSyndicateId,
      territoryId: territoryId ?? null,
      status: "active",
      startsAt,
      endsAt,
    },
    include: { territory: true, attackerSyndicate: true, defenderSyndicate: true },
  });
}

export function getWarActionPoints(actionType: string) {
  if (actionType === "supply_deliver") return WAR_POINT_SUPPLY_DELIVER;
  if (actionType === "node_secure") return WAR_POINT_NODE_SECURE;
  return 0;
}

export function calculateBattleWarPoints(hospitalizedTarget: boolean, underdog: boolean) {
  let points = WAR_POINT_BATTLE_WIN + (hospitalizedTarget ? WAR_POINT_BATTLE_HOSPITALIZE : 0);
  if (underdog) points = Math.round(points * WAR_UNDERDOG_BONUS_MULTIPLIER);
  return points;
}

export function getBattleWarRewardMultiplier(options: {
  repeatPenaltyApplied: boolean;
  mismatchPenaltyApplied: boolean;
}) {
  if (options.repeatPenaltyApplied && options.mismatchPenaltyApplied) return 0.25;
  if (options.repeatPenaltyApplied || options.mismatchPenaltyApplied) return 0.5;
  return 1;
}

export function computeWarWinnerSyndicateId(
  attackerScore: number,
  defenderScore: number,
  attackerSyndicateId: string,
  defenderSyndicateId: string
) {
  if (attackerScore === defenderScore) return null;
  return attackerScore > defenderScore ? attackerSyndicateId : defenderSyndicateId;
}

export async function recordWarAction(
  tx: Prisma.TransactionClient,
  warId: string,
  userId: string,
  syndicateId: string,
  actionType: string,
  metadata?: Prisma.InputJsonValue
) {
  const war = await tx.syndicateWar.findUnique({ where: { id: warId } });
  if (!war || war.status !== "active") throw new Error("War is not active");

  const points = getWarActionPoints(actionType);
  if (points <= 0) throw new Error("Invalid war action");

  const updated = await tx.syndicateWar.update({
    where: { id: warId },
    data:
      war.attackerSyndicateId === syndicateId
        ? { attackerScore: { increment: points } }
        : { defenderScore: { increment: points } },
  });

  await tx.syndicateWarAction.create({
    data: {
      warId,
      userId,
      syndicateId,
      actionType,
      points,
      metadata,
    },
  });

  if (war.territoryId && actionType === "node_secure") {
    await applyTerritoryInfluence(tx, war.territoryId, syndicateId, points);
  }

  return { updatedWar: updated, points };
}

export async function awardBattleWarPoints(
  tx: Prisma.TransactionClient,
  warId: string,
  attackerSyndicateId: string,
  winnerSyndicateId: string,
  hospitalizedTarget: boolean,
  options: {
    repeatPenaltyApplied: boolean;
    mismatchPenaltyApplied: boolean;
  } = {
    repeatPenaltyApplied: false,
    mismatchPenaltyApplied: false,
  }
) {
  const war = await tx.syndicateWar.findUnique({ where: { id: warId } });
  if (!war || war.status !== "active") return { points: 0, territoryImpact: 0 };

  const underdog =
    (winnerSyndicateId === war.attackerSyndicateId ? war.attackerScore : war.defenderScore) <
    (winnerSyndicateId === war.attackerSyndicateId ? war.defenderScore : war.attackerScore);
  const points = Math.max(
    1,
    Math.round(
      calculateBattleWarPoints(hospitalizedTarget, underdog) *
        getBattleWarRewardMultiplier(options)
    )
  );

  await tx.syndicateWar.update({
    where: { id: warId },
    data:
      winnerSyndicateId === war.attackerSyndicateId
        ? { attackerScore: { increment: points } }
        : { defenderScore: { increment: points } },
  });

  let territoryImpact = 0;
  if (war.territoryId) {
    territoryImpact = hospitalizedTarget ? 6 : 3;
    await applyTerritoryInfluence(tx, war.territoryId, winnerSyndicateId, territoryImpact);
  }

  return { points, territoryImpact };
}

export async function settleWar(tx: Prisma.TransactionClient, warId: string) {
  const war = await tx.syndicateWar.findUnique({ where: { id: warId } });
  if (!war) throw new Error("War not found");

  const winnerSyndicateId = computeWarWinnerSyndicateId(
    war.attackerScore,
    war.defenderScore,
    war.attackerSyndicateId,
    war.defenderSyndicateId
  );

  const settled = await tx.syndicateWar.update({
    where: { id: warId },
    data: {
      status: "ended",
      winnerSyndicateId,
    },
  });

  if (winnerSyndicateId) {
    await tx.syndicate.update({
      where: { id: winnerSyndicateId },
      data: {
        seasonPoints: { increment: 15 },
        warRating: { increment: 10 },
      },
    });
    const loserId = winnerSyndicateId === war.attackerSyndicateId ? war.defenderSyndicateId : war.attackerSyndicateId;
    await tx.syndicate.update({
      where: { id: loserId },
      data: { warRating: { decrement: 8 } },
    });
  }

  return settled;
}
