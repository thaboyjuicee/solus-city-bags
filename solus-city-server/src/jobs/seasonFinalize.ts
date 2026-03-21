import { PrismaClient } from "@prisma/client";
import { createChampionshipBracket } from "../lib/syndicates/championships";
import { buildHallOfFameEntriesForSeason } from "../lib/seasons/history";
import { grantSeasonRewards } from "../lib/seasons/rewards";

function buildSnapshotRows(
  seasonId: string,
  rows: Array<{ userId: string; score: number }>,
  category: string,
  capturedAt: Date
) {
  return rows.map((row, index) => ({
    seasonId,
    userId: row.userId,
    rank: index + 1,
    score: row.score,
    category,
    capturedAt,
  }));
}

export async function finalizeSeason(prisma: PrismaClient, seasonId: string, now: Date = new Date()) {
  return prisma.$transaction(async (tx) => {
    const season = await tx.season.findUnique({ where: { id: seasonId } });
    if (!season || season.status !== "active" || season.endsAt > now) return null;

    const participations = await tx.seasonParticipation.findMany({
      where: { seasonId },
      orderBy: [{ score: "desc" }, { createdAt: "asc" }],
    });

    for (let index = 0; index < participations.length; index += 1) {
      await tx.seasonParticipation.update({
        where: { id: participations[index].id },
        data: { finalRank: index + 1 },
      });
    }

    await tx.seasonLeaderboardSnapshot.deleteMany({ where: { seasonId } });
    const pvpRows = [...participations].sort((left, right) => right.pvpScore - left.pvpScore || right.score - left.score || left.createdAt.getTime() - right.createdAt.getTime());
    const crimeRows = [...participations].sort((left, right) => right.crimeScore - left.crimeScore || right.score - left.score || left.createdAt.getTime() - right.createdAt.getTime());
    const missionRows = [...participations].sort((left, right) => right.missionScore - left.missionScore || right.score - left.score || left.createdAt.getTime() - right.createdAt.getTime());
    const capturedAt = new Date(now);

    const snapshotRows = [
      ...buildSnapshotRows(seasonId, participations.map((row) => ({ userId: row.userId, score: row.score })), "overall", capturedAt),
      ...buildSnapshotRows(seasonId, pvpRows.map((row) => ({ userId: row.userId, score: row.pvpScore })), "pvp", capturedAt),
      ...buildSnapshotRows(seasonId, crimeRows.map((row) => ({ userId: row.userId, score: row.crimeScore })), "crime", capturedAt),
      ...buildSnapshotRows(seasonId, missionRows.map((row) => ({ userId: row.userId, score: row.missionScore })), "mission", capturedAt),
    ];

    if (snapshotRows.length > 0) {
      await tx.seasonLeaderboardSnapshot.createMany({ data: snapshotRows });
    }

    const rewards = await grantSeasonRewards(tx, seasonId);
    await buildHallOfFameEntriesForSeason(tx, seasonId);
    const championship = await createChampionshipBracket(tx, seasonId, now);

    await tx.season.update({
      where: { id: seasonId },
      data: { status: "ended" },
    });

    return {
      seasonId,
      rewardsGranted: rewards.filter((entry) => entry.granted).length,
      championshipId: championship?.id ?? null,
    };
  });
}

export async function runSeasonFinalize(prisma: PrismaClient, now: Date = new Date()) {
  const seasons = await prisma.season.findMany({
    where: {
      status: "active",
      endsAt: { lte: now },
    },
    orderBy: { endsAt: "asc" },
  });

  const results = [];
  for (const season of seasons) {
    const finalized = await finalizeSeason(prisma, season.id, now);
    if (finalized) results.push(finalized);
  }
  return results;
}

