"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api/client";
import { HeatMeter } from "@/components/game/HeatMeter";
import { WantedBadge } from "@/components/game/WantedBadge";
import { VaultCard } from "@/components/game/VaultCard";
import { HospitalOptionsCard } from "@/components/game/HospitalOptionsCard";
import { MissionCard } from "@/components/game/MissionCard";
import { SeasonRankCard } from "@/components/game/SeasonRankCard";
import { SyndicateRoleBadge } from "@/components/game/SyndicateRoleBadge";
import { WarScoreboard } from "@/components/game/WarScoreboard";
import { StatusBars } from "@/components/ui/StatusBars";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { MeResponse } from "@/lib/gameApi";

type EventEntry = {
  id: string;
  type: string;
  message: string;
  createdAt: string;
};

function eventDotColor(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("level_up")) return "#9945FF";
  if (t.includes("attack_win") || t === "win") return "#66bb6a";
  if (t.includes("attack_loss") || t.includes("hospital") || t === "loss") return "#ef5350";
  if (t.includes("crime")) return "#fdd835";
  if (t.includes("gym")) return "#ff9800";
  if (t.includes("shop") || t.includes("buy") || t.includes("purchase")) return "#42a5f5";
  return "#555";
}

function timeAgo(ts: string): string {
  const diffMs = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatCash(value: number) {
  return `$${Math.floor(value).toLocaleString()}`;
}

function formatTimer(ts?: string | null) {
  if (!ts) return "No active rotation";
  const diff = new Date(ts).getTime() - Date.now();
  if (diff <= 0) return "Ending now";
  const totalMinutes = Math.floor(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m remaining`;
}

function formatRecovery(ts?: string | null) {
  if (!ts) return "Ready";
  const diff = new Date(ts).getTime() - Date.now();
  if (diff <= 0) return "Ready";
  const totalMinutes = Math.floor(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

export default function HomePage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [events, setEvents] = useState<EventEntry[]>([]);
  const fetchedEvents = useRef(false);

  const fetchMe = useCallback(async () => {
    const res = await api.get<MeResponse>("/me");
    setMe(res.data);
  }, []);

  const fetchEvents = useCallback(async () => {
    if (fetchedEvents.current) return;
    fetchedEvents.current = true;
    try {
      const res = await api.get<EventEntry[] | { events: EventEntry[] }>("/events");
      const list = Array.isArray(res.data) ? res.data : (res.data as { events: EventEntry[] }).events;
      setEvents((list ?? []).slice(0, 20));
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchMe();
    fetchEvents();
  }, [fetchMe, fetchEvents]);

  const topMissions = useMemo(() => (me?.missionsPreview ?? []).slice(0, 3), [me]);

  if (!me) {
    return <div className="flex min-h-dvh items-center justify-center"><LoadingSpinner size={32} /></div>;
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Status bars */}
      <StatusBars
        profile={{
          health: me.health,
          maxHealth: me.maxHealth,
          energy: me.energy,
          maxEnergy: me.maxEnergy,
          nerve: me.nerve,
          maxNerve: me.maxNerve,
          happiness: me.happiness,
          maxHappiness: me.maxHappiness,
          level: me.level,
          xp: me.xp,
          cash: me.cash,
          rp: me.rp,
          name: me.name,
          ap: me.ap,
          dp: me.dp,
          inHospital: me.inHospital,
        }}
      />

      {/* Hero: identity */}
      <section className="rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(153,69,255,0.18),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(66,165,245,0.14),transparent_32%),rgba(0,0,0,0.28)] p-5 md:p-6">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-black tracking-[2px] text-[#888] uppercase">
            Solus City Operator Hub
          </span>
          {me.currentSyndicateRole ? <SyndicateRoleBadge role={me.currentSyndicateRole} /> : null}
        </div>
        <p className="text-[30px] font-black leading-none text-[#eee] md:text-[36px]">{me.name ?? "Unnamed Operator"}</p>
        <p className="mt-2 text-[12px] text-[#9a9a9a] max-w-2xl">
          Keep your wallet liquid, your vault protected, your heat controlled, and your syndicate pressure rising.
        </p>
      </section>

      {/* Top row: key stats */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        <div className="rounded-md border border-white/10 bg-black/20 p-3">
          <p className="text-[9px] font-black tracking-[2px] text-[#555] uppercase">Level</p>
          <p className="mt-1 text-[18px] font-black text-[#42a5f5]">{me.level}</p>
        </div>
        <div className="rounded-md border border-white/10 bg-black/20 p-3">
          <p className="text-[9px] font-black tracking-[2px] text-[#555] uppercase">Wallet</p>
          <p className="mt-1 text-[18px] font-black text-[#66bb6a]">{formatCash(me.cash)}</p>
        </div>
        <div className="rounded-md border border-white/10 bg-black/20 p-3">
          <p className="text-[9px] font-black tracking-[2px] text-[#555] uppercase">Vault</p>
          <p className="mt-1 text-[18px] font-black text-[#42a5f5]">{formatCash(me.vaultCash)}</p>
        </div>
        <div className="rounded-md border border-white/10 bg-black/20 p-3">
          <p className="text-[9px] font-black tracking-[2px] text-[#555] uppercase">RP</p>
          <p className="mt-1 text-[18px] font-black text-[#fdd835]">{me.rp}</p>
        </div>
        <div className="rounded-md border border-white/10 bg-black/20 p-3">
          <p className="text-[9px] font-black tracking-[2px] text-[#555] uppercase">Season</p>
          <p className="mt-1 text-[18px] font-black text-[#ff8a65]">{me.seasonScore}</p>
        </div>
        <div className="rounded-md border border-white/10 bg-black/20 p-3">
          <p className="text-[9px] font-black tracking-[2px] text-[#555] uppercase">Perk Pts</p>
          <p className="mt-1 text-[18px] font-black text-[#9945FF]">{me.availablePerkPoints}</p>
        </div>
      </div>

      {/* Hospital (conditional — urgent, shown when active) */}
      <HospitalOptionsCard active={me.inHospital} onUpdated={fetchMe} />

      {/* Middle row: Heat/Wanted | Cash Storage | Black Market */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-3">
          <HeatMeter heat={me.heat} />
          <WantedBadge tier={me.wantedTier} />
        </div>
        <VaultCard walletCash={me.cash} vaultCash={me.vaultCash} />
        <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-2">
          <p className="text-[9px] font-black tracking-[2px] text-[#555] uppercase">Black Market</p>
          <p className="text-[16px] font-black text-[#9945FF]">{formatTimer(me.blackMarketEndsAt)}</p>
          <p className="text-[11px] text-[#777]">Recovery items, contraband, and rotating risk buys.</p>
        </div>
      </div>

      {/* 3-column grid: Current Season | Core Condition | Loadout & Protection */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Current Season */}
        <SeasonRankCard season={me.currentSeason} />

        {/* Core Condition */}
        <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
          <div>
            <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase">Core Condition</p>
            <p className="mt-1 text-[12px] text-[#888]">Live stats, recovery timers, and active edge.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border border-white/10 bg-black/20 p-3">
              <p className="text-[9px] font-black tracking-[2px] text-[#555] uppercase">Health</p>
              <p className="mt-1 text-[16px] font-black text-[#ef5350]">{me.health}/{me.maxHealth}</p>
            </div>
            <div className="rounded-md border border-white/10 bg-black/20 p-3">
              <p className="text-[9px] font-black tracking-[2px] text-[#555] uppercase">Energy</p>
              <p className="mt-1 text-[16px] font-black text-[#42a5f5]">{me.energy}/{me.maxEnergy}</p>
            </div>
            <div className="rounded-md border border-white/10 bg-black/20 p-3">
              <p className="text-[9px] font-black tracking-[2px] text-[#555] uppercase">Nerve</p>
              <p className="mt-1 text-[16px] font-black text-[#ff9800]">{me.nerve}/{me.maxNerve}</p>
            </div>
            <div className="rounded-md border border-white/10 bg-black/20 p-3">
              <p className="text-[9px] font-black tracking-[2px] text-[#555] uppercase">Happiness</p>
              <p className="mt-1 text-[16px] font-black text-[#fdd835]">{me.happiness}/{me.maxHappiness}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="rounded-md border border-white/10 bg-black/20 p-2 text-center text-[#66bb6a]">AP {me.ap}</div>
            <div className="rounded-md border border-white/10 bg-black/20 p-2 text-center text-[#42a5f5]">DP {me.dp}</div>
            <div className="rounded-md border border-white/10 bg-black/20 p-2 text-center text-[#ff9800]">Income {formatCash(me.incomePerHour)}/h</div>
            <div className="rounded-md border border-white/10 bg-black/20 p-2 text-center text-[#9945FF]">Perks {me.unlockedPerkSummary.total}</div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <div className="rounded-md border border-white/10 bg-black/20 p-2">
              <p className="font-black tracking-[2px] text-[#555] uppercase">Next Energy</p>
              <p className="mt-1 text-[#ddd]">{formatRecovery(me.nextEnergyAt)}</p>
            </div>
            <div className="rounded-md border border-white/10 bg-black/20 p-2">
              <p className="font-black tracking-[2px] text-[#555] uppercase">Next Nerve</p>
              <p className="mt-1 text-[#ddd]">{formatRecovery(me.nextNerveAt)}</p>
            </div>
            <div className="rounded-md border border-white/10 bg-black/20 p-2">
              <p className="font-black tracking-[2px] text-[#555] uppercase">Next Happiness</p>
              <p className="mt-1 text-[#ddd]">{formatRecovery(me.nextHappinessAt)}</p>
            </div>
          </div>
        </div>

        {/* Loadout & Protection */}
        <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
          <div>
            <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase">Loadout & Protection</p>
            <p className="mt-1 text-[12px] text-[#888]">What is currently shaping your survival odds.</p>
          </div>
          <div className="grid gap-2 grid-cols-2">
            {me.equipmentSummary.length === 0 ? (
              <div className="rounded-md border border-white/10 bg-black/20 p-3 text-[12px] text-[#777] col-span-2">No equipped gear found.</div>
            ) : (
              me.equipmentSummary.map((item) => (
                <div key={item.itemId} className="rounded-md border border-white/10 bg-black/20 p-3">
                  <p className="text-[9px] font-black tracking-[2px] text-[#555] uppercase">{item.slot ?? "utility"}</p>
                  <p className="mt-1 text-[12px] font-bold text-[#eee]">{item.name}</p>
                  <p className="mt-1 text-[10px] text-[#888]">{item.rarity ?? "standard"}</p>
                </div>
              ))
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {me.activeProtectionEffects.length === 0 ? (
              <div className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-[#777]">No active protection effects.</div>
            ) : (
              me.activeProtectionEffects.map((effect) => (
                <div key={effect.id} className="rounded-md border border-[#1f5f36] bg-[#0f2a18] px-3 py-2">
                  <p className="text-[10px] font-black tracking-[2px] text-[#66bb6a] uppercase">{effect.type.replace(/_/g, " ")}</p>
                  <p className="mt-1 text-[11px] text-[#ddd]">Value {effect.value}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Syndicate State — full width, conditional */}
      {me.syndicateVaultSummary && (
        <section className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase">Syndicate State</p>
              <p className="mt-1 text-[12px] text-[#888]">Your current social power layer.</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              {me.currentSyndicateRole ? <SyndicateRoleBadge role={me.currentSyndicateRole} /> : null}
              {me.syndicate?.name ? (
                <p className="text-[9px] tracking-[1px] text-[#555] uppercase">{me.syndicate.name}</p>
              ) : null}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-md border border-white/10 bg-black/20 p-3">
              <p className="text-[9px] font-black tracking-[2px] text-[#555] uppercase">Syndicate Vault</p>
              <p className="mt-1 text-[16px] font-black text-[#fdd835]">{formatCash(me.syndicateVaultSummary.vaultCash)}</p>
            </div>
            <div className="rounded-md border border-white/10 bg-black/20 p-3">
              <p className="text-[9px] font-black tracking-[2px] text-[#555] uppercase">War Rating</p>
              <p className="mt-1 text-[16px] font-black text-[#ff8a65]">{me.syndicateVaultSummary.warRating}</p>
            </div>
            <div className="rounded-md border border-white/10 bg-black/20 p-3">
              <p className="text-[9px] font-black tracking-[2px] text-[#555] uppercase">Season Pts</p>
              <p className="mt-1 text-[16px] font-black text-[#66bb6a]">{me.syndicateVaultSummary.seasonPoints}</p>
            </div>
          </div>
        </section>
      )}

      {me.currentWarSummary && <WarScoreboard war={me.currentWarSummary} />}

      {/* Mission Board — full width */}
      <section className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase">Mission Board</p>
            <p className="mt-1 text-[12px] text-[#888]">Your hottest objectives right now.</p>
          </div>
          <p className="text-[10px] font-black tracking-[2px] text-[#9945FF] uppercase">{topMissions.length} showing</p>
        </div>
        {topMissions.length === 0 ? (
          <div className="rounded-md border border-white/10 bg-black/20 p-4 text-[12px] text-[#777]">No active missions found.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {topMissions.map((mission) => (
              <MissionCard key={mission.id} mission={mission} />
            ))}
          </div>
        )}
      </section>

      {/* Recent Activity */}
      {events.length > 0 && (
        <section className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
          <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase">Recent Activity</p>
          <div className="flex flex-col gap-1.5">
            {events.map((event) => (
              <div key={event.id} className="flex items-center gap-2.5">
                <span
                  className="flex-shrink-0 w-2 h-2 rounded-full"
                  style={{ backgroundColor: eventDotColor(event.type) }}
                />
                <p className="flex-1 text-[11px] text-[#aaa]">{event.message}</p>
                <p className="flex-shrink-0 text-[10px] text-[#555]">{timeAgo(event.createdAt)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
