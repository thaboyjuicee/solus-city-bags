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

        <SeasonRankCard season={me.currentSeason} />

        <div className="sc-panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[24px] font-black text-[#f4f5fb]">{me.syndicate?.name ?? "No Syndicate"}</p>
              <p className="mt-1 text-[11px] font-black tracking-[0.14em] uppercase text-[#6d7186]">{me.currentSyndicateRole ? `Your role: ${me.currentSyndicateRole.replaceAll("_", " ")}` : "Unaffiliated operator"}</p>
            </div>
            {me.currentSyndicateRole ? <SyndicateRoleBadge role={me.currentSyndicateRole} /> : null}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="sc-stat"><p className="sc-label">Vault</p><p className="mt-2 text-[18px] font-black text-[#36d47f]">{formatCash(me.syndicateVaultSummary?.vaultCash ?? 0)}</p></div>
            <div className="sc-stat"><p className="sc-label">War Rating</p><p className="mt-2 text-[18px] font-black text-[#ff9d32]">{me.syndicateVaultSummary?.warRating ?? 0}</p></div>
            <div className="sc-stat"><p className="sc-label">Territories</p><p className="mt-2 text-[18px] font-black text-[#4f8cff]">{me.syndicateVaultSummary?.territoryCount ?? 0}</p></div>
            <div className="sc-stat"><p className="sc-label">Season Pts</p><p className="mt-2 text-[18px] font-black text-[#9f64ff]">{me.syndicateVaultSummary?.seasonPoints ?? 0}</p></div>
          </div>
          {me.currentWarSummary ? <div className="mt-4 rounded-xl border border-[rgba(255,93,93,0.18)] bg-[rgba(27,13,15,0.9)] px-4 py-3"><p className="text-[10px] font-black tracking-[0.18em] text-[#ff7575] uppercase">Active War</p><p className="mt-1 text-[12px] font-black text-[#f4f5fb]">{me.currentWarSummary.territory?.name ?? "Faction conflict"}</p><p className="mt-1 text-[11px] text-[#ff9d9d]">{me.currentWarSummary.attackerScore} vs {me.currentWarSummary.defenderScore}</p></div> : null}
          <Link href="/syndicates" className="sc-button mt-4 w-full">Syndicate HQ</Link>
        </div>
      </div>

      <section>
        <div className="mb-3"><p className="sc-kicker">Quick Actions</p><p className="mt-2 text-[26px] font-black text-[#f4f5fb]">Command Center</p></div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <QuickAction href="/crimes" title="Commit Crime" subtitle={`${me.nerve} nerve available`} tone="#ff5d5d" />
          <QuickAction href="/targets" title="Find Target" subtitle="Scan active targets" tone="#ff9d32" />
          <QuickAction href="/gym" title="Train" subtitle={`${me.energy} energy ready`} tone="#36d47f" />
          <QuickAction href="/wars" title="War Status" subtitle={me.currentWarSummary ? "Active conflict" : "No live war"} tone="#9f64ff" />
        </div>
      </section>

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
}
