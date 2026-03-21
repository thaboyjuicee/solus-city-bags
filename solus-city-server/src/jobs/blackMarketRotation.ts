import { PrismaClient } from "@prisma/client";
import { getActiveRotation } from "../lib/economy/blackMarket";

export async function runBlackMarketRotationJob(prisma: PrismaClient, now: Date = new Date()) {
  return getActiveRotation(prisma, now);
}
