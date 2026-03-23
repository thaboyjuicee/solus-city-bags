"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api/client";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { WarScoreboard } from "@/components/game/WarScoreboard";
import { ContributionList } from "@/components/game/ContributionList";

type MeLite = { currentSyndicateRole?: string | null };

type WarSummary = {
  id: string;
  status: string;
  startsAt: string;
  endsAt: string;
  attackerScore: number;
  defenderScore: number;
  territory?: { id: string; name: string; code: string } | null;
  attackerSyndicate?: { id: string; name: string } | null;
  defenderSyndicate?: { id: string; name: string } | null;
};

type WarScoreboardResponse = {
  war: WarSummary;
  actionBreakdown: Record<string, number>;
  topParticipants: Array<{ userId: string; name: string; syndicateId: string; points: number }>;
  recentActions: Array<{ id: string; actionType: string; points: number; createdAt: string; actorName: string; syndicateName: string }>;
};

export default function WarsPage() {
  const [me, setMe] = useState<MeLite | null>(null);
  const [wars, setWars] = useState<WarSummary[]>([]);
  const [selectedWarId, setSelectedWarId] = useState<string | null>(null);
  const [scoreboard, setScoreboard] = useState<WarScoreboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const loadWars = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, warsRes] = await Promise.all([
        api.get<MeLite>("/me"),
        api.get<{ wars: WarSummary[] }>("/wars/current"),
      ]);
      setMe(meRes.data);
      setWars(warsRes.data.wars);
      const nextSelected = selectedWarId && warsRes.data.wars.some((war) => war.id === selectedWarId)
        ? selectedWarId
        : warsRes.data.wars[0]?.id ?? null;
      setSelectedWarId(nextSelected);
    } finally {
      setLoading(false);
    }
  }, [selectedWarId]);

  useEffect(() => {
    loadWars();
  }, [loadWars]);

  useEffect(() => {
    if (!selectedWarId) {
      setScoreboard(null);
      return;
    }

    api.get<WarScoreboardResponse>(`/wars/${selectedWarId}/scoreboard`).then((response) => {
      setScoreboard(response.data);
    });
  }, [selectedWarId]);

  const selectedWar = useMemo(() => wars.find((war) => war.id === selectedWarId) ?? null, [selectedWarId, wars]);

  if (loading) return <div className="flex min-h-dvh items-center justify-center"><LoadingSpinner size={32} /></div>;
  if (wars.length === 0) return <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-[12px] text-[#777]">No active wars for your syndicate right now.</div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 overflow-x-auto">
        {wars.map((war) => (
          <button
            key={war.id}
            type="button"
            onClick={() => setSelectedWarId(war.id)}
            className={`rounded-md border px-3 py-2 text-[10px] font-black tracking-[2px] uppercase whitespace-nowrap ${selectedWarId === war.id ? "border-[rgba(153,69,255,0.3)] bg-[#1a0a2e] text-[#9945FF]" : "border-white/10 bg-black/20 text-[#888]"}`}
          >
            {war.attackerSyndicate?.name ?? "Attacker"} vs {war.defenderSyndicate?.name ?? "Defender"}
          </button>
        ))}
      </div>

      {selectedWar && (
        <WarScoreboard
          war={selectedWar}
          canManageActions={!!me}
          busyAction={busyAction}
          onJoin={async () => {
            await api.post(`/wars/${selectedWar.id}/join`);
            await loadWars();
          }}
          onAction={async (actionType) => {
            setBusyAction(actionType);
            try {
              await api.post(`/wars/${selectedWar.id}/action`, { actionType });
              await loadWars();
              const refreshed = await api.get<WarScoreboardResponse>(`/wars/${selectedWar.id}/scoreboard`);
              setScoreboard(refreshed.data);
            } finally {
              setBusyAction(null);
            }
          }}
        />
      )}

      {scoreboard && (
        <>
          <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
            <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase">Action Breakdown</p>
            <div className="grid gap-2 md:grid-cols-2">
              {Object.entries(scoreboard.actionBreakdown).map(([actionType, points]) => (
                <div key={actionType} className="rounded-md border border-white/10 bg-black/20 p-3 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="break-words text-[12px] font-bold text-[#eee]">{actionType.replaceAll("_", " ")}</p>
                  <p className="text-[14px] font-black text-[#66bb6a]">{points}</p>
                </div>
              ))}
            </div>
          </div>

          <ContributionList
            title="Top War Participants"
            items={scoreboard.topParticipants.map((participant) => ({
              id: participant.userId,
              userName: participant.name,
              actionType: "war points",
              points: participant.points,
            }))}
          />

          <ContributionList
            title="Recent War Actions"
            items={scoreboard.recentActions.map((action) => ({
              id: action.id,
              userName: action.actorName,
              syndicateName: action.syndicateName,
              actionType: action.actionType,
              points: action.points,
            }))}
          />
        </>
      )}
    </div>
  );
}
