import { PrismaClient } from "@prisma/client";
import { DAILY_MISSION_COUNT, WEEKLY_MISSION_COUNT } from "../config/balance";

export function getDailyMissionWindow(now: Date = new Date()) {
  const startsAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const endsAt = new Date(startsAt.getTime() + 24 * 60 * 60 * 1000);
  return { startsAt, endsAt };
}

export function getWeeklyMissionWindow(now: Date = new Date()) {
  const day = now.getUTCDay();
  const diff = (day + 6) % 7;
  const startsAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff, 0, 0, 0, 0));
  const endsAt = new Date(startsAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { startsAt, endsAt };
}

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pickDefinitions<T extends { id: string }>(definitions: T[], seed: string, count: number) {
  if (definitions.length <= count) return definitions;
  const start = hashString(seed) % definitions.length;
  const picks: T[] = [];
  const seen = new Set<string>();

  for (let index = 0; picks.length < count; index += 1) {
    const definition = definitions[(start + index) % definitions.length];
    if (!seen.has(definition.id)) {
      seen.add(definition.id);
      picks.push(definition);
    }
  }

  return picks;
}

async function assignMissionsForWindow(
  prisma: PrismaClient,
  userId: string,
  type: "daily" | "weekly",
  now: Date
) {
  const window = type === "daily" ? getDailyMissionWindow(now) : getWeeklyMissionWindow(now);
  const existing = await prisma.playerMission.count({
    where: {
      userId,
      startsAt: window.startsAt,
      endsAt: window.endsAt,
      missionDefinition: { type },
    },
  });

  if (existing > 0) return;

  const definitions = await prisma.missionDefinition.findMany({
    where: { type, active: true },
    orderBy: { code: "asc" },
  });

  const picked = pickDefinitions(
    definitions,
    `${userId}:${type}:${window.startsAt.toISOString()}`,
    type === "daily" ? DAILY_MISSION_COUNT : WEEKLY_MISSION_COUNT
  );

  if (picked.length === 0) return;

  await prisma.playerMission.createMany({
    data: picked.map((mission) => ({
      userId,
      missionDefinitionId: mission.id,
      startsAt: window.startsAt,
      endsAt: window.endsAt,
    })),
  });
}

export async function ensurePlayerMissionsAssigned(
  prisma: PrismaClient,
  userId: string,
  now: Date = new Date()
) {
  await assignMissionsForWindow(prisma, userId, "daily", now);
  await assignMissionsForWindow(prisma, userId, "weekly", now);
}

export async function assignDailyMissions(prisma: PrismaClient, now: Date = new Date()) {
  const users = await prisma.user.findMany({ select: { id: true } });
  for (const user of users) {
    await assignMissionsForWindow(prisma, user.id, "daily", now);
  }
}

export async function assignWeeklyMissions(prisma: PrismaClient, now: Date = new Date()) {
  const users = await prisma.user.findMany({ select: { id: true } });
  for (const user of users) {
    await assignMissionsForWindow(prisma, user.id, "weekly", now);
  }
}
