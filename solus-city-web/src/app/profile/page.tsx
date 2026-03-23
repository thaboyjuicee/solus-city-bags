"use client";

<<<<<<< HEAD
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import { api } from "@/lib/api/client";
import { EquippedSlotCard } from "@/components/game/EquippedSlotCard";
import { HallOfFameList } from "@/components/game/HallOfFameList";
import { PerkTree } from "@/components/game/PerkTree";
import { PrestigePanel } from "@/components/game/PrestigePanel";
import { SeasonHistoryCard } from "@/components/game/SeasonHistoryCard";
import { SeasonRankCard } from "@/components/game/SeasonRankCard";
import { StatusBars } from "@/components/ui/StatusBars";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { HallOfFameEntry, InventoryResponse, InventoryRow, MeResponse, PerksResponse } from "@/lib/gameApi";
=======
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api/client";
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39

const BRANCH_COPY: Record<string, { title: string; tone: string; description: string }> = {
  enforcer: {
    title: "Enforcer Grid",
    tone: "text-[#ff9d6b]",
    description: "Pressure, loot edge, revenge leverage, and direct PvP momentum.",
  },
  hustler: {
    title: "Hustler Grid",
    tone: "text-[#d9a7ff]",
    description: "Crime yield, market leverage, and better control over wanted heat.",
  },
  grinder: {
    title: "Grinder Grid",
    tone: "text-[#7ef0c5]",
    description: "Training efficiency, recovery, and long-haul account resilience.",
  },
};

function money(value?: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function pct(current?: number, max?: number) {
  if (!max || max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((Number(current ?? 0) / Number(max)) * 100)));
}

function sectionCard(title: string, value: string, note?: string) {
  return (
<<<<<<< HEAD
    <div className="rounded-md border border-white/10 bg-black/20 p-2 text-center">
      <p className="text-[8px] text-[#aab0a3] font-bold tracking-[2px] uppercase">{label}</p>
      <p className={`text-[13px] font-black mt-0.5 ${color ?? "text-[#f2f4ec]"}`}>{value}</p>
=======
    <div className="sc-stat">
      <div className="sc-label">{title}</div>
      <div className="sc-value">{value}</div>
      {note ? <div className="mt-2 text-xs text-white/45">{note}</div> : null}
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
    </div>
  );
}

function isCrewRow(row: InventoryRow) {
  const category = row.item.category?.toLowerCase() ?? "";
  const subCategory = row.item.subCategory?.toLowerCase() ?? "";
  return category === "unit" || subCategory === "crew";
}

export default function ProfilePage() {
<<<<<<< HEAD
  const [me, setMe] = useState<MeResponse | null>(null);
  const [perks, setPerks] = useState<PerksResponse | null>(null);
  const [hallOfFame, setHallOfFame] = useState<HallOfFameEntry[]>([]);
  const [inventory, setInventory] = useState<InventoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nameEdit, setNameEdit] = useState<string | null>(null);
  const [nameBusy, setNameBusy] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [meRes, perksRes, historyRes, inventoryRes] = await Promise.all([
        api.get<MeResponse>("/me"),
        api.get<PerksResponse>("/perks"),
        api.get<{ hallOfFameHighlights: HallOfFameEntry[] }>("/seasons/history"),
        api.get<InventoryResponse>("/inventory"),
      ]);
      setMe(meRes.data);
      setPerks(perksRes.data);
      setHallOfFame(historyRes.data.hallOfFameHighlights ?? []);
      setInventory(inventoryRes.data);
      setError(null);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }, []);
