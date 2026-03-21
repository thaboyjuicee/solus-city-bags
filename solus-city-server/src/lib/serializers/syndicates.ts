export function serializeWarSummary(war: {
  id: string;
  status: string;
  startsAt: Date;
  endsAt: Date;
  attackerScore: number;
  defenderScore: number;
  territory?: { id: string; name: string; code: string } | null;
  attackerSyndicate?: { id: string; name: string } | null;
  defenderSyndicate?: { id: string; name: string } | null;
}) {
  return {
    id: war.id,
    status: war.status,
    startsAt: war.startsAt,
    endsAt: war.endsAt,
    attackerScore: war.attackerScore,
    defenderScore: war.defenderScore,
    territory: war.territory
      ? { id: war.territory.id, name: war.territory.name, code: war.territory.code }
      : null,
    attackerSyndicate: war.attackerSyndicate ?? null,
    defenderSyndicate: war.defenderSyndicate ?? null,
  };
}

export function serializeTerritorySummary(territory: {
  id: string;
  name: string;
  code: string;
  bonusType: string;
  bonusValue: number;
  active: boolean;
  control?: {
    influence: number;
    decayState: string;
    syndicate: { id: string; name: string };
  } | null;
}) {
  return {
    id: territory.id,
    name: territory.name,
    code: territory.code,
    bonusType: territory.bonusType,
    bonusValue: territory.bonusValue,
    active: territory.active,
    owner: territory.control?.syndicate ?? null,
    influence: territory.control?.influence ?? 0,
    contestState: territory.control?.decayState ?? "open",
  };
}

export function serializeSyndicateOverview(input: {
  id: string;
  name: string;
  description: string;
  buffType: string;
  buffValue: number;
  vaultCash: number;
  seasonPoints: number;
  territoryCount: number;
  warRating: number;
  safehouseLevel: number;
}) {
  return {
    id: input.id,
    name: input.name,
    description: input.description,
    buffType: input.buffType,
    buffValue: input.buffValue,
    vaultCash: input.vaultCash,
    seasonPoints: input.seasonPoints,
    territoryCount: input.territoryCount,
    warRating: input.warRating,
    safehouseLevel: input.safehouseLevel,
  };
}
