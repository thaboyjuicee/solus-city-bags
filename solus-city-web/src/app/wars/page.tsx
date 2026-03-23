"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api/client";

function normalizeWars(payload: any) {
  if (Array.isArray(payload)) return payload;
  return payload?.activeWars ?? payload?.wars ?? payload?.items ?? [];
}

function formatTimer(value?: string) {
  if (!value) return "No timer";
  const ms = new Date(value).getTime() - Date.now();
  if (Number.isNaN(ms)) return value;
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

export default function WarsPage() {
  const [wars, setWars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const payload = (await api.get<any>("/wars/current")).data;
      setWars(normalizeWars(payload));
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? "Could not load wars.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const totals = useMemo(() => {
    return wars.reduce(
      (acc, war) => {
        acc.score += Number(war.attackerScore ?? 0) + Number(war.defenderScore ?? 0);
        if ((war.status ?? "").toLowerCase() === "active") acc.active += 1;
        return acc;
      },
      { score: 0, active: 0 },
    );
  }, [wars]);

  const handleJoin = async (warId: string) => {
    try {
      setBusy(`${warId}:join`);
      await api.post(`/wars/${warId}/join`, {});
      await load();
    } catch (err: any) {
      setError(err?.message ?? "Could not join war.");
    } finally {
      setBusy(null);
    }
  };

  const handleAction = async (warId: string, actionType: string) => {
    try {
      setBusy(`${warId}:${actionType}`);
      await api.post(`/wars/${warId}/action`, { actionType });
      await load();
    } catch (err: any) {
      setError(err?.message ?? "War action failed.");
    } finally {
      setBusy(null);
    }
  };

  return (
<<<<<<< HEAD
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 overflow-x-auto">
        {wars.map((war) => (
          <button
            key={war.id}
            type="button"
            onClick={() => setSelectedWarId(war.id)}
            className={`rounded-md border px-3 py-2 text-[10px] font-black tracking-[2px] uppercase ${selectedWarId === war.id ? "border-[rgba(153,69,255,0.3)] bg-[#1a0a2e] text-[#9945FF]" : "border-white/10 bg-black/20 text-[#d0d5ca]"}`}
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
            <p className="text-[10px] font-black tracking-[3px] text-[#aab0a3] uppercase">Action Breakdown</p>
            <div className="grid gap-2 md:grid-cols-2">
              {Object.entries(scoreboard.actionBreakdown).map(([actionType, points]) => (
                <div key={actionType} className="rounded-md border border-white/10 bg-black/20 p-3 flex items-center justify-between gap-3">
                  <p className="text-[12px] font-bold text-[#f2f4ec]">{actionType.replaceAll("_", " ")}</p>
                  <p className="text-[14px] font-black text-[#66bb6a]">{points}</p>
                </div>
              ))}
=======
    <div className="space-y-6 pb-12">
      <section className="sc-panel-strong overflow-hidden p-6 md:p-7">
        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="sc-kicker">WAR ROOM</span>
              <span className="sc-chip sc-chip-red">{totals.active} active</span>
            </div>
            <div>
              <h1 className="sc-page-title">Bounded syndicate conflict</h1>
              <p className="sc-subtitle max-w-3xl">
                Live wars, action cooldown pressure, and score momentum in one place. Battles still matter, but the board now tells you where the conflict is actually swinging.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="sc-stat">
                <div className="sc-label">Active wars</div>
                <div className="sc-value">{totals.active}</div>
              </div>
              <div className="sc-stat">
                <div className="sc-label">Score in motion</div>
                <div className="sc-value">{totals.score.toLocaleString()}</div>
              </div>
              <div className="sc-stat">
                <div className="sc-label">Action types</div>
                <div className="sc-value">2</div>
                <div className="mt-2 text-xs text-white/45">Supply runs and node control remain the Wave 3 safe set.</div>
              </div>
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
            </div>
          </div>
          <div className="sc-panel p-5">
            <div className="sc-kicker">OPS BRIEF</div>
            <div className="mt-3 text-2xl font-black text-white">High-stakes, not infinite spam</div>
            <div className="mt-3 space-y-3 text-sm leading-6 text-white/60">
              <p>War scoring is now damped by repeat-target and mismatch penalties.</p>
              <p>Action windows are scheduled and bounded so the board has shape instead of chaos.</p>
              <p>Territory-linked wars report local influence impact beside raw score.</p>
            </div>
          </div>
        </div>
      </section>

      {error ? <div className="sc-panel border border-red-500/30 p-4 text-sm text-red-200">{error}</div> : null}

      {loading ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="h-72 animate-pulse rounded-[32px] border border-white/10 bg-white/5" />
          ))}
        </div>
      ) : wars.length === 0 ? (
        <section className="sc-panel-strong p-6 text-sm text-white/60">
          Your syndicate has no active wars right now. When a conflict window opens, the board will appear here with timers and action controls.
        </section>
      ) : (
        <div className="space-y-5">
          {wars.map((war) => {
            const attacker = war.attackerSyndicateName ?? war.attackerSyndicate?.name ?? "Attacker";
            const defender = war.defenderSyndicateName ?? war.defenderSyndicate?.name ?? "Defender";
            const attackerScore = Number(war.attackerScore ?? 0);
            const defenderScore = Number(war.defenderScore ?? 0);
            const total = Math.max(1, attackerScore + defenderScore);
            const attackerPct = Math.round((attackerScore / total) * 100);
            const defenderPct = 100 - attackerPct;
            const joined = Boolean(war.joined ?? war.participating ?? war.isParticipant);

            return (
              <section key={war.id} className="sc-panel-strong overflow-hidden p-6">
                <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="sc-kicker">{String(war.status ?? "scheduled").replaceAll("_", " ")}</span>
                      {war.territory?.name ? <span className="sc-chip sc-chip-orange">for {war.territory.name}</span> : null}
                      {joined ? <span className="sc-chip sc-chip-green">joined</span> : null}
                    </div>

                    <div className="mt-4 grid items-end gap-4 sm:grid-cols-[1fr_auto_1fr]">
                      <div className="rounded-[26px] border border-[#8b5cf6]/20 bg-[#8b5cf6]/10 p-5">
                        <div className="text-xs uppercase tracking-[0.24em] text-white/35">Attacker</div>
                        <div className="mt-2 text-2xl font-black text-white">{attacker}</div>
                        <div className="mt-2 text-5xl font-black text-[#d8b4fe]">{attackerScore}</div>
                      </div>
                      <div className="text-center text-sm font-semibold tracking-[0.3em] text-white/30">VS</div>
                      <div className="rounded-[26px] border border-[#ef4444]/20 bg-[#ef4444]/10 p-5 text-right">
                        <div className="text-xs uppercase tracking-[0.24em] text-white/35">Defender</div>
                        <div className="mt-2 text-2xl font-black text-white">{defender}</div>
                        <div className="mt-2 text-5xl font-black text-[#fca5a5]">{defenderScore}</div>
                      </div>
                    </div>

                    <div className="mt-5 overflow-hidden rounded-full border border-white/10 bg-black/30">
                      <div className="flex h-3 w-full">
                        <div style={{ width: `${attackerPct}%` }} className="bg-gradient-to-r from-[#8b5cf6] to-[#d8b4fe]" />
                        <div style={{ width: `${defenderPct}%` }} className="bg-gradient-to-r from-[#ef4444] to-[#fca5a5]" />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
                        <div className="sc-label">Time remaining</div>
                        <div className="mt-2 text-lg font-semibold text-white">{formatTimer(war.endsAt)}</div>
                      </div>
                      <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
                        <div className="sc-label">Territory impact</div>
                        <div className="mt-2 text-lg font-semibold text-white">{war.territoryImpactSummary ?? war.territory?.name ?? "None"}</div>
                      </div>
                      <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
                        <div className="sc-label">Your role</div>
                        <div className="mt-2 text-lg font-semibold text-white">{joined ? "Participant" : "Unregistered"}</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="sc-panel p-5">
                      <div className="sc-kicker">WAR ACTIONS</div>
                      <div className="mt-3 grid gap-3">
                        <button
                          type="button"
                          className="sc-button justify-center"
                          disabled={busy === `${war.id}:join` || joined}
                          onClick={() => handleJoin(war.id)}
                        >
                          {joined ? "Joined" : busy === `${war.id}:join` ? "Joining..." : "Join war"}
                        </button>
                        <button
                          type="button"
                          className="sc-button sc-button-primary justify-center"
                          disabled={busy === `${war.id}:supply_deliver`}
                          onClick={() => handleAction(war.id, "supply_deliver")}
                        >
                          {busy === `${war.id}:supply_deliver` ? "Submitting..." : "Supply deliver"}
                        </button>
                        <button
                          type="button"
                          className="sc-button sc-button-orange justify-center"
                          disabled={busy === `${war.id}:node_secure`}
                          onClick={() => handleAction(war.id, "node_secure")}
                        >
                          {busy === `${war.id}:node_secure` ? "Securing..." : "Node secure"}
                        </button>
                      </div>
                    </div>

                    <div className="sc-panel p-5">
                      <div className="sc-kicker">MOMENTUM</div>
                      <div className="mt-3 space-y-3 text-sm text-white/60">
                        <div className="flex items-center justify-between"><span>Attacker share</span><span className="font-semibold text-white">{attackerPct}%</span></div>
                        <div className="flex items-center justify-between"><span>Defender share</span><span className="font-semibold text-white">{defenderPct}%</span></div>
                        <div className="flex items-center justify-between"><span>Starts</span><span className="font-semibold text-white">{war.startsAt ? new Date(war.startsAt).toLocaleString() : "TBD"}</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