=======
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const [me, inventory, perks, season] = await Promise.all([
          api.get<any>("/me"),
          api.get<any>("/inventory").catch(() => null),
          api.get<any>("/perks").catch(() => null),
          api.get<any>("/seasons/current").catch(() => null),
        ]);

        if (!cancelled) {
          setData({
            me: me.data,
            inventory: inventory?.data ?? null,
            perks: perks?.data ?? null,
            season: season?.data ?? null,
          });
          setError(null);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? "Could not load profile.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

<<<<<<< HEAD
  const crewRows = useMemo(() => (!inventory ? [] : [...inventory.utilities, ...inventory.general].filter(isCrewRow)), [inventory]);
  const crewCount = crewRows.reduce((sum, row) => sum + row.qty, 0);

  if (loading) return <div className="flex min-h-dvh items-center justify-center"><LoadingSpinner size={32} /></div>;
  if (!me || !perks || !inventory) return <div className="flex min-h-dvh items-center justify-center text-[#ef5350]">{error ?? "Profile unavailable"}</div>;
=======
    load();
    return () => {
      cancelled = true;
    };
  }, []);
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39

  const equipped = useMemo(() => data?.inventory?.equipped ?? data?.inventory?.groups?.equipped ?? [], [data]);
  const definitions = data?.perks?.definitions ?? [];
  const unlockedRows = data?.perks?.unlockedPerks ?? data?.perks?.unlocked ?? [];
  const unlockedIds = new Set(unlockedRows.map((item: any) => item.perkDefinitionId ?? item.id ?? item.code));
  const branchSummary = ["enforcer", "hustler", "grinder"].map((branch) => {
    const rows = definitions.filter((perk: any) => perk.branch === branch);
    const unlocked = rows.filter((perk: any) => unlockedIds.has(perk.id) || unlockedIds.has(perk.code));
    return {
      branch,
      total: rows.length,
      unlocked: unlocked.length,
      next: rows.find((perk: any) => !(unlockedIds.has(perk.id) || unlockedIds.has(perk.code))),
      ...BRANCH_COPY[branch],
    };
  });

  const season = data?.season?.season ?? data?.season?.currentSeason ?? data?.me?.currentSeason ?? null;
  const scoreBreakdown = data?.season?.scoreBreakdown ?? data?.me?.currentSeason?.scoreBreakdown ?? {};

  if (loading) {
    return (
      <div className="space-y-6">
        <section className="sc-panel-strong animate-pulse p-6 md:p-7">
          <div className="h-5 w-40 rounded-full bg-white/10" />
          <div className="mt-4 h-12 w-64 rounded-2xl bg-white/10" />
          <div className="mt-6 grid gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 rounded-3xl border border-white/10 bg-white/5" />
            ))}
          </div>
        </section>
      </div>
    );
  }

  if (error || !data?.me) {
    return <div className="sc-panel-strong p-6 text-sm text-red-200">{error ?? "Profile unavailable."}</div>;
  }

  const me = data.me;
  const wantedTier = String(me.wantedTier ?? "low").replaceAll("_", " ");
  const projectedTier = String(me.projectedSeasonRewardTier ?? data?.season?.projectedTier ?? "Scout").replaceAll("_", " ");

  return (
<<<<<<< HEAD
    <div className="flex flex-col gap-4">
      <StatusBars profile={me} />

      <div className="rounded-lg border border-white/10 bg-black/20 p-4">
        <p className="text-[10px] font-black tracking-[3px] text-[#aab0a3] uppercase">Profile</p>
        <div className="flex items-center gap-2 mt-1">
          {nameEdit !== null ? (
            <>
              <input autoFocus value={nameEdit} onChange={(e) => setNameEdit(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveName()} className="flex-1 rounded border border-white/10 bg-black/20 px-2 py-1 text-[16px] font-black text-[#f2f4ec] outline-none" />
              <button onClick={saveName} disabled={nameBusy} className="text-[#66bb6a] disabled:opacity-40"><Check size={16} /></button>
              <button onClick={() => setNameEdit(null)} className="text-[#aab0a3]"><X size={16} /></button>
            </>
          ) : (
            <>
              <p className="text-[20px] font-black text-[#f2f4ec]">{me.name || "Unnamed Operator"}</p>
              <button onClick={() => setNameEdit(me.name ?? "")} className="text-[#aab0a3] hover:text-[#aaa]"><Pencil size={13} /></button>
            </>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3 text-center">
          <div className="rounded-md border border-white/10 bg-black/20 p-3"><p className="text-[9px] text-[#aab0a3] font-bold tracking-[2px]">LEVEL</p><p className="text-[16px] font-black text-[#42a5f5]">{me.level}</p></div>
          <div className="rounded-md border border-white/10 bg-black/20 p-3"><p className="text-[9px] text-[#aab0a3] font-bold tracking-[2px]">SEASON</p><p className="text-[16px] font-black text-[#66bb6a]">{me.seasonScore}</p></div>
          <div className="rounded-md border border-white/10 bg-black/20 p-3"><p className="text-[9px] text-[#aab0a3] font-bold tracking-[2px]">PRESTIGE</p><p className="text-[16px] font-black text-[#fdd835]">{me.prestigeLevel}</p></div>
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
        <p className="text-[10px] font-black tracking-[3px] text-[#aab0a3] uppercase">Stats</p>
        <div className="grid grid-cols-4 gap-1.5">
          <StatBox label="ATK" value={me.ap} color="text-[#ef5350]" />
          <StatBox label="DEF" value={me.dp} color="text-[#42a5f5]" />
          <StatBox label="STR" value={me.strength} color="text-[#ff8a65]" />
          <StatBox label="SPD" value={me.speed} color="text-[#66bb6a]" />
          <StatBox label="DEF" value={me.defense} color="text-[#42a5f5]" />
          <StatBox label="DEX" value={me.dexterity} color="text-[#fdd835]" />
          <StatBox label="CASH" value={`$${Math.floor(me.cash).toLocaleString()}`} color="text-[#66bb6a]" />
          <StatBox label="$/HR" value={`$${Math.floor(me.incomePerHour).toLocaleString()}`} color="text-[#aaa]" />
        </div>
        <div className="flex flex-col gap-1 mt-2">
          {me.syndicate && <div className="flex items-center gap-2"><span className="text-[9px] font-bold tracking-[2px] text-[#444] uppercase w-[72px] shrink-0">Syndicate</span><span className="text-[10px] font-bold text-[#9945FF]">{me.syndicate.name}</span></div>}
          {shieldActive && <div className="flex items-center gap-2"><span className="text-[9px] font-bold tracking-[2px] text-[#444] uppercase w-[72px] shrink-0">Shield</span><span className="text-[10px] font-bold text-[#42a5f5]">Active</span></div>}
          {me.inHospital && <div className="flex items-center gap-2"><span className="text-[9px] font-bold tracking-[2px] text-[#444] uppercase w-[72px] shrink-0">Status</span><span className="text-[10px] font-bold text-[#ef5350]">Hospitalized</span></div>}
          {me.activeProtectionEffects.map((effect) => <div key={effect.id} className="flex items-center gap-2"><span className="text-[9px] font-bold tracking-[2px] text-[#444] uppercase w-[72px] shrink-0">Active Effect</span><span className="text-[10px] font-bold text-[#fdd835]">{effect.type.replaceAll("_", " ")}</span></div>)}
        </div>
      </div>

      <SeasonRankCard season={me.currentSeason} />

      <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black tracking-[3px] text-[#aab0a3] uppercase">Force Readiness</p>
            <p className="text-[11px] text-[#d0d5ca] mt-1">Crew is tracked as its own force layer. Equipment stays a separate loadout system.</p>
          </div>
          <p className="text-[12px] font-black text-[#66bb6a]">{crewCount} crew</p>
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          <div className="rounded-md border border-white/10 bg-black/20 p-3"><p className="text-[9px] text-[#aab0a3] font-bold tracking-[2px]">CREW</p><p className="text-[14px] font-black text-[#f2f4ec]">{crewCount}</p></div>
          <div className="rounded-md border border-white/10 bg-black/20 p-3"><p className="text-[9px] text-[#aab0a3] font-bold tracking-[2px]">EQUIPPED GEAR</p><p className="text-[14px] font-black text-[#42a5f5]">{me.equipmentSummary.length}</p></div>
          <div className="rounded-md border border-white/10 bg-black/20 p-3"><p className="text-[9px] text-[#aab0a3] font-bold tracking-[2px]">VAULT</p><p className="text-[14px] font-black text-[#d0d5ca]">${Math.floor(me.vaultCash).toLocaleString()}</p></div>
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          {crewRows.length > 0 ? crewRows.slice(0, 3).map((row) => (
            <div key={row.inventoryItemId} className="rounded-md border border-white/10 bg-black/20 p-3">
              <p className="text-[9px] text-[#aab0a3] font-bold tracking-[2px] uppercase">{row.item.subCategory ?? row.item.category ?? "crew"}</p>
              <p className="mt-1 text-[12px] font-bold text-[#f2f4ec]">{row.item.name}</p>
              <p className="mt-1 text-[10px] text-[#d0d5ca]">Owned {row.qty}</p>
            </div>
          )) : <div className="rounded-md border border-white/10 bg-black/20 p-3 text-[11px] text-[#aab0a3] md:col-span-3">No crew assets in storage yet. Recruit force separately from utility gear to strengthen your roster.</div>}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <PrestigePanel prestigeLevel={me.prestigeLevel} prestigePoints={me.prestigePoints} preview={me.prestigeSummary} />
        <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
          <p className="text-[10px] font-black tracking-[3px] text-[#aab0a3] uppercase">Projected Rewards</p>
          <div className="grid gap-2 md:grid-cols-3">
            <div className="rounded-md border border-white/10 bg-black/20 p-3"><p className="text-[9px] text-[#aab0a3] font-bold tracking-[2px]">OVERALL</p><p className="text-[14px] font-black text-[#66bb6a]">{me.projectedSeasonRewards?.overall?.label ?? "-"}</p></div>
            <div className="rounded-md border border-white/10 bg-black/20 p-3"><p className="text-[9px] text-[#aab0a3] font-bold tracking-[2px]">PVP</p><p className="text-[14px] font-black text-[#42a5f5]">{me.projectedSeasonRewards?.pvp?.label ?? "-"}</p></div>
            <div className="rounded-md border border-white/10 bg-black/20 p-3"><p className="text-[9px] text-[#aab0a3] font-bold tracking-[2px]">CRIME</p><p className="text-[14px] font-black text-[#ff8a65]">{me.projectedSeasonRewards?.crime?.label ?? "-"}</p></div>
=======
    <div className="space-y-6 pb-12">
      <section className="sc-panel-strong overflow-hidden p-6 md:p-7">
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="sc-kicker">PLAYER DOSSIER</span>
              <span className="sc-chip sc-chip-purple">Prestige {me.prestigeLevel ?? 0}</span>
              <span className="sc-chip sc-chip-red">{wantedTier}</span>
              {me.syndicateName ? <span className="sc-chip sc-chip-green">{me.syndicateName}</span> : null}
            </div>
            <div>
              <h1 className="sc-page-title">{me.name ?? "Operator"}</h1>
              <p className="sc-subtitle max-w-3xl">
                Your profile is now split into clear operating blocks: condition, economy, combat build, and long-term meta progression.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {sectionCard("Wallet", money(me.cash), "Active on-hand spend and PvP risk.")}
              {sectionCard("Vault", money(me.vaultCash), "Protected reserves outside wallet theft.")}
              {sectionCard("Season score", Number(me.seasonScore ?? season?.playerScore ?? 0).toLocaleString(), "Current season contribution.")}
              {sectionCard("Perk points", String(Number(me.availablePerkPoints ?? data?.perks?.availablePoints ?? 0)), "Unspent account power.")}
            </div>
          </div>

          <div className="sc-panel p-5">
            <div className="sc-kicker">STATUS</div>
            <div className="mt-3 grid gap-4">
              <div>
                <div className="flex items-center justify-between text-sm text-white/65"><span>Health</span><span>{me.hp ?? 0}/{me.maxHp ?? 0}</span></div>
                <div className="sc-progress mt-2"><span style={{ width: `${pct(me.hp, me.maxHp)}%`, background: "linear-gradient(90deg, #34d399, #86efac)" }} /></div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm text-white/65"><span>Energy</span><span>{me.energy ?? 0}/{me.maxEnergy ?? 0}</span></div>
                <div className="sc-progress mt-2"><span style={{ width: `${pct(me.energy, me.maxEnergy)}%`, background: "linear-gradient(90deg, #8b5cf6, #d8b4fe)" }} /></div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm text-white/65"><span>Nerve</span><span>{me.nerve ?? 0}/{me.maxNerve ?? 0}</span></div>
                <div className="sc-progress mt-2"><span style={{ width: `${pct(me.nerve, me.maxNerve)}%`, background: "linear-gradient(90deg, #f59e0b, #fcd34d)" }} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm text-white/70">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="sc-label">Attack</div>
                  <div className="mt-1 text-lg font-semibold text-white">{Number(me.attack ?? me.ap ?? 0).toLocaleString()}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="sc-label">Defense</div>
                  <div className="mt-1 text-lg font-semibold text-white">{Number(me.defense ?? me.dp ?? 0).toLocaleString()}</div>
                </div>
              </div>
            </div>
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="sc-panel-strong p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="sc-kicker">COMBAT BUILD</div>
              <h2 className="mt-2 text-2xl font-black text-white">Loadout and readiness</h2>
            </div>
            <Link href="/inventory" className="sc-button">Open inventory</Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {equipped.length ? (
              equipped.map((item: any) => (
                <div key={item.id} className="rounded-[26px] border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-white">{item.item?.name ?? item.name ?? "Equipped item"}</div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.24em] text-white/35">{item.item?.slot ?? item.slot ?? "utility"}</div>
                    </div>
                    <span className="sc-chip sc-chip-green">equipped</span>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-white/60">
                    {item.item?.effectType ? <div>Effect: {String(item.item.effectType).replaceAll("_", " ")}</div> : null}
                    {item.durability != null ? <div>Durability: {item.durability}</div> : null}
                    {item.item?.rarity ? <div>Rarity: {item.item.rarity}</div> : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[26px] border border-dashed border-white/12 bg-white/[0.04] p-5 text-sm text-white/55 md:col-span-2 xl:col-span-3">
                No equipment is active. Slotted gear only affects combat when equipped.
              </div>
            )}
          </div>
        </div>

        <div className="sc-panel-strong p-6">
          <div className="sc-kicker">META LOOP</div>
          <h2 className="mt-2 text-2xl font-black text-white">Season and prestige</h2>
          <div className="mt-5 space-y-3">
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <div className="sc-label">Active season</div>
              <div className="mt-2 text-lg font-semibold text-white">{season?.name ?? "No active season"}</div>
              <div className="mt-1 text-sm text-white/55">Rank {season?.playerRank ?? data?.season?.playerRank ?? "-"}</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <div className="sc-label">Projected reward</div>
                <div className="mt-2 text-lg font-semibold text-[#ffd36b]">{projectedTier}</div>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <div className="sc-label">Prestige eligibility</div>
                <div className={`mt-2 text-lg font-semibold ${me.prestigeEligibility?.eligible ? "text-[#7ef0c5]" : "text-[#ff8d8d]"}`}>
                  {me.prestigeEligibility?.eligible ? "Ready" : "Locked"}
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4"><div className="sc-label">PvP</div><div className="mt-2 text-lg font-semibold text-white">{Number(scoreBreakdown?.pvpScore ?? 0).toLocaleString()}</div></div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4"><div className="sc-label">Crime</div><div className="mt-2 text-lg font-semibold text-white">{Number(scoreBreakdown?.crimeScore ?? 0).toLocaleString()}</div></div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4"><div className="sc-label">Mission</div><div className="mt-2 text-lg font-semibold text-white">{Number(scoreBreakdown?.missionScore ?? 0).toLocaleString()}</div></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link href="/prestige" className="sc-button sc-button-primary justify-center">Open prestige room</Link>
              <Link href="/seasons" className="sc-button justify-center">Open season room</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="sc-panel-strong p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
<<<<<<< HEAD
            <p className="text-[10px] font-black tracking-[3px] text-[#aab0a3] uppercase">Equipment</p>
            <p className="text-[11px] text-[#d0d5ca]">Current visible loadout summary.</p>
=======
            <div className="sc-kicker">PERK BRANCHES</div>
            <h2 className="mt-2 text-2xl font-black text-white">Branch posture</h2>
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
          </div>
          <span className="sc-chip sc-chip-purple">{unlockedRows.length} unlocked</span>
        </div>
<<<<<<< HEAD
        <div className="grid gap-2 md:grid-cols-3">
          <EquippedSlotCard slot="weapon" name={equipmentBySlot.get("weapon")?.name} rarity={equipmentBySlot.get("weapon")?.rarity} />
          <EquippedSlotCard slot="armor" name={equipmentBySlot.get("armor")?.name} rarity={equipmentBySlot.get("armor")?.rarity} />
          <EquippedSlotCard slot="utility" name={equipmentBySlot.get("utility")?.name} rarity={equipmentBySlot.get("utility")?.rarity} />
        </div>
      </div>

      {me.seasonHistoryPreview && me.seasonHistoryPreview.length > 0 && (
        <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
          <p className="text-[10px] font-black tracking-[3px] text-[#aab0a3] uppercase">Recent Seasons</p>
          {me.seasonHistoryPreview.map((entry) => <SeasonHistoryCard key={entry.season.id} entry={entry} />)}
        </div>
      )}

      <HallOfFameList entries={hallOfFame} />
      <PerkTree data={{ ...perks, availablePoints: me.availablePerkPoints }} onUpdated={fetchData} />
=======
        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          {branchSummary.map((branch) => (
            <div key={branch.branch} className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="sc-label">{branch.title}</div>
                  <div className={`mt-2 text-xl font-black ${branch.tone}`}>{branch.unlocked}/{branch.total}</div>
                </div>
                <span className="sc-chip">{branch.branch}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/60">{branch.description}</p>
              <div className="sc-progress mt-4"><span style={{ width: `${branch.total ? Math.round((branch.unlocked / branch.total) * 100) : 0}%` }} /></div>
              <div className="mt-4 text-sm text-white/60">
                Next target: <span className="font-semibold text-white">{branch.next?.name ?? "Branch complete"}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
    </div>
  );
}