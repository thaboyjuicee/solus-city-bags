import { PrismaClient } from "@prisma/client";
import { decayHeat } from "../lib/player/heat";

export async function runHeatDecay(prisma: PrismaClient, now: Date = new Date()) {
  const profiles = await prisma.profile.findMany({
    where: { heat: { gt: 0 } },
  });

  for (const profile of profiles) {
    const decayed = decayHeat(profile, now);
    if (decayed.decayedBy > 0) {
      await prisma.profile.update({
        where: { userId: profile.userId },
        data: {
          heat: decayed.heat,
          wantedTier: decayed.wantedTier,
          lastHeatDecayAt: decayed.lastHeatDecayAt,
        },
      });
    }
  }
}
