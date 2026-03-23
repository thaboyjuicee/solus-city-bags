"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api/client";

function normalizeTerritories(payload: any) {
  if (Array.isArray(payload)) return payload;
  return payload?.territories ?? payload?.items ?? [];
}

function money(value?: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

export default function TerritoriesPage() {
  const [territories, setTerritories] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [filter, setFilter] = useState<"all" | "owned" | "neutral" | "contested">("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const [territoryPayload, mePayload] = await Promise.all([
        api.get<any>("/territories"),
        api.get<any>("/me").catch(() => null),
      ]);
      setTerritories(normalizeTerritories(territoryPayload.data));
      setMe(mePayload?.data ?? null);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? "Could not load territories.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(() => {
    return territories.filter((territory) => {
      const ownerId = territory.ownerSyndicateId ?? territory.syndicateId ?? territory.owner?.id;
      const mine = ownerId && me?.syndicateId && ownerId === me.syndicateId;
      const contested = String(territory.decayState ?? territory.contestState ?? "stable").toLowerCase() !== "stable";
      if (filter === "owned") return mine;
      if (filter === "neutral") return !ownerId;
      if (filter === "contested") return contested;
      return true;
    });
  }, [territories, filter, me]);

  const stats = useMemo(() => {
    return territories.reduce(
      (acc, territory) => {
        if (territory.ownerSyndicateId ?? territory.syndicateId ?? territory.owner?.id) acc.controlled += 1;
        if (String(territory.decayState ?? territory.contestState ?? "stable").toLowerCase() !== "stable") acc.contested += 1;
        acc.influence += Number(territory.influence ?? territory.control?.influence ?? 0);
        return acc;
      },
      { controlled: 0, contested: 0, influence: 0 },
    );
  }, [territories]);

  const handleContribute = async (territoryId: string, actionType: string) => {
    try {
      setBusy(`${territoryId}:${actionType}`);
      await api.post(`/territories/${territoryId}/contribute`, { actionType });
      await load();
    } catch (err: any) {
      setError(err?.message ?? "Contribution failed.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <section className="sc-panel-strong overflow-hidden p-6 md:p-7">
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="sc-kicker">TERRITORY GRID</span>
              <span className="sc-chip sc-chip-orange">{stats.contested} contested</span>
              {me?.syndicateName ? <span className="sc-chip sc-chip-green">{me.syndicateName}</span> : null}
            </div>
            <div>
              <h1 className="sc-page-title">Hold districts, earn modest bonuses</h1>
              <p className="sc-subtitle max-w-3xl">
                Every block should matter without snowballing the whole economy. This board makes the local control story visible: owner, influence, decay state, and what your crew can do next.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="sc-stat">
                <div className="sc-label">Controlled districts</div>
                <div className="sc-value">{stats.controlled}</div>
              </div>
              <div className="sc-stat">
                <div className="sc-label">Total influence</div>
                <div className="sc-value">{stats.influence.toLocaleString()}</div>
              </div>
              <div className="sc-stat">
                <div className="sc-label">Contested zones</div>
                <div className="sc-value">{stats.contested}</div>
                <div className="mt-2 text-xs text-white/45">Unstable districts need attention before control slips.</div>
              </div>
            </div>
          </div>
          <div className="sc-panel p-5">
            <div className="sc-kicker">CONTRIBUTION OPTIONS</div>
            <div className="mt-3 text-2xl font-black text-white">Three safe Wave 3 actions</div>
            <div className="mt-3 space-y-3 text-sm leading-6 text-white/60">
              <p><span className="font-semibold text-white">Donate cash</span> pushes influence with an actual cost.</p>
              <p><span className="font-semibold text-white">Complete local task</span> represents non-cash district effort.</p>
              <p><span className="font-semibold text-white">War control action</span> lets active conflicts bleed into local control where appropriate.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap gap-2">
        {(["all", "owned", "neutral", "contested"] as const).map((value) => (
          <button key={value} type="button" className={filter === value ? "sc-button sc-button-primary" : "sc-button"} onClick={() => setFilter(value)}>
            {value}
          </button>
        ))}
      </section>

      {error ? <div className="sc-panel border border-red-500/30 p-4 text-sm text-red-200">{error}</div> : null}

      {loading ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-64 animate-pulse rounded-[32px] border border-white/10 bg-white/5" />
          ))}
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {visible.map((territory) => {
            const owner = territory.owner?.name ?? territory.ownerSyndicateName ?? territory.syndicate?.name ?? "Unclaimed";
            const bonusType = String(territory.bonusType ?? "district_bonus").replaceAll("_", " ");
            const bonusValue = territory.bonusValue ?? 0;
            const influence = Number(territory.influence ?? territory.control?.influence ?? 0);
            const decayState = String(territory.decayState ?? territory.contestState ?? "stable").replaceAll("_", " ");
            const myDistrict = (territory.ownerSyndicateId ?? territory.syndicateId ?? territory.owner?.id) === me?.syndicateId;

            return (
              <section key={territory.id} className="sc-panel-strong overflow-hidden p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="sc-kicker">{territory.code ?? "district"}</div>
                    <h2 className="mt-2 text-2xl font-black text-white">{territory.name}</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {myDistrict ? <span className="sc-chip sc-chip-green">owned</span> : null}
                    <span className={decayState === "stable" ? "sc-chip" : "sc-chip sc-chip-orange"}>{decayState}</span>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                    <div className="sc-label">Owner</div>
                    <div className="mt-2 text-lg font-semibold text-white">{owner}</div>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                    <div className="sc-label">Bonus</div>
                    <div className="mt-2 text-lg font-semibold text-white">{bonusType}</div>
                    <div className="mt-1 text-sm text-[#7ef0c5]">+{bonusValue}</div>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                    <div className="sc-label">Influence</div>
                    <div className="mt-2 text-lg font-semibold text-white">{influence.toLocaleString()}</div>
                  </div>
                </div>

                <div className="mt-5 overflow-hidden rounded-full border border-white/10 bg-black/30">
                  <div className="h-3 bg-gradient-to-r from-[#7c3aed] via-[#ec4899] to-[#f59e0b]" style={{ width: `${Math.max(10, Math.min(100, influence))}%` }} />
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <button type="button" className="sc-button justify-center" disabled={busy === `${territory.id}:donate_cash`} onClick={() => handleContribute(territory.id, "donate_cash")}>{busy === `${territory.id}:donate_cash` ? "Sending..." : `Donate ${money(5000)}`}</button>
                  <button type="button" className="sc-button sc-button-primary justify-center" disabled={busy === `${territory.id}:complete_local_task`} onClick={() => handleContribute(territory.id, "complete_local_task")}>{busy === `${territory.id}:complete_local_task` ? "Applying..." : "Complete local task"}</button>
                  <button type="button" className="sc-button sc-button-orange justify-center" disabled={busy === `${territory.id}:war_control_action`} onClick={() => handleContribute(territory.id, "war_control_action")}>{busy === `${territory.id}:war_control_action` ? "Routing..." : "War control action"}</button>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
