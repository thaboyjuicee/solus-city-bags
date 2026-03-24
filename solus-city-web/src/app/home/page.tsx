"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
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
  createdAt?: string;
  ts?: string;
};

function fallbackEventColor(type: string): string {
  const source = type.trim().toLowerCase() || "event";
  let hash = 0;

  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) % 360;
  }

  return `hsl(${hash} 58% 58%)`;
}

function eventDotColor(type: string, message?: string): string {
  const t = type.toLowerCase();
  const m = (message ?? "").toLowerCase();

  const eventColors: Array<[string[], string]> = [
    [["attack_loss", "attacked", "hospitalized", "defeat", "loss"], "#d84e4e"],
    [["attack_win", "attacked_npc", "victory", "win"], "#4caf62"],
    [["hospital_release"], "#4f8fd8"],
    [["crime_fail", "crime_bust"], "#d7843f"],
    [["crime_success", "crime_complete", "crime"], "#c4a044"],
    [["gym", "train"], "#5c86d6"],
    [["mission_claim", "mission_complete", "mission"], "#44b39a"],
    [["black_market_purchase"], "#7662c8"],
    [["bought_equipment", "shop", "purchase", "buy"], "#4d96d1"],
    [["vault_deposit", "syndicate_vault_deposit"], "#43b07d"],
    [["vault_withdraw", "syndicate_vault_withdraw"], "#cb9a4f"],
    [["level_up", "xp"], "#8560c5"],
    [["prestige"], "#a88245"],
    [["syndicate_role_change"], "#7588b5"],
    [["syndicate_created", "syndicate_joined"], "#5ba764"],
    [["syndicate_left", "syndicate_disbanded", "syndicate_kick"], "#c26b6b"],
    [["war_action", "war_score", "war"], "#8b7054"],
    [["territory_contribution", "territory"], "#6f945f"],
    [["season_reward", "season_finalize", "season"], "#b49055"],
    [["championship", "champion"], "#a4834c"],
    [["revenge", "revenge_resolved"], "#8d63d2"],
  ];

  if (t === "hospital") {
    if (m.includes("discharged") || m.includes("restored") || m.includes("leave the hospital")) {
      return "#4f8fd8";
    }
    return "#d97b4d";
  }

  for (const [patterns, color] of eventColors) {
    if (patterns.some((pattern) => t.includes(pattern))) {
      return color;
    }
  }

  return fallbackEventColor(t);
}

function timeAgo(ts?: string | null): string {
  if (!ts) return "recently";
  const time = new Date(ts).getTime();
  if (!Number.isFinite(time)) return "recently";
  const diffMs = Date.now() - time;
  if (!Number.isFinite(diffMs) || diffMs < 0) return "just now";
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
      <section className="relative min-h-[180px] overflow-hidden rounded-2xl border border-white/10 p-5 md:min-h-[220px] md:p-6">
  <Image
    src="/assets/images/home_skyline.png"
    alt="Solus City skyline"
    fill
    className="object-cover opacity-65"
  />
  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.18),rgba(0,0,0,0.42)),linear-gradient(90deg,rgba(0,0,0,0.72),rgba(0,0,0,0.28),rgba(0,0,0,0.6))]" />
  <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-36 md:block lg:w-44">
    <Image
      src="/assets/images/home_character.png"
      alt=""
      fill
      className="object-contain object-right-bottom opacity-55"
    />
  </div>
  <div className="relative z-10">
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-black tracking-[2px] text-[#888] uppercase">
        Solus City Operator Hub
      </span>
      {me.currentSyndicateRole ? <SyndicateRoleBadge role={me.currentSyndicateRole} /> : null}
    </div>
    <p className="text-[30px] font-black leading-none text-[#eee] md:text-[36px]">{me.name ?? "Unnamed Operator"}</p>
    <p className="mt-2 max-w-2xl text-[12px] text-[#b0b0b0]">
      Keep your wallet liquid, your vault protected, your heat controlled, and your syndicate pressure rising.
    </p>
  </div>
</section>

      {/* Top row: key stats */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-md border border-white/10 bg-black/20 p-3">
          <p className="text-[9px] font-black tracking-[2px] text-[#555] uppercase">Level</p>
          <p className="mt-1 break-words text-[15px] font-black text-[#42a5f5] sm:text-[18px]">{me.level}</p>
        </div>
        <div className="rounded-md border border-white/10 bg-black/20 p-3">
          <p className="text-[9px] font-black tracking-[2px] text-[#555] uppercase">Wallet</p>
          <p className="mt-1 break-words text-[15px] font-black text-[#66bb6a] sm:text-[18px]">{formatCash(me.cash)}</p>
        </div>
        <div className="rounded-md border border-white/10 bg-black/20 p-3">
          <p className="text-[9px] font-black tracking-[2px] text-[#555] uppercase">Vault</p>
          <p className="mt-1 break-words text-[15px] font-black text-[#42a5f5] sm:text-[18px]">{formatCash(me.vaultCash)}</p>
        </div>
        <div className="rounded-md border border-white/10 bg-black/20 p-3">
          <p className="text-[9px] font-black tracking-[2px] text-[#555] uppercase">RP</p>
          <p className="mt-1 break-words text-[15px] font-black text-[#fdd835] sm:text-[18px]">{me.rp}</p>
        </div>
        <div className="rounded-md border border-white/10 bg-black/20 p-3">
          <p className="text-[9px] font-black tracking-[2px] text-[#555] uppercase">Season</p>
          <p className="mt-1 break-words text-[15px] font-black text-[#ff8a65] sm:text-[18px]">{me.seasonScore}</p>
        </div>
        <div className="rounded-md border border-white/10 bg-black/20 p-3">
          <p className="text-[9px] font-black tracking-[2px] text-[#555] uppercase">Perk Pts</p>
          <p className="mt-1 break-words text-[15px] font-black text-[#9945FF] sm:text-[18px]">{me.availablePerkPoints}</p>
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
          <p className="break-words text-[15px] font-black text-[#9945FF] sm:text-[16px]">{formatTimer(me.blackMarketEndsAt)}</p>
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
          <div className="grid grid-cols-2 gap-2 text-[10px] sm:grid-cols-4">
            <div className="rounded-md border border-white/10 bg-black/20 p-2 text-center text-[#ff8a65]">STR {me.strength}</div>
            <div className="rounded-md border border-white/10 bg-black/20 p-2 text-center text-[#ab47bc]">SPD {me.speed}</div>
            <div className="rounded-md border border-white/10 bg-black/20 p-2 text-center text-[#42a5f5]">DEF {me.defense}</div>
            <div className="rounded-md border border-white/10 bg-black/20 p-2 text-center text-[#fdd835]">DEX {me.dexterity}</div>
          </div>
          <div className="grid grid-cols-1 gap-2 text-[10px] sm:grid-cols-3">
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
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
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
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
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
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
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
              <div key={event.id} className="flex items-start gap-2.5 sm:items-center">
                <span
                  className="flex-shrink-0 w-2 h-2 rounded-full"
                  style={{ backgroundColor: eventDotColor(event.type, event.message) }}
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                  <p className="min-w-0 flex-1 break-words text-[11px] text-[#aaa]">{event.message}</p>
                  <p className="flex-shrink-0 text-[10px] text-[#555]">{timeAgo(event.createdAt ?? event.ts)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}


