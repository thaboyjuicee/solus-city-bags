import { PrismaClient } from "@prisma/client";
import { settleWar } from "../lib/syndicates/wars";

export async function runWarWindowTransitions(prisma: PrismaClient, now: Date = new Date()) {
  const wars = await prisma.syndicateWar.findMany({
    where: {
      status: "active",
      endsAt: { lte: now },
    },
  });

  for (const war of wars) {
    await prisma.$transaction((tx) => settleWar(tx, war.id));
  }
}
