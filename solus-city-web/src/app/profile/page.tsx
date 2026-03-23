"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api/client";

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
    <div className="sc-stat">
      <div className="sc-label">{title}</div>
      <div className="sc-value">{value}</div>
      {note ? <div className="mt-2 text-xs text-white/45">{note}</div> : null}
    </div>
  );
}

export default function ProfilePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    load();
    return () => {
      cancelled = true;
    };
  }, []);

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
            <div className="sc-kicker">PERK BRANCHES</div>
            <h2 className="mt-2 text-2xl font-black text-white">Branch posture</h2>
          </div>
          <span className="sc-chip sc-chip-purple">{unlockedRows.length} unlocked</span>
        </div>
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
    </div>
  );
}