import { Prisma, PrismaClient } from "@prisma/client";
import { PERK_BRANCH_MAX_TIER, PERK_POINT_LEVEL_INTERVAL } from "../config/balance";

type PrismaLike = PrismaClient | Prisma.TransactionClient;

export type PlayerPerkContext = {
  unlockedCodes: string[];
  branches: Record<string, string[]>;
  effects: Record<string, number>;
};

export function getEarnedPerkPoints(profile: { level: number }) {
  return Math.max(0, Math.floor(profile.level / PERK_POINT_LEVEL_INTERVAL));
}

export function getAvailablePerkPoints(profile: { level: number; availablePerkPoints?: number }, unlockedCount = 0) {
  const earned = getEarnedPerkPoints(profile);
  const derived = Math.max(0, earned - unlockedCount);
  return Math.max(profile.availablePerkPoints ?? 0, derived);
}

export async function getPlayerPerkContext(userId: string, prisma: PrismaLike): Promise<PlayerPerkContext> {
  const perks = await prisma.playerPerk.findMany({
    where: { userId },
    include: { perkDefinition: true },
  });

  const effects: Record<string, number> = {};
  const branches: Record<string, string[]> = {};

  for (const row of perks) {
    const def = row.perkDefinition;
    effects[def.effectType] = (effects[def.effectType] ?? 0) + def.effectValue;
    branches[def.branch] = [...(branches[def.branch] ?? []), def.code];
  }

  return {
    unlockedCodes: perks.map((row) => row.perkDefinition.code),
    branches,
    effects,
  };
}

function assertUnlockAllowed(
  perk: {
    id: string;
    active: boolean;
    tier: number;
    prerequisitePerkId: string | null;
  },
  unlockedPerkIds: Set<string>,
  availablePoints: number
) {
  if (!perk.active) throw new Error("Perk is inactive");
  if (perk.tier > PERK_BRANCH_MAX_TIER) throw new Error("Perk tier is unavailable");
  if (availablePoints < 1) throw new Error("No perk points available");
  if (unlockedPerkIds.has(perk.id)) throw new Error("Perk already unlocked");
  if (perk.prerequisitePerkId && !unlockedPerkIds.has(perk.prerequisitePerkId)) {
    throw new Error("Perk prerequisite not met");
  }
}

export async function unlockPerk(
  prisma: PrismaClient,
  userId: string,
  perkDefinitionId: string
) {
  return prisma.$transaction(async (tx) => {
    const [profile, perk, unlocked] = await Promise.all([
      tx.profile.findUnique({ where: { userId } }),
      tx.perkDefinition.findUnique({
        where: { id: perkDefinitionId },
        include: { prerequisitePerk: true },
      }),
      tx.playerPerk.findMany({ where: { userId } }),
    ]);

    if (!profile) throw new Error("Profile not found");
    if (!perk) throw new Error("Perk not found");

    const unlockedIds = new Set(unlocked.map((row) => row.perkDefinitionId));
    const availablePoints = getAvailablePerkPoints(profile, unlocked.length);
    assertUnlockAllowed(perk, unlockedIds, availablePoints);

    const created = await tx.playerPerk.create({
      data: { userId, perkDefinitionId },
      include: {
        perkDefinition: {
          include: {
            prerequisitePerk: {
              select: { id: true, code: true, name: true },
            },
          },
        },
      },
    });

    const updatedProfile = await tx.profile.update({
      where: { userId },
      data: { availablePerkPoints: Math.max(0, availablePoints - 1) },
    });

    return {
      unlocked: created,
      availablePoints: Math.max(0, getAvailablePerkPoints(updatedProfile, unlocked.length + 1)),
    };
  });
}
