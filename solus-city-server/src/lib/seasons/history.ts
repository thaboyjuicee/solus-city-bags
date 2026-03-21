import { Prisma, PrismaClient } from "@prisma/client";

type PrismaLike = PrismaClient | Prisma.TransactionClient;

function toDisplayJson(args: {
  category: string;
  rank: number;
  name: string;
  title: string;
  score?: number;
}) {
  return {
    category: args.category,
    rank: args.rank,
    name: args.name,
    title: args.title,
    score: args.score ?? null,
  };
}

export async function buildHallOfFameEntriesForSeason(prisma: PrismaLike, seasonId: string) {
  const season = await prisma.season.findUnique({ where: { id: seasonId } });
  if (!season) return [];

  const [overall, pvp, crime, syndicates] = await Promise.all([
    prisma.seasonParticipation.findMany({
      where: { seasonId },
      take: 3,
      orderBy: [{ score: "desc" }, { createdAt: "asc" }],
      include: { user: { include: { profile: true } } },
    }),
    prisma.seasonParticipation.findMany({
      where: { seasonId },
      take: 3,
      orderBy: [{ pvpScore: "desc" }, { score: "desc" }, { createdAt: "asc" }],
      include: { user: { include: { profile: true } } },
    }),
    prisma.seasonParticipation.findMany({
      where: { seasonId },
      take: 3,
      orderBy: [{ crimeScore: "desc" }, { score: "desc" }, { createdAt: "asc" }],
      include: { user: { include: { profile: true } } },
    }),
    prisma.syndicate.findMany({
      take: 3,
      orderBy: [{ seasonPoints: "desc" }, { territoryCount: "desc" }, { warRating: "desc" }],
    }),
  ]);

  await prisma.hallOfFameEntry.deleteMany({
    where: {
      seasonId,
      category: { in: ["overall", "pvp", "crime", "syndicates"] },
    },
  });

  const rows = [
    ...overall.map((entry, index) => ({
      seasonId,
      category: "overall",
      userId: entry.userId,
      rank: index + 1,
      displayJson: toDisplayJson({
        category: "overall",
        rank: index + 1,
        name: entry.user.profile?.name ?? entry.user.wallet.slice(0, 6),
        title: "Overall Standout",
        score: entry.score,
      }),
    })),
    ...pvp.map((entry, index) => ({
      seasonId,
      category: "pvp",
      userId: entry.userId,
      rank: index + 1,
      displayJson: toDisplayJson({
        category: "pvp",
        rank: index + 1,
        name: entry.user.profile?.name ?? entry.user.wallet.slice(0, 6),
        title: "PvP Standout",
        score: entry.pvpScore,
      }),
    })),
    ...crime.map((entry, index) => ({
      seasonId,
      category: "crime",
      userId: entry.userId,
      rank: index + 1,
      displayJson: toDisplayJson({
        category: "crime",
        rank: index + 1,
        name: entry.user.profile?.name ?? entry.user.wallet.slice(0, 6),
        title: "Crime Standout",
        score: entry.crimeScore,
      }),
    })),
    ...syndicates.map((entry, index) => ({
      seasonId,
      category: "syndicates",
      syndicateId: entry.id,
      rank: index + 1,
      displayJson: toDisplayJson({
        category: "syndicates",
        rank: index + 1,
        name: entry.name,
        title: "Syndicate Standout",
        score: entry.seasonPoints,
      }),
    })),
  ];

  if (rows.length > 0) {
    await prisma.hallOfFameEntry.createMany({ data: rows });
  }

  return rows;
}

export async function getSeasonHistoryForUser(prisma: PrismaLike, userId: string, limit = 6) {
  const seasons = await prisma.season.findMany({
    orderBy: { startsAt: "desc" },
    take: limit,
    include: {
      participations: {
        where: { userId },
        select: {
          score: true,
          pvpScore: true,
          crimeScore: true,
          missionScore: true,
          finalRank: true,
          rewardClaimed: true,
        },
      },
      hallOfFameEntries: {
        where: { OR: [{ userId }, { userId: null }] },
        orderBy: [{ category: "asc" }, { rank: "asc" }],
      },
    },
  });

  return seasons.map((season) => ({
    season,
    participation: season.participations[0] ?? null,
    highlights: season.hallOfFameEntries,
  }));
}

export async function getHallOfFameFeed(prisma: PrismaLike, limit = 30) {
  return prisma.hallOfFameEntry.findMany({
    take: limit,
    orderBy: [{ createdAt: "desc" }, { rank: "asc" }],
    include: {
      season: true,
      user: { include: { profile: true } },
      syndicate: true,
    },
  });
}

