import { Prisma, PrismaClient } from "@prisma/client";
import {
  CHAMPIONSHIP_ADVANCE_BUFFER_MINUTES,
  CHAMPIONSHIP_QUALIFIER_COUNT,
  CHAMPIONSHIP_ROUND_DURATION_HOURS,
} from "../config/balance";

type PrismaLike = PrismaClient | Prisma.TransactionClient;

type QualifierSeed = {
  syndicateId: string;
  name: string;
  qualifyingPoints: number;
  warRating: number;
  territoryCount: number;
  seed: number;
};

export function buildChampionshipPairs(entries: QualifierSeed[]) {
  const pairs: Array<{ seedA: number; seedB: number }> = [];
  for (let left = 0, right = entries.length - 1; left < right; left += 1, right -= 1) {
    pairs.push({ seedA: entries[left].seed, seedB: entries[right].seed });
  }
  return pairs;
}

export function determineChampionshipWinner(input: {
  scoreA: number;
  scoreB: number;
  syndicateAId: string;
  syndicateBId: string;
  seedA: number;
  seedB: number;
}) {
  if (input.scoreA > input.scoreB) return input.syndicateAId;
  if (input.scoreB > input.scoreA) return input.syndicateBId;
  return input.seedA < input.seedB ? input.syndicateAId : input.syndicateBId;
}

function computeMatchScore(entry: { qualifyingPoints: number }, syndicate: { warRating: number; territoryCount: number }, round: number) {
  return entry.qualifyingPoints + Math.round(syndicate.warRating / 10) + syndicate.territoryCount * 4 + round * 3;
}

