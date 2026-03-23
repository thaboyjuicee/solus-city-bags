"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Flame, Shield, Skull, Zap } from "lucide-react";
import { api } from "@/lib/api/client";
import { HospitalOptionsCard } from "@/components/game/HospitalOptionsCard";
import { MissionCard } from "@/components/game/MissionCard";
import { SeasonRankCard } from "@/components/game/SeasonRankCard";
import { SyndicateRoleBadge } from "@/components/game/SyndicateRoleBadge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { MeResponse } from "@/lib/gameApi";

type EventEntry = { id: string; type: string; message: string; createdAt: string };

function formatCash(value: number) {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `$${Math.round(value / 100) / 10}K`;
  return `$${Math.floor(value)}`;
}

function timeAgo(ts: string) {
  const diffMs = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function countdown(ts?: string | null) {
  if (!ts) return "No active rotation";
  const diff = new Date(ts).getTime() - Date.now();
  if (diff <= 0) return "Ending now";
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.14em]">
        <span className="text-[#72778b]">{label}</span>
        <span style={{ color }}>{value}<span className="text-[#5c6073]">/{max}</span></span>
      </div>
      <div className="sc-progress">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function QuickAction({ href, title, subtitle, tone }: { href: string; title: string; subtitle: string; tone: string }) {
  return (
    <Link href={href} className="sc-panel p-4 transition-colors hover:border-white/15">
      <p className="text-[13px] font-black uppercase tracking-[0.12em]" style={{ color: tone }}>{title}</p>
      <p className="mt-2 text-[12px] text-[#6f7488]">{subtitle}</p>
    </Link>
  );
}

export default function HomePage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [events, setEvents] = useState<EventEntry[]>([]);
  const fetchedEvents = useRef(false);

  const fetchMe = useCallback(async () => {
    const response = await api.get<MeResponse>("/me");
    setMe(response.data);
  }, []);

  const fetchEvents = useCallback(async () => {
    if (fetchedEvents.current) return;
    fetchedEvents.current = true;
    try {
      const response = await api.get<EventEntry[] | { events: EventEntry[] }>("/events");
      const next = Array.isArray(response.data) ? response.data : response.data.events;
      setEvents((next ?? []).slice(0, 6));
    } catch {
      setEvents([]);
    }
  }, []);

  useEffect(() => {
    fetchMe();
    fetchEvents();
  }, [fetchEvents, fetchMe]);

  const topMissions = useMemo(() => (me?.missionsPreview ?? []).slice(0, 3), [me]);

  if (!me) return <div className="flex min-h-[60vh] items-center justify-center"><LoadingSpinner size={32} /></div>;

  return (
    <div className="space-y-4">
      <section className="sc-panel-strong p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <div className="flex flex-wrap gap-2">
              <span className="sc-chip sc-chip-purple">Operator</span>
              {me.currentSyndicateRole ? <SyndicateRoleBadge role={me.currentSyndicateRole} /> : null}
              {me.syndicate?.name ? <span className="sc-chip sc-chip-orange">{me.syndicate.name}</span> : null}
            </div>
            <p className="mt-5 text-[40px] font-black leading-none text-[#f4f5fb] md:text-[54px]">{me.name}</p>
            <p className="mt-3 text-[12px] font-black tracking-[0.14em] uppercase text-[#6d7186]">Season 4 · Level {me.level} · {me.wantedTier.replaceAll("_", " ")}</p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Bar label="Health" value={me.health} max={me.maxHealth} color="#ff5d5d" />
              <Bar label="Energy" value={me.energy} max={me.maxEnergy} color="#36d47f" />
              <Bar label="Nerve" value={me.nerve} max={me.maxNerve} color="#4f8cff" />
              <Bar label="Happiness" value={me.happiness} max={me.maxHappiness} color="#f7bf35" />
            </div>
          </div>

<<<<<<< HEAD
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
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-black tracking-[2px] text-[#d0d5ca] uppercase">
            Solus City Operator Hub
          </span>
          {me.currentSyndicateRole ? <SyndicateRoleBadge role={me.currentSyndicateRole} /> : null}
        </div>
        <p className="text-[30px] font-black leading-none text-[#f2f4ec] md:text-[36px]">{me.name ?? "Unnamed Operator"}</p>
        <p className="mt-2 text-[12px] text-[#9a9a9a] max-w-2xl">
          Keep your wallet liquid, your vault protected, your heat controlled, and your syndicate pressure rising.
        </p>
      </section>

      {/* Top row: key stats */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        <div className="rounded-md border border-white/10 bg-black/20 p-3">
          <p className="text-[9px] font-black tracking-[2px] text-[#aab0a3] uppercase">Level</p>
          <p className="mt-1 text-[18px] font-black text-[#42a5f5]">{me.level}</p>
        </div>
        <div className="rounded-md border border-white/10 bg-black/20 p-3">
          <p className="text-[9px] font-black tracking-[2px] text-[#aab0a3] uppercase">Wallet</p>
          <p className="mt-1 text-[18px] font-black text-[#66bb6a]">{formatCash(me.cash)}</p>
        </div>
        <div className="rounded-md border border-white/10 bg-black/20 p-3">
          <p className="text-[9px] font-black tracking-[2px] text-[#aab0a3] uppercase">Vault</p>
          <p className="mt-1 text-[18px] font-black text-[#42a5f5]">{formatCash(me.vaultCash)}</p>
        </div>
        <div className="rounded-md border border-white/10 bg-black/20 p-3">
          <p className="text-[9px] font-black tracking-[2px] text-[#aab0a3] uppercase">RP</p>
          <p className="mt-1 text-[18px] font-black text-[#fdd835]">{me.rp}</p>
        </div>
        <div className="rounded-md border border-white/10 bg-black/20 p-3">
          <p className="text-[9px] font-black tracking-[2px] text-[#aab0a3] uppercase">Season</p>
          <p className="mt-1 text-[18px] font-black text-[#ff8a65]">{me.seasonScore}</p>
        </div>
        <div className="rounded-md border border-white/10 bg-black/20 p-3">
          <p className="text-[9px] font-black tracking-[2px] text-[#aab0a3] uppercase">Perk Pts</p>
          <p className="mt-1 text-[18px] font-black text-[#9945FF]">{me.availablePerkPoints}</p>
        </div>
      </div>

      {/* Hospital (conditional - urgent, shown when active) */}
=======
          <div className="grid min-w-[220px] grid-cols-3 gap-3 self-stretch">
            <div className="sc-stat"><p className="sc-label">Level</p><p className="mt-3 text-[34px] font-black text-[#9f64ff]">{me.level}</p></div>
            <div className="sc-stat"><p className="sc-label">RP</p><p className="mt-3 text-[34px] font-black text-[#ffb438]">{me.rp.toLocaleString()}</p></div>
            <div className="sc-stat"><p className="sc-label">Prestige</p><p className="mt-3 text-[34px] font-black text-[#9f64ff]">P{me.prestigeLevel}</p></div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {[
          { label: "Cash", value: formatCash(me.cash), color: "#36d47f" },
          { label: "Vault", value: formatCash(me.vaultCash), color: "#36d47f" },
          { label: "AP", value: me.ap, color: "#ff5d5d" },
          { label: "DP", value: me.dp, color: "#4f8cff" },
          { label: "Season", value: me.seasonScore.toLocaleString(), color: "#9f64ff" },
          { label: "Perk Pts", value: me.availablePerkPoints, color: "#f7bf35" },
        ].map((item) => (
          <div key={item.label} className="sc-stat"><p className="sc-label">{item.label}</p><p className="mt-3 text-[30px] font-black" style={{ color: item.color }}>{item.value}</p></div>
        ))}
      </div>

>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
      <HospitalOptionsCard active={me.inHospital} onUpdated={fetchMe} />

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr]">
        <div className="sc-panel p-5">
          <div className="flex items-center gap-2"><Flame size={16} className="text-[#ff7d38]" /><p className="text-[24px] font-black text-[#f4f5fb]">Threat Level</p></div>
          <div className="mt-4"><Bar label="Heat" value={me.heat} max={100} color="#ff7d38" /></div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="sc-stat"><p className="sc-label">Income/hr</p><p className="mt-2 text-[18px] font-black text-[#36d47f]">{formatCash(me.incomePerHour)}</p></div>
            <div className="sc-stat"><p className="sc-label">Black Market</p><p className="mt-2 text-[18px] font-black text-[#ffb438]">{countdown(me.blackMarketEndsAt)}</p></div>
          </div>
          <Link href="/black-market" className="sc-button sc-button-danger mt-4 w-full">Enter Black Market</Link>
        </div>
<<<<<<< HEAD
        <VaultCard walletCash={me.cash} vaultCash={me.vaultCash} />
        <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-2">
          <p className="text-[9px] font-black tracking-[2px] text-[#aab0a3] uppercase">Black Market</p>
          <p className="text-[16px] font-black text-[#9945FF]">{formatTimer(me.blackMarketEndsAt)}</p>
          <p className="text-[11px] text-[#777]">Recovery items, contraband, and rotating risk buys.</p>
        </div>
      </div>
=======
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39

        <SeasonRankCard season={me.currentSeason} />

<<<<<<< HEAD
        {/* Core Condition */}
        <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
          <div>
            <p className="text-[10px] font-black tracking-[3px] text-[#aab0a3] uppercase">Core Condition</p>
            <p className="mt-1 text-[12px] text-[#d0d5ca]">Live stats, recovery timers, and active edge.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border border-white/10 bg-black/20 p-3">
              <p className="text-[9px] font-black tracking-[2px] text-[#aab0a3] uppercase">Health</p>
              <p className="mt-1 text-[16px] font-black text-[#ef5350]">{me.health}/{me.maxHealth}</p>
            </div>
            <div className="rounded-md border border-white/10 bg-black/20 p-3">
              <p className="text-[9px] font-black tracking-[2px] text-[#aab0a3] uppercase">Energy</p>
              <p className="mt-1 text-[16px] font-black text-[#42a5f5]">{me.energy}/{me.maxEnergy}</p>
            </div>
            <div className="rounded-md border border-white/10 bg-black/20 p-3">
              <p className="text-[9px] font-black tracking-[2px] text-[#aab0a3] uppercase">Nerve</p>
              <p className="mt-1 text-[16px] font-black text-[#ff9800]">{me.nerve}/{me.maxNerve}</p>
            </div>
            <div className="rounded-md border border-white/10 bg-black/20 p-3">
              <p className="text-[9px] font-black tracking-[2px] text-[#aab0a3] uppercase">Happiness</p>
              <p className="mt-1 text-[16px] font-black text-[#fdd835]">{me.happiness}/{me.maxHappiness}</p>
=======
        <div className="sc-panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[24px] font-black text-[#f4f5fb]">{me.syndicate?.name ?? "No Syndicate"}</p>
              <p className="mt-1 text-[11px] font-black tracking-[0.14em] uppercase text-[#6d7186]">{me.currentSyndicateRole ? `Your role: ${me.currentSyndicateRole.replaceAll("_", " ")}` : "Unaffiliated operator"}</p>
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
            </div>
            {me.currentSyndicateRole ? <SyndicateRoleBadge role={me.currentSyndicateRole} /> : null}
          </div>
<<<<<<< HEAD
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="rounded-md border border-white/10 bg-black/20 p-2 text-center text-[#66bb6a]">AP {me.ap}</div>
            <div className="rounded-md border border-white/10 bg-black/20 p-2 text-center text-[#42a5f5]">DP {me.dp}</div>
            <div className="rounded-md border border-white/10 bg-black/20 p-2 text-center text-[#ff9800]">Income {formatCash(me.incomePerHour)}/h</div>
            <div className="rounded-md border border-white/10 bg-black/20 p-2 text-center text-[#9945FF]">Perks {me.unlockedPerkSummary.total}</div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <div className="rounded-md border border-white/10 bg-black/20 p-2">
              <p className="font-black tracking-[2px] text-[#aab0a3] uppercase">Next Energy</p>
              <p className="mt-1 text-[#ddd]">{formatRecovery(me.nextEnergyAt)}</p>
            </div>
            <div className="rounded-md border border-white/10 bg-black/20 p-2">
              <p className="font-black tracking-[2px] text-[#aab0a3] uppercase">Next Nerve</p>
              <p className="mt-1 text-[#ddd]">{formatRecovery(me.nextNerveAt)}</p>
            </div>
            <div className="rounded-md border border-white/10 bg-black/20 p-2">
              <p className="font-black tracking-[2px] text-[#aab0a3] uppercase">Next Happiness</p>
              <p className="mt-1 text-[#ddd]">{formatRecovery(me.nextHappinessAt)}</p>
            </div>
          </div>
        </div>

        {/* Loadout & Protection */}
        <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
          <div>
            <p className="text-[10px] font-black tracking-[3px] text-[#aab0a3] uppercase">Loadout & Protection</p>
            <p className="mt-1 text-[12px] text-[#d0d5ca]">What is currently shaping your survival odds.</p>
          </div>
          <div className="grid gap-2 grid-cols-2">
            {me.equipmentSummary.length === 0 ? (
              <div className="rounded-md border border-white/10 bg-black/20 p-3 text-[12px] text-[#777] col-span-2">No equipped gear found.</div>
            ) : (
              me.equipmentSummary.map((item) => (
                <div key={item.itemId} className="rounded-md border border-white/10 bg-black/20 p-3">
                  <p className="text-[9px] font-black tracking-[2px] text-[#aab0a3] uppercase">{item.slot ?? "utility"}</p>
                  <p className="mt-1 text-[12px] font-bold text-[#f2f4ec]">{item.name}</p>
                  <p className="mt-1 text-[10px] text-[#d0d5ca]">{item.rarity ?? "standard"}</p>
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
=======
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="sc-stat"><p className="sc-label">Vault</p><p className="mt-2 text-[18px] font-black text-[#36d47f]">{formatCash(me.syndicateVaultSummary?.vaultCash ?? 0)}</p></div>
            <div className="sc-stat"><p className="sc-label">War Rating</p><p className="mt-2 text-[18px] font-black text-[#ff9d32]">{me.syndicateVaultSummary?.warRating ?? 0}</p></div>
            <div className="sc-stat"><p className="sc-label">Territories</p><p className="mt-2 text-[18px] font-black text-[#4f8cff]">{me.syndicateVaultSummary?.territoryCount ?? 0}</p></div>
            <div className="sc-stat"><p className="sc-label">Season Pts</p><p className="mt-2 text-[18px] font-black text-[#9f64ff]">{me.syndicateVaultSummary?.seasonPoints ?? 0}</p></div>
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
          </div>
          {me.currentWarSummary ? <div className="mt-4 rounded-xl border border-[rgba(255,93,93,0.18)] bg-[rgba(27,13,15,0.9)] px-4 py-3"><p className="text-[10px] font-black tracking-[0.18em] text-[#ff7575] uppercase">Active War</p><p className="mt-1 text-[12px] font-black text-[#f4f5fb]">{me.currentWarSummary.territory?.name ?? "Faction conflict"}</p><p className="mt-1 text-[11px] text-[#ff9d9d]">{me.currentWarSummary.attackerScore} vs {me.currentWarSummary.defenderScore}</p></div> : null}
          <Link href="/syndicates" className="sc-button mt-4 w-full">Syndicate HQ</Link>
        </div>
      </div>

<<<<<<< HEAD
      {/* Syndicate State - full width, conditional */}
      {me.syndicateVaultSummary && (
        <section className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black tracking-[3px] text-[#aab0a3] uppercase">Syndicate State</p>
              <p className="mt-1 text-[12px] text-[#d0d5ca]">Your current social power layer.</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              {me.currentSyndicateRole ? <SyndicateRoleBadge role={me.currentSyndicateRole} /> : null}
              {me.syndicate?.name ? (
                <p className="text-[9px] tracking-[1px] text-[#aab0a3] uppercase">{me.syndicate.name}</p>
              ) : null}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-md border border-white/10 bg-black/20 p-3">
              <p className="text-[9px] font-black tracking-[2px] text-[#aab0a3] uppercase">Syndicate Vault</p>
              <p className="mt-1 text-[16px] font-black text-[#fdd835]">{formatCash(me.syndicateVaultSummary.vaultCash)}</p>
            </div>
            <div className="rounded-md border border-white/10 bg-black/20 p-3">
              <p className="text-[9px] font-black tracking-[2px] text-[#aab0a3] uppercase">War Rating</p>
              <p className="mt-1 text-[16px] font-black text-[#ff8a65]">{me.syndicateVaultSummary.warRating}</p>
            </div>
            <div className="rounded-md border border-white/10 bg-black/20 p-3">
              <p className="text-[9px] font-black tracking-[2px] text-[#aab0a3] uppercase">Season Pts</p>
              <p className="mt-1 text-[16px] font-black text-[#66bb6a]">{me.syndicateVaultSummary.seasonPoints}</p>
            </div>
          </div>
        </section>
      )}

      {me.currentWarSummary && <WarScoreboard war={me.currentWarSummary} />}

      {/* Mission Board - full width */}
      <section className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black tracking-[3px] text-[#aab0a3] uppercase">Mission Board</p>
            <p className="mt-1 text-[12px] text-[#d0d5ca]">Your hottest objectives right now.</p>
          </div>
          <p className="text-[10px] font-black tracking-[2px] text-[#9945FF] uppercase">{topMissions.length} showing</p>
=======
      <section>
        <div className="mb-3"><p className="sc-kicker">Quick Actions</p><p className="mt-2 text-[26px] font-black text-[#f4f5fb]">Command Center</p></div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <QuickAction href="/crimes" title="Commit Crime" subtitle={`${me.nerve} nerve available`} tone="#ff5d5d" />
          <QuickAction href="/targets" title="Find Target" subtitle="Scan active targets" tone="#ff9d32" />
          <QuickAction href="/gym" title="Train" subtitle={`${me.energy} energy ready`} tone="#36d47f" />
          <QuickAction href="/wars" title="War Status" subtitle={me.currentWarSummary ? "Active conflict" : "No live war"} tone="#9f64ff" />
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
        </div>
      </section>

<<<<<<< HEAD
      {/* Recent Activity */}
      {events.length > 0 && (
        <section className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
          <p className="text-[10px] font-black tracking-[3px] text-[#aab0a3] uppercase">Recent Activity</p>
          <div className="flex flex-col gap-1.5">
            {events.map((event) => (
              <div key={event.id} className="flex items-center gap-2.5">
                <span
                  className="flex-shrink-0 w-2 h-2 rounded-full"
                  style={{ backgroundColor: eventDotColor(event.type) }}
                />
                <p className="flex-1 text-[11px] text-[#aaa]">{event.message}</p>
                <p className="flex-shrink-0 text-[10px] text-[#aab0a3]">{timeAgo(event.createdAt)}</p>
=======
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3"><div><p className="sc-kicker">Mission Board</p><p className="mt-2 text-[26px] font-black text-[#f4f5fb]">Active Contracts</p></div><Link href="/missions" className="sc-button">View All</Link></div>
        {topMissions.length === 0 ? <div className="sc-panel p-4 text-[12px] text-[#6b7086]">No active missions found.</div> : <div className="grid gap-3 xl:grid-cols-3">{topMissions.map((mission) => <MissionCard key={mission.id} mission={mission} />)}</div>}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <div className="sc-panel p-5">
          <div className="flex items-center gap-2"><Skull size={16} className="text-[#9f64ff]" /><p className="text-[24px] font-black text-[#f4f5fb]">Recent Activity</p></div>
          <div className="mt-4 space-y-3">
            {events.length === 0 ? <p className="text-[12px] text-[#6b7086]">No recent activity.</p> : events.map((event) => (
              <div key={event.id} className="flex items-start gap-3 rounded-xl border border-white/8 bg-[#0d0e14] px-4 py-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-[#9f64ff]" />
                <div className="flex-1"><p className="text-[12px] text-[#d8dae5]">{event.message}</p></div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#65697d]">{timeAgo(event.createdAt)}</p>
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="sc-panel p-5">
            <div className="flex items-center gap-2"><Shield size={16} className="text-[#4f8cff]" /><p className="text-[24px] font-black text-[#f4f5fb]">Protection</p></div>
            <div className="mt-4 flex flex-wrap gap-2">{me.activeProtectionEffects.length === 0 ? <span className="sc-chip">No active protection</span> : me.activeProtectionEffects.map((effect) => <span key={effect.id} className="sc-chip sc-chip-green">{effect.type.replaceAll("_", " ")} · {effect.value}</span>)}</div>
          </div>
          <div className="sc-panel p-5">
            <div className="flex items-center gap-2"><Zap size={16} className="text-[#ffb438]" /><p className="text-[24px] font-black text-[#f4f5fb]">Territory Edge</p></div>
            <div className="mt-4 space-y-2">{(me.activeTerritoryBonuses ?? []).length === 0 ? <p className="text-[12px] text-[#6b7086]">No territory bonuses active.</p> : (me.activeTerritoryBonuses ?? []).map((bonus) => <div key={bonus.territoryId} className="rounded-xl border border-white/8 bg-[#0d0e14] px-4 py-3"><p className="text-[13px] font-black text-[#f4f5fb]">{bonus.territoryName}</p><p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#7d8196]">{bonus.bonusType.replaceAll("_", " ")} · +{bonus.bonusValue}</p></div>)}</div>
          </div>
        </div>
      </section>
    </div>
  );
<<<<<<< HEAD
}


=======
}
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
