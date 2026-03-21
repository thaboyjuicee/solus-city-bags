export function serializeSeasonSummary(input: {
  season: {
    id: string;
    name: string;
    status: string;
    startsAt: Date;
    endsAt: Date;
    rewardJson?: unknown;
    prestigeEnabled: boolean;
  } | null;
  participation?: {
    score: number;
    pvpScore: number;
    crimeScore: number;
    missionScore: number;
    finalRank?: number | null;
  } | null;
  rank?: number | null;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  if (!input.season) return null;

  return {
    id: input.season.id,
    name: input.season.name,
    status: input.season.status,
    startsAt: input.season.startsAt,
    endsAt: input.season.endsAt,
    timeRemainingMs: Math.max(0, input.season.endsAt.getTime() - now.getTime()),
    rewardPreview: input.season.rewardJson ?? null,
    prestigeEnabled: input.season.prestigeEnabled,
    player: input.participation
      ? {
          rank: input.rank ?? input.participation.finalRank ?? null,
          score: input.participation.score,
          pvpScore: input.participation.pvpScore,
          crimeScore: input.participation.crimeScore,
          missionScore: input.participation.missionScore,
        }
      : null,
  };
}

export function serializeSeasonRewardPreview(input: {
  season: { id: string; name: string; endsAt: Date } | null;
  projected: unknown;
  rewardTiers: unknown;
  now?: Date;
}) {
  if (!input.season) return null;
  const now = input.now ?? new Date();
  return {
    seasonId: input.season.id,
    seasonName: input.season.name,
    endsAt: input.season.endsAt,
    timeRemainingMs: Math.max(0, input.season.endsAt.getTime() - now.getTime()),
    projected: input.projected,
    rewardTiers: input.rewardTiers,
  };
}

export function serializeSeasonHistoryEntry(input: {
  season: {
    id: string;
    name: string;
    status: string;
    startsAt: Date;
    endsAt: Date;
    rewardJson?: unknown;
    prestigeEnabled: boolean;
  };
  participation: {
    score: number;
    pvpScore: number;
    crimeScore: number;
    missionScore: number;
    finalRank?: number | null;
    rewardClaimed?: boolean;
  } | null;
  highlights: Array<{ id: string; category: string; rank: number; displayJson: unknown }>;
}) {
  return {
    season: serializeSeasonSummary({
      season: input.season,
      participation: input.participation,
      rank: input.participation?.finalRank ?? null,
    }),
    rewardClaimed: input.participation?.rewardClaimed ?? false,
    highlights: input.highlights.map((entry) => ({
      id: entry.id,
      category: entry.category,
      rank: entry.rank,
      display: entry.displayJson,
    })),
  };
}

export function serializeHallOfFameEntry(entry: {
  id: string;
  category: string;
  rank: number;
  displayJson: unknown;
  season: { id: string; name: string; status: string; startsAt: Date; endsAt: Date };
  user?: { id: string; wallet: string; profile?: { name: string | null } | null } | null;
  syndicate?: { id: string; name: string } | null;
}) {
  return {
    id: entry.id,
    category: entry.category,
    rank: entry.rank,
    display: entry.displayJson,
    season: {
      id: entry.season.id,
      name: entry.season.name,
      status: entry.season.status,
      startsAt: entry.season.startsAt,
      endsAt: entry.season.endsAt,
    },
    user: entry.user
      ? {
          id: entry.user.id,
          name: entry.user.profile?.name ?? entry.user.wallet.slice(0, 6),
        }
      : null,
    syndicate: entry.syndicate ? { id: entry.syndicate.id, name: entry.syndicate.name } : null,
  };
}

export function serializeChampionshipSeason(input: {
  id: string;
  status: string;
  startsAt: Date;
  endsAt: Date;
  season: { id: string; name: string };
  entries: Array<{ seed: number; qualifyingPoints: number; syndicate: { id: string; name: string } }>;
  matches: Array<{
    id: string;
    round: number;
    status: string;
    scoreA: number;
    scoreB: number;
    startsAt: Date;
    endsAt: Date;
    syndicateA: { id: string; name: string };
    syndicateB: { id: string; name: string };
    winnerSyndicate?: { id: string; name: string } | null;
  }>;
}) {
  const currentRound = input.matches.reduce((max, match) => Math.max(max, match.round), 0);
  return {
    id: input.id,
    status: input.status,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    currentRound,
    season: input.season,
    qualifiers: input.entries.map((entry) => ({
      seed: entry.seed,
      qualifyingPoints: entry.qualifyingPoints,
      syndicate: entry.syndicate,
    })),
    matches: input.matches.map((match) => ({
      id: match.id,
      round: match.round,
      status: match.status,
      scoreA: match.scoreA,
      scoreB: match.scoreB,
      startsAt: match.startsAt,
      endsAt: match.endsAt,
      syndicateA: match.syndicateA,
      syndicateB: match.syndicateB,
      winnerSyndicate: match.winnerSyndicate ?? null,
    })),
  };
}