export async function getChampionshipQualifiers(prisma: PrismaLike, seasonId: string) {
  await prisma.season.findUnique({ where: { id: seasonId }, select: { id: true } });
  const syndicates = await prisma.syndicate.findMany({
    take: CHAMPIONSHIP_QUALIFIER_COUNT,
    orderBy: [{ seasonPoints: "desc" }, { territoryCount: "desc" }, { warRating: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      seasonPoints: true,
      warRating: true,
      territoryCount: true,
    },
  });

  return syndicates.map((entry, index) => ({
    syndicateId: entry.id,
    name: entry.name,
    qualifyingPoints: entry.seasonPoints,
    warRating: entry.warRating,
    territoryCount: entry.territoryCount,
    seed: index + 1,
  }));
}

export async function createChampionshipBracket(prisma: PrismaLike, seasonId: string, now: Date = new Date()) {
  const existing = await prisma.championshipSeason.findUnique({
    where: { seasonId },
    include: { entries: true, matches: true },
  });
  if (existing) return existing;

  const qualifiers = await getChampionshipQualifiers(prisma, seasonId);
  if (qualifiers.length < 2) return null;

  const startsAt = new Date(now);
  const endsAt = new Date(now.getTime() + CHAMPIONSHIP_ROUND_DURATION_HOURS * 60 * 60 * 1000);
  const bracket = await prisma.championshipSeason.create({
    data: {
      seasonId,
      status: "active",
      startsAt,
      endsAt,
      entries: {
        create: qualifiers.map((entry) => ({
          syndicateId: entry.syndicateId,
          seed: entry.seed,
          qualifyingPoints: entry.qualifyingPoints,
        })),
      },
    },
    include: { entries: true },
  });

  const pairs = buildChampionshipPairs(qualifiers);
  if (pairs.length > 0) {
    await prisma.championshipMatch.createMany({
      data: pairs.map((pair) => ({
        championshipSeasonId: bracket.id,
        round: 1,
        syndicateAId: qualifiers.find((entry) => entry.seed === pair.seedA)!.syndicateId,
        syndicateBId: qualifiers.find((entry) => entry.seed === pair.seedB)!.syndicateId,
        startsAt,
        endsAt,
        status: "active",
      })),
    });
  }

  return prisma.championshipSeason.findUnique({
    where: { id: bracket.id },
    include: { entries: true, matches: true },
  });
}

export async function getCurrentChampionship(prisma: PrismaLike) {
  return prisma.championshipSeason.findFirst({
    where: { status: { in: ["active", "pending"] } },
    orderBy: [{ startsAt: "desc" }],
    include: {
      season: true,
      entries: { include: { syndicate: true }, orderBy: { seed: "asc" } },
      matches: {
        include: {
          syndicateA: true,
          syndicateB: true,
          winnerSyndicate: true,
        },
        orderBy: [{ round: "asc" }, { startsAt: "asc" }],
      },
    },
  });
}

export async function settleChampionshipMatch(prisma: PrismaLike, matchId: string, now: Date = new Date()) {
  const match = await prisma.championshipMatch.findUnique({
    where: { id: matchId },
    include: {
      championshipSeason: { include: { entries: true } },
      syndicateA: true,
      syndicateB: true,
    },
  });
  if (!match || match.status === "completed" || match.endsAt > now) return match;

  const entryA = match.championshipSeason.entries.find((entry) => entry.syndicateId === match.syndicateAId);
  const entryB = match.championshipSeason.entries.find((entry) => entry.syndicateId === match.syndicateBId);
  if (!entryA || !entryB) return match;

  const scoreA = computeMatchScore(entryA, match.syndicateA, match.round);
  const scoreB = computeMatchScore(entryB, match.syndicateB, match.round);
  const winnerSyndicateId = determineChampionshipWinner({
    scoreA,
    scoreB,
    syndicateAId: match.syndicateAId,
    syndicateBId: match.syndicateBId,
    seedA: entryA.seed,
    seedB: entryB.seed,
  });

  return prisma.championshipMatch.update({
    where: { id: match.id },
    data: {
      scoreA,
      scoreB,
      winnerSyndicateId,
      status: "completed",
    },
    include: {
      syndicateA: true,
      syndicateB: true,
      winnerSyndicate: true,
    },
  });
}

export async function advanceChampionship(prisma: PrismaLike, championshipSeasonId: string, now: Date = new Date()) {
  const season = await prisma.championshipSeason.findUnique({
    where: { id: championshipSeasonId },
    include: {
      season: true,
      entries: { orderBy: { seed: "asc" } },
      matches: { orderBy: [{ round: "asc" }, { startsAt: "asc" }] },
    },
  });
  if (!season || season.status === "completed") return season;

  const bufferCutoff = new Date(now.getTime() - CHAMPIONSHIP_ADVANCE_BUFFER_MINUTES * 60 * 1000);
  const endedMatches = season.matches.filter((match) => match.status !== "completed" && match.endsAt <= bufferCutoff);
  for (const match of endedMatches) {
    await settleChampionshipMatch(prisma, match.id, now);
  }

  const refreshed = await prisma.championshipSeason.findUnique({
    where: { id: championshipSeasonId },
    include: {
      season: true,
      entries: { orderBy: { seed: "asc" } },
      matches: { orderBy: [{ round: "asc" }, { startsAt: "asc" }] },
    },
  });
  if (!refreshed) return null;

  const maxRound = refreshed.matches.reduce((max, match) => Math.max(max, match.round), 0);
  const currentRoundMatches = refreshed.matches.filter((match) => match.round === maxRound);
  const allCurrentRoundDone = currentRoundMatches.length > 0 && currentRoundMatches.every((match) => match.status === "completed");
  if (!allCurrentRoundDone) {
    return refreshed;
  }

  const existingNextRound = refreshed.matches.some((match) => match.round === maxRound + 1);
  if (existingNextRound) {
    return refreshed;
  }

  const winners = currentRoundMatches
    .map((match) => refreshed.entries.find((entry) => entry.syndicateId === match.winnerSyndicateId))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .sort((left, right) => left.seed - right.seed);

  if (winners.length === 1) {
    const winner = winners[0];
    await prisma.championshipSeason.update({ where: { id: refreshed.id }, data: { status: "completed" } });
    await prisma.hallOfFameEntry.create({
      data: {
        seasonId: refreshed.seasonId,
        category: "championship_champion",
        syndicateId: winner.syndicateId,
        rank: 1,
        displayJson: {
          category: "championship_champion",
          rank: 1,
          syndicateId: winner.syndicateId,
          title: "Championship Winner",
          seed: winner.seed,
        },
      },
    });
    return prisma.championshipSeason.findUnique({
      where: { id: refreshed.id },
      include: {
        season: true,
        entries: { include: { syndicate: true }, orderBy: { seed: "asc" } },
        matches: { include: { syndicateA: true, syndicateB: true, winnerSyndicate: true }, orderBy: [{ round: "asc" }, { startsAt: "asc" }] },
      },
    });
  }

  const nextStartsAt = new Date(now);
  const nextEndsAt = new Date(now.getTime() + CHAMPIONSHIP_ROUND_DURATION_HOURS * 60 * 60 * 1000);
  const nextPairs = buildChampionshipPairs(
    winners.map((entry) => ({
      syndicateId: entry.syndicateId,
      name: entry.syndicateId,
      qualifyingPoints: entry.qualifyingPoints,
      warRating: 0,
      territoryCount: 0,
      seed: entry.seed,
    }))
  );

  if (nextPairs.length > 0) {
    await prisma.championshipMatch.createMany({
      data: nextPairs.map((pair) => ({
        championshipSeasonId: refreshed.id,
        round: maxRound + 1,
        syndicateAId: winners.find((entry) => entry.seed === pair.seedA)!.syndicateId,
        syndicateBId: winners.find((entry) => entry.seed === pair.seedB)!.syndicateId,
        startsAt: nextStartsAt,
        endsAt: nextEndsAt,
        status: "active",
      })),
    });
  }

  return prisma.championshipSeason.findUnique({
    where: { id: refreshed.id },
    include: {
      season: true,
      entries: { include: { syndicate: true }, orderBy: { seed: "asc" } },
      matches: { include: { syndicateA: true, syndicateB: true, winnerSyndicate: true }, orderBy: [{ round: "asc" }, { startsAt: "asc" }] },
    },
  });
}

