"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { TerritoryCard } from "@/components/game/TerritoryCard";
import { ContributionList } from "@/components/game/ContributionList";
import { WarScoreboard } from "@/components/game/WarScoreboard";

type MeLite = { syndicate?: { id: string } | null };

type TerritorySummary = {
  id: string;
  name: string;
  code: string;
  bonusType: string;
  bonusValue: number;
  active: boolean;
  owner?: { id: string; name: string } | null;
  influence: number;
  contestState: string;
};

type TerritoryDetailResponse = {
  territory: TerritorySummary;
  linkedWar?: {
    id: string;
    status: string;
    startsAt: string;
    endsAt: string;
    attackerScore: number;
    defenderScore: number;
    territory?: { id: string; name: string; code: string } | null;
    attackerSyndicate?: { id: string; name: string } | null;
    defenderSyndicate?: { id: string; name: string } | null;
  } | null;
  recentContributions: Array<{ id: string; actionType: string; influenceDelta: number; userName: string; syndicateName: string }>;
};

export default function TerritoriesPage() {
  const [me, setMe] = useState<MeLite | null>(null);
  const [territories, setTerritories] = useState<TerritorySummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TerritoryDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, listRes] = await Promise.all([
        api.get<MeLite>("/me"),
        api.get<{ territories: TerritorySummary[] }>("/territories"),
      ]);
      setMe(meRes.data);
      setTerritories(listRes.data.territories);
      setSelectedId((current) => current ?? listRes.data.territories[0]?.id ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    api.get<TerritoryDetailResponse>(`/territories/${selectedId}`).then((response) => setDetail(response.data));
  }, [selectedId]);

  if (loading) return <div className="flex min-h-dvh items-center justify-center"><LoadingSpinner size={32} /></div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {territories.map((territory) => (
          <TerritoryCard
            key={territory.id}
            territory={territory}
            canContribute={!!me?.syndicate?.id}
            busyAction={selectedId === territory.id ? busyAction : null}
            onOpen={() => setSelectedId(territory.id)}
            onContribute={async (actionType) => {
              setSelectedId(territory.id);
              setBusyAction(actionType);
              try {
                await api.post(`/territories/${territory.id}/contribute`, { actionType });
                await load();
                const refreshed = await api.get<TerritoryDetailResponse>(`/territories/${territory.id}`);
                setDetail(refreshed.data);
              } finally {
                setBusyAction(null);
              }
            }}
          />
        ))}
      </div>

      {detail && (
        <>
          {detail.linkedWar ? <WarScoreboard war={detail.linkedWar} /> : null}
          <ContributionList
            title={`Recent Activity • ${detail.territory.name}`}
            items={detail.recentContributions.map((entry) => ({
              id: entry.id,
              userName: entry.userName,
              syndicateName: entry.syndicateName,
              actionType: entry.actionType,
              influenceDelta: entry.influenceDelta,
            }))}
          />
        </>
      )}
    </div>
  );
}
