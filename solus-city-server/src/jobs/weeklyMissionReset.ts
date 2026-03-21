import { PrismaClient } from "@prisma/client";
import { assignWeeklyMissions } from "../lib/missions/assign";

export async function runWeeklyMissionReset(prisma: PrismaClient, now: Date = new Date()) {
  await assignWeeklyMissions(prisma, now);
}
