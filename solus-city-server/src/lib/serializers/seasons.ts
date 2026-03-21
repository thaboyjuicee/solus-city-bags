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
