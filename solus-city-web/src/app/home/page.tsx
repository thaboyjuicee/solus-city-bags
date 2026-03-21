"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api/client";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { SyndicateRoleBadge } from "@/components/game/SyndicateRoleBadge";
import { WarScoreboard } from "@/components/game/WarScoreboard";
import { TerritoryBonusBadge } from "@/components/game/TerritoryBonusBadge";

type HomeMeResponse = {
  name: string | null;
  level: number;
  cash: number;
  vaultCash: number;
  heat: number;
  wantedTier: string;
  missionsPreview?: Array<{ id: string; name: string; progress: number; goalValue: number; type: string }>;
  blackMarketEndsAt?: string | null;
  currentSyndicateRole?: string | null;
  activeTerritoryBonuses?: Array<{ territoryId: string; territoryName: string; bonusType: string; bonusValue: number }>;
  currentWarSummary?: {
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
  syndicateVaultSummary?: { vaultCash: number; seasonPoints: number; territoryCount: number; warRating: number } | null;
};

function formatCash(value: number) {
  return `$${Math.floor(value).toLocaleString()}`;
}

function timeLeft(ts?: string | null) {
  if (!ts) return "No rotation";
  const diff = new Date(ts).getTime() - Date.now();
  if (diff <= 0) return "Ending";
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export default function HomePage() {
  const [me, setMe] = useState<HomeMeResponse | null>(null);

  const fetchMe = useCallback(async () => {
    const res = await api.get<HomeMeResponse>("/me");
    setMe(res.data);
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const missionPreview = useMemo(() => (me?.missionsPreview ?? []).slice(0, 3), [me]);

  if (!me) return <div className="flex min-h-dvh items-center justify-center"><LoadingSpinner size={32} /></div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase">Operator Dashboard</p>
            <p className="text-[20px] font-black text-[#eee] mt-1">{me.name ?? "Unnamed Operator"}</p>
          </div>
          {me.currentSyndicateRole ? <SyndicateRoleBadge role={me.currentSyndicateRole} /> : null}
        </div>
        <div className="grid gap-2 sm:grid-cols-4">
          <div className="rounded-md border border-white/10 bg-black/20 p-3"><p className="text-[9px] text-[#555] font-black tracking-[2px] uppercase">Level</p><p className="text-[16px] font-black text-[#42a5f5] mt-1">{me.level}</p></div>
          <div className="rounded-md border border-white/10 bg-black/20 p-3"><p className="text-[9px] text-[#555] font-black tracking-[2px] uppercase">Wallet</p><p className="text-[16px] font-black text-[#66bb6a] mt-1">{formatCash(me.cash)}</p></div>
          <div className="rounded-md border border-white/10 bg-black/20 p-3"><p className="text-[9px] text-[#555] font-black tracking-[2px] uppercase">Vault</p><p className="text-[16px] font-black text-[#fdd835] mt-1">{formatCash(me.vaultCash)}</p></div>
          <div className="rounded-md border border-white/10 bg-black/20 p-3"><p className="text-[9px] text-[#555] font-black tracking-[2px] uppercase">Heat</p><p className="text-[16px] font-black text-[#ff7043] mt-1">{me.heat} • {me.wantedTier}</p></div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
          <div>
            <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase">Mission Preview</p>
            <p className="text-[12px] text-[#888] mt-1">Top active objectives from the Wave 1 board.</p>
          </div>
          {missionPreview.length === 0 ? (
            <p className="text-[12px] text-[#777]">No active missions found.</p>
          ) : (
            missionPreview.map((mission) => (
              <div key={mission.id} className="rounded-md border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[12px] font-bold text-[#eee]">{mission.name}</p>
                  <p className="text-[10px] font-black tracking-[2px] text-[#9945FF] uppercase">{mission.type}</p>
                </div>
                <p className="text-[11px] text-[#777] mt-1">{mission.progress}/{mission.goalValue}</p>
              </div>
            ))
          )}
        </div>

        <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
          <div>
            <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase">Black Market Rotation</p>
            <p className="text-[12px] text-[#888] mt-1">Current illicit supply window.</p>
          </div>
          <p className="text-[22px] font-black text-[#9945FF]">{timeLeft(me.blackMarketEndsAt)}</p>
          <p className="text-[11px] text-[#777]">Keep wallet cash available if you plan to buy contraband or quick recovery items.</p>
        </div>
      </div>

      {me.syndicateVaultSummary && (
        <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase">Syndicate State</p>
              <p className="text-[12px] text-[#888] mt-1">Shared progression from Wave 3.</p>
            </div>
            {me.currentSyndicateRole ? <SyndicateRoleBadge role={me.currentSyndicateRole} /> : null}
          </div>
          <div className="grid gap-2 md:grid-cols-4">
            <div className="rounded-md border border-white/10 bg-black/20 p-3"><p className="text-[9px] text-[#555] font-black tracking-[2px] uppercase">Vault</p><p className="text-[16px] font-black text-[#fdd835] mt-1">{formatCash(me.syndicateVaultSummary.vaultCash)}</p></div>
            <div className="rounded-md border border-white/10 bg-black/20 p-3"><p className="text-[9px] text-[#555] font-black tracking-[2px] uppercase">Season</p><p className="text-[16px] font-black text-[#66bb6a] mt-1">{me.syndicateVaultSummary.seasonPoints}</p></div>
            <div className="rounded-md border border-white/10 bg-black/20 p-3"><p className="text-[9px] text-[#555] font-black tracking-[2px] uppercase">Territories</p><p className="text-[16px] font-black text-[#42a5f5] mt-1">{me.syndicateVaultSummary.territoryCount}</p></div>
            <div className="rounded-md border border-white/10 bg-black/20 p-3"><p className="text-[9px] text-[#555] font-black tracking-[2px] uppercase">War Rating</p><p className="text-[16px] font-black text-[#ff8a65] mt-1">{me.syndicateVaultSummary.warRating}</p></div>
          </div>
        </div>
      )}

      {me.activeTerritoryBonuses && me.activeTerritoryBonuses.length > 0 && (
        <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
          <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase">Active Territory Bonuses</p>
          <div className="flex flex-wrap gap-2">
            {me.activeTerritoryBonuses.map((bonus) => (
              <div key={bonus.territoryId} className="rounded-md border border-white/10 bg-black/20 px-3 py-2">
                <p className="text-[11px] font-bold text-[#eee]">{bonus.territoryName}</p>
                <div className="mt-1"><TerritoryBonusBadge bonusType={bonus.bonusType} bonusValue={bonus.bonusValue} /></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {me.currentWarSummary && <WarScoreboard war={me.currentWarSummary} />}
    </div>
  );
}
