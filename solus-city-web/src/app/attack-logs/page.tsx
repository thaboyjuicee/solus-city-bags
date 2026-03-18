"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { BATTLE_RESULT_KEY, BattleResult, formatHospitalMessage } from "@/lib/battle";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AttackLogEntry {
  id: string;
  createdAt: string;
  type: string;
  attackerName: string;
  defenderName: string;
  targetType: "player" | "npc";
  result: "win" | "loss";
  outcomeType?: "evaded";
  damageDealt: number;
  damageTaken: number;
  loot: number;
  rpChange: number;
  xpGained: number;
  hospitalResult: string;
  revengeTargetId?: string;
  revengeAvailable: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(ts: string): string {
  const diffMs = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function isIncoming(type: string): boolean {
  return type === "attacked_by_player" || type === "attacked_by_player_evaded";
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AttackLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AttackLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"all" | "incoming" | "outgoing">("all");
  const [revengeBusy, setRevengeBusy] = useState<Record<string, boolean>>({});
  const [revengeErrors, setRevengeErrors] = useState<Record<string, string>>({});

  const fetchLogs = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<AttackLogEntry[]>("/logs/attacks");
      setLogs(res.data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to load attack logs.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const revenge = async (entry: AttackLogEntry) => {
    if (!entry.revengeTargetId) return;
    setRevengeBusy((prev) => ({ ...prev, [entry.id]: true }));
    setRevengeErrors((prev) => { const n = { ...prev }; delete n[entry.id]; return n; });

    try {
      const res = await api.post<BattleResult>("/battle/attack", {
        targetId: entry.revengeTargetId,
        targetType: "player",
      });
      sessionStorage.setItem(BATTLE_RESULT_KEY, JSON.stringify(res.data));
      router.push("/battle-result");
    } catch (err: unknown) {
      const data = (
        err as { response?: { data?: { error?: string; code?: string; recoverAt?: string } } }
      )?.response?.data;
      const msg =
        data?.code === "IN_HOSPITAL"
          ? formatHospitalMessage(data.recoverAt)
          : data?.error ?? "Revenge failed. Please try again.";
      setRevengeErrors((prev) => ({ ...prev, [entry.id]: msg }));
    } finally {
      setRevengeBusy((prev) => ({ ...prev, [entry.id]: false }));
    }
  };

  // ------------------------------------------------------------------
  // Loading
  // ------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex min-h-dvh bg-transparent items-center justify-center">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Error
  // ------------------------------------------------------------------
  if (error) {
    return (
      <div className="flex flex-col min-h-dvh bg-transparent items-center justify-center gap-4 px-6">
        <p className="text-danger text-sm text-center">{error}</p>
        <button
          onClick={() => { setLoading(true); fetchLogs(); }}
          className="px-5 py-2.5 bg-accent rounded-lg text-white font-semibold text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  const visibleLogs = logs.filter((e) => {
    if (tab === "incoming") return isIncoming(e.type);
    if (tab === "outgoing") return !isIncoming(e.type);
    return true;
  });

  return (
    <div className="flex flex-col bg-transparent min-h-dvh">
      <div className="flex flex-col gap-3">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-[#eee] tracking-[3px] uppercase">
              Attack Logs
            </p>
            <p className="text-[11px] font-semibold text-text-dim mt-0.5">
              Last 50 battles
            </p>
          </div>
          <button
            onClick={() => { setLoading(true); fetchLogs(); }}
            className="bg-black/20 backdrop-blur-sm border border-white/10 rounded p-2 text-text-dim hover:text-text-secondary transition-colors"
            aria-label="Refresh logs"
          >
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {(["all", "incoming", "outgoing"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg border text-[10px] font-black tracking-[2px] uppercase transition-colors ${
                tab === t
                  ? "bg-[#1a0a2e] border-[rgba(153,69,255,0.3)] text-[#9945FF]"
                  : "bg-black/20 backdrop-blur-sm border border-white/10 text-text-dim hover:text-text-secondary"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Log list */}
        {visibleLogs.length === 0 ? (
          <p className="text-text-dim text-sm text-center py-8">No battle records yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {visibleLogs.map((entry) => {
              const incoming = isIncoming(entry.type);
              const outcomeLabel = entry.outcomeType === "evaded"
                ? "EVADED"
                : entry.result === "win" ? "WIN" : "LOSS";
              const outcomeBadgeClass = entry.outcomeType === "evaded"
                ? "bg-[#f9a82520] text-[#f9a825]"
                : entry.result === "win"
                ? "bg-[#66bb6a20] text-[#66bb6a]"
                : "bg-[#ef535020] text-[#ef5350]";

              const description = incoming
                ? `${entry.attackerName} attacked you`
                : `You attacked ${entry.defenderName}${entry.targetType === "npc" ? " (NPC)" : ""}`;

              const lootFormatted =
                entry.loot >= 0
                  ? `+$${Math.floor(entry.loot).toLocaleString()}`
                  : `-$${Math.floor(Math.abs(entry.loot)).toLocaleString()}`;

              return (
                <div
                  key={entry.id}
                  className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-3 flex flex-col gap-1.5"
                >
                  {/* Top row: badge + direction + timestamp */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-black tracking-[2px] px-2 py-0.5 rounded ${outcomeBadgeClass}`}>
                        {outcomeLabel}
                      </span>
                      <span className={`text-[9px] font-bold tracking-wide px-1.5 py-0.5 rounded ${
                        incoming
                          ? "bg-[#ef535015] text-[#ef5350]"
                          : "bg-[#14F19515] text-[#14F195]"
                      }`}>
                        {incoming ? "INCOMING" : "OUTGOING"}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-text-dim">
                      {timeAgo(entry.createdAt)}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-[12px] text-[#ddd]">{description}</p>

                  {/* Stats */}
                  <div className="flex items-center gap-3 text-[11px] font-bold">
                    <span className="text-[#66bb6a]">Dealt {entry.damageDealt}</span>
                    <span className="text-[#ef5350]">Taken {entry.damageTaken}</span>
                    <span className="text-[#14F195]">{lootFormatted}</span>
                    {entry.rpChange !== 0 && (
                      <span className={entry.rpChange > 0 ? "text-[#14F195]" : "text-[#ef5350]"}>
                        {entry.rpChange > 0 ? "+" : ""}{entry.rpChange} RP
                      </span>
                    )}
                  </div>

                  {/* Revenge button */}
                  {entry.revengeAvailable && entry.revengeTargetId && (
                    <button
                      onClick={() => revenge(entry)}
                      disabled={!!revengeBusy[entry.id]}
                      className="w-full py-2 border border-[rgba(153,69,255,0.3)] bg-[#1a0a2e] rounded text-[#9945FF] text-[10px] font-black tracking-[2px] disabled:opacity-45 flex items-center justify-center gap-1.5"
                    >
                      {revengeBusy[entry.id] ? (
                        <LoadingSpinner size={14} color="#9945FF" />
                      ) : (
                        "REVENGE"
                      )}
                    </button>
                  )}

                  {/* Revenge error */}
                  {revengeErrors[entry.id] && (
                    <p className="text-[#ef5350] text-[11px] font-bold">
                      {revengeErrors[entry.id]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="h-16 md:hidden" />
      </div>
    </div>
  );
}

