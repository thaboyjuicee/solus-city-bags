import { PrismaClient } from "@prisma/client";
import { advanceChampionship } from "../lib/syndicates/championships";

export async function runChampionshipAdvance(prisma: PrismaClient, now: Date = new Date()) {
  const seasons = await prisma.championshipSeason.findMany({
    where: { status: { in: ["active", "pending"] } },
    orderBy: { startsAt: "asc" },
    select: { id: true },
  });

  const results = [];
  for (const season of seasons) {
    const updated = await prisma.$transaction((tx) => advanceChampionship(tx, season.id, now));
    if (updated) results.push(updated.id);
  }

  return results;
}

