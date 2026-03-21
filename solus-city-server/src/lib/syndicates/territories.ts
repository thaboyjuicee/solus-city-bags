import { Prisma, TerritoryControl } from "@prisma/client";
import {
  TERRITORY_DECAY_AMOUNT,
  TERRITORY_INFLUENCE_DONATE_CASH,
  TERRITORY_INFLUENCE_LOCAL_TASK,
  TERRITORY_INFLUENCE_WAR_CONTROL,
} from "../config/balance";

export async function getTerritoryOwner(tx: Prisma.TransactionClient, territoryId: string) {
  return tx.territoryControl.findUnique({
    where: { territoryId },
    include: { syndicate: true, territory: true },
  });
}

export async function getTerritoryBonusForSyndicate(
  tx: Prisma.TransactionClient,
  syndicateId: string
) {
  const controls = await tx.territoryControl.findMany({
    where: { syndicateId },
    include: { territory: true },
  });

  return controls.map((control) => ({
    territoryId: control.territoryId,
    territoryName: control.territory.name,
    bonusType: control.territory.bonusType,
    bonusValue: control.territory.bonusValue,
  }));
}

export function getInfluenceDeltaForAction(actionType: string, amount = 0) {
  if (actionType === "donate_cash") return TERRITORY_INFLUENCE_DONATE_CASH + Math.min(10, Math.floor(amount / 1000));
  if (actionType === "complete_local_task") return TERRITORY_INFLUENCE_LOCAL_TASK;
  if (actionType === "war_control_action") return TERRITORY_INFLUENCE_WAR_CONTROL;
  return 0;
}

export function computeTerritoryInfluenceOutcome(
  currentOwnerSyndicateId: string | null,
  currentInfluence: number,
  actingSyndicateId: string,
  influenceDelta: number
) {
  if (!currentOwnerSyndicateId) {
    return {
      captured: true,
      ownerSyndicateId: actingSyndicateId,
      nextInfluence: influenceDelta,
      decayState: "stable",
    };
  }

  if (currentOwnerSyndicateId === actingSyndicateId) {
    return {
      captured: false,
      ownerSyndicateId: actingSyndicateId,
      nextInfluence: currentInfluence + influenceDelta,
      decayState: "stable",
    };
  }

  const contestedInfluence = Math.max(0, currentInfluence - influenceDelta);
  if (contestedInfluence <= 0) {
    return {
      captured: true,
      ownerSyndicateId: actingSyndicateId,
      nextInfluence: influenceDelta,
      decayState: "contested",
    };
  }

  return {
    captured: false,
    ownerSyndicateId: currentOwnerSyndicateId,
    nextInfluence: contestedInfluence,
    decayState: "contested",
  };
}

export async function settleTerritoryControl(
  tx: Prisma.TransactionClient,
  territoryId: string,
  syndicateId: string,
  influence: number,
  now: Date = new Date()
) {
  const existing = await tx.territoryControl.findUnique({ where: { territoryId } });

  if (!existing) {
    await tx.territoryControl.create({
      data: {
        territoryId,
        syndicateId,
        influence,
        capturedAt: now,
        lastDefendedAt: now,
      },
    });
    await tx.syndicate.update({
      where: { id: syndicateId },
      data: { territoryCount: { increment: 1 } },
    });
    return true;
  }

  if (existing.syndicateId === syndicateId) {
    await tx.territoryControl.update({
      where: { id: existing.id },
      data: {
        influence,
        lastDefendedAt: now,
        decayState: "stable",
      },
    });
    return false;
  }

  await tx.territoryControl.update({
    where: { id: existing.id },
    data: {
      syndicateId,
      influence,
      capturedAt: now,
      lastDefendedAt: now,
      decayState: "contested",
    },
  });

  await tx.syndicate.update({
    where: { id: existing.syndicateId },
    data: { territoryCount: { decrement: 1 } },
  });
  await tx.syndicate.update({
    where: { id: syndicateId },
    data: { territoryCount: { increment: 1 } },
  });
  return true;
}

export async function applyTerritoryInfluence(
  tx: Prisma.TransactionClient,
  territoryId: string,
  syndicateId: string,
  influenceDelta: number,
  now: Date = new Date()
) {
  const current = await tx.territoryControl.findUnique({ where: { territoryId } });
  const outcome = computeTerritoryInfluenceOutcome(
    current?.syndicateId ?? null,
    current?.influence ?? 0,
    syndicateId,
    influenceDelta
  );

  if (!current) {
    await settleTerritoryControl(tx, territoryId, outcome.ownerSyndicateId, outcome.nextInfluence, now);
    return { captured: !current, territoryImpact: influenceDelta };
  }

  if (outcome.captured) {
    await settleTerritoryControl(tx, territoryId, syndicateId, influenceDelta, now);
    return { captured: true, territoryImpact: influenceDelta };
  }

  if (current.syndicateId === syndicateId) {
    await settleTerritoryControl(tx, territoryId, syndicateId, outcome.nextInfluence, now);
    return { captured: false, territoryImpact: influenceDelta };
  }

  await tx.territoryControl.update({
    where: { id: current.id },
    data: {
      influence: outcome.nextInfluence,
      decayState: outcome.decayState,
    },
  });

  return { captured: false, territoryImpact: influenceDelta };
}

export async function decayTerritoryControl(
  tx: Prisma.TransactionClient,
  control: TerritoryControl
) {
  const nextInfluence = Math.max(0, control.influence - TERRITORY_DECAY_AMOUNT);
  if (nextInfluence === 0) {
    await tx.territoryControl.delete({ where: { id: control.id } });
    await tx.syndicate.update({
      where: { id: control.syndicateId },
      data: { territoryCount: { decrement: 1 } },
    });
    return null;
  }

  return tx.territoryControl.update({
    where: { id: control.id },
    data: {
      influence: nextInfluence,
      decayState: "decaying",
    },
  });
}
