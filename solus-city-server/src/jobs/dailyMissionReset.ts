import { PrismaClient } from "@prisma/client";
import { assignDailyMissions } from "../lib/missions/assign";

export async function runDailyMissionReset(prisma: PrismaClient, now: Date = new Date()) {
  await assignDailyMissions(prisma, now);
}
