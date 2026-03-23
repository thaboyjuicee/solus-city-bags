"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api/client";

function normalizeQualifiers(payload: any) {
  if (Array.isArray(payload)) return payload;
  return payload?.qualifiers ?? payload?.entries ?? [];
}

function normalizeMatches(payload: any) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.matches)) return payload.matches;
  if (Array.isArray(payload?.rounds)) {
    return payload.rounds.flatMap((round: any) => round.matches ?? []);
  }
  return [];
}

function groupByRound(matches: any[]) {
  return matches.reduce((acc, match) => {
    const round = Number(match.round ?? 1);
    if (!acc[round]) acc[round] = [];
    acc[round].push(match);
    return acc;
  }, {} as Record<number, any[]>);
}

export default function ChampionshipsPage() {
  const [current, setCurrent] = useState<any>(null);
  const [qualifiers, setQualifiers] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const [currentPayload, qualifierPayload, bracketPayload] = await Promise.all([
          api.get<any>("/championships/current"),
          api.get<any>("/championships/qualifiers").catch(() => null),
          api.get<any>("/championships/bracket").catch(() => null),
        ]);

        if (!cancelled) {
          setCurrent(currentPayload.data?.championship ?? currentPayload.data?.current ?? currentPayload.data ?? null);
          setQualifiers(normalizeQualifiers(qualifierPayload?.data ?? null));
          setMatches(normalizeMatches(bracketPayload?.data ?? null));
          setError(null);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? "Could not load championships.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const rounds = useMemo(() => groupByRound(matches), [matches]);
  const roundKeys = useMemo(() => Object.keys(rounds).map(Number).sort((a, b) => a - b), [rounds]);

  return (
<<<<<<< HEAD
    <div className="flex flex-col gap-4">
      {current && (
        <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black tracking-[3px] text-[#aab0a3] uppercase">Current Championship</p>
            <p className="text-[18px] font-black text-[#f2f4ec]">{current.season.name}</p>
          </div>
          <p className="text-[11px] font-black tracking-[2px] text-[#fdd835] uppercase">{current.status}</p>
        </div>
      )}

      {qualifiers && qualifiers.length > 0 && (
        <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
          <p className="text-[10px] font-black tracking-[3px] text-[#aab0a3] uppercase">Qualifiers</p>
          {qualifiers.map((entry) => (
            <div key={entry.syndicate.id} className="rounded-md border border-white/10 bg-black/20 p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[12px] font-bold text-[#f2f4ec]">#{entry.seed} {entry.syndicate.name}</p>
                <p className="text-[10px] text-[#777]">Qualifier score {entry.qualifyingPoints}</p>
              </div>
              <p className="text-[9px] uppercase tracking-[2px] text-[#66bb6a]">Qualified</p>
=======
    <div className="space-y-6 pb-12">
      <section className="sc-panel-strong overflow-hidden p-6 md:p-7">
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="sc-kicker">SYNDICATE CHAMPIONSHIP</span>
              <span className="sc-chip sc-chip-purple">{String(current?.status ?? "planned").replaceAll("_", " ")}</span>
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
            </div>
            <div>
              <h1 className="sc-page-title">The prestige bracket above street war</h1>
              <p className="sc-subtitle max-w-3xl">
                This is the high-level social chase loop: qualified crews, deterministic seeding, bounded rounds, and a clear route to champion status without turning the game into an esports simulator.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="sc-stat">
                <div className="sc-label">Qualifier count</div>
                <div className="sc-value">{qualifiers.length}</div>
              </div>
              <div className="sc-stat">
                <div className="sc-label">Bracket matches</div>
                <div className="sc-value">{matches.length}</div>
              </div>
              <div className="sc-stat">
                <div className="sc-label">Current round</div>
                <div className="sc-value">{current?.round ?? roundKeys[0] ?? 1}</div>
              </div>
            </div>
          </div>

          <div className="sc-panel p-5">
            <div className="sc-kicker">CHAMPION WATCH</div>
            <div className="mt-3 text-2xl font-black text-white">{current?.championName ?? current?.winnerSyndicate?.name ?? "Champion undecided"}</div>
            <div className="mt-3 space-y-3 text-sm leading-6 text-white/60">
              <p>Qualification is derived from season-era syndicate performance.</p>
              <p>Rounds advance on a deterministic schedule with safe tie resolution.</p>
              <p>When a champion is declared, the result becomes part of season history and hall of fame context.</p>
            </div>
          </div>
        </div>
      </section>

      {error ? <div className="sc-panel border border-red-500/30 p-4 text-sm text-red-200">{error}</div> : null}

      <section className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
        <div className="sc-panel-strong p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="sc-kicker">QUALIFIERS</div>
              <h2 className="mt-2 text-2xl font-black text-white">Seeded entrants</h2>
            </div>
            <span className="sc-chip">top crews</span>
          </div>

          <div className="mt-5 space-y-3">
            {loading
              ? Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded-[24px] border border-white/10 bg-white/5" />)
              : qualifiers.map((entry, index) => (
                  <div key={entry.id ?? `${entry.syndicateId}-${index}`} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-white">{entry.syndicate?.name ?? entry.syndicateName ?? "Qualified syndicate"}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.24em] text-white/35">Seed #{entry.seed ?? index + 1}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs uppercase tracking-[0.24em] text-white/35">Qualifying points</div>
                        <div className="mt-1 text-lg font-semibold text-white">{Number(entry.qualifyingPoints ?? entry.points ?? 0).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                ))}
          </div>
        </div>

        <div className="sc-panel-strong p-6">
          <div>
            <div className="sc-kicker">BRACKET</div>
            <h2 className="mt-2 text-2xl font-black text-white">Round structure</h2>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            {(roundKeys.length ? roundKeys : [1]).map((round) => {
              const roundMatches = rounds[round] ?? [];
              return (
                <div key={round} className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="sc-label">Round {round}</div>
                    <span className="sc-chip">{roundMatches.length} matches</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {roundMatches.length ? (
                      roundMatches.map((match: any) => (
                        <div key={match.id} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                          <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.24em] text-white/35">
                            <span>{String(match.status ?? "scheduled").replaceAll("_", " ")}</span>
                            <span>{match.startsAt ? new Date(match.startsAt).toLocaleDateString() : "TBD"}</span>
                          </div>
                          <div className="mt-3 space-y-2">
                            <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#8b5cf6]/25 bg-[#8b5cf6]/10 px-3 py-2">
                              <span className="font-semibold text-white">{match.syndicateA?.name ?? match.syndicateAName ?? "Syndicate A"}</span>
                              <span className="text-lg font-black text-[#d8b4fe]">{match.scoreA ?? 0}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#ef4444]/25 bg-[#ef4444]/10 px-3 py-2">
                              <span className="font-semibold text-white">{match.syndicateB?.name ?? match.syndicateBName ?? "Syndicate B"}</span>
                              <span className="text-lg font-black text-[#fca5a5]">{match.scoreB ?? 0}</span>
                            </div>
                          </div>
                          <div className="mt-3 text-sm text-white/55">
                            Winner: <span className="font-semibold text-white">{match.winnerSyndicate?.name ?? match.winnerSyndicateName ?? "Pending"}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[22px] border border-dashed border-white/12 bg-white/[0.03] p-4 text-sm text-white/45">
                        Matches for this round will appear once the bracket is generated.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}


