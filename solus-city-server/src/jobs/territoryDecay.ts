import { PrismaClient } from "@prisma/client";
import { TERRITORY_DECAY_INTERVAL_HOURS } from "../lib/config/balance";
import { decayTerritoryControl } from "../lib/syndicates/territories";

export async function runTerritoryDecay(prisma: PrismaClient, now: Date = new Date()) {
  const threshold = new Date(now.getTime() - TERRITORY_DECAY_INTERVAL_HOURS * 60 * 60 * 1000);
  const controls = await prisma.territoryControl.findMany({
    where: { lastDefendedAt: { lt: threshold } },
  });

  for (const control of controls) {
    await prisma.$transaction((tx) => decayTerritoryControl(tx, control));
  }
}
