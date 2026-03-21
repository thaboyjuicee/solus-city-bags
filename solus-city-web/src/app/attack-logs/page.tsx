"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { BATTLE_RESULT_KEY, BattleResult, formatHospitalMessage } from "@/lib/battle";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { AttackLogEntry } from "@/lib/gameApi";

function timeAgo(ts: string): string {
  const diffMs = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function isIncoming(type: string) {
  return type === "attacked_by_player" || type === "attacked_by_player_evaded";
}

export default function AttackLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AttackLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revengeBusy, setRevengeBusy] = useState<Record<string, boolean>>({});

  const fetchLogs = useCallback(async () => {
    try {
      const res = await api.get<AttackLogEntry[]>("/logs/attacks");
      setLogs(res.data);
      setError(null);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to load attack logs.");
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
    try {
      const res = await api.post<BattleResult>("/battle/attack", { targetId: entry.revengeTargetId, targetType: "player" });
      sessionStorage.setItem(BATTLE_RESULT_KEY, JSON.stringify(res.data));
      router.push("/battle-result");
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { error?: string; code?: string; recoverAt?: string } } })?.response?.data;
      setError(data?.code === "IN_HOSPITAL" ? formatHospitalMessage(data.recoverAt) : data?.error ?? "Revenge failed.");
    } finally {
      setRevengeBusy((prev) => ({ ...prev, [entry.id]: false }));
    }
  };

  if (loading) return <div className="flex min-h-dvh items-center justify-center"><LoadingSpinner size={32} /></div>;
  if (error && logs.length === 0) return <div className="flex min-h-dvh items-center justify-center text-[#ef5350]">{error}</div>;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black text-[#eee] tracking-[3px] uppercase">Attack Logs</p>
          <p className="text-[11px] text-[#555]">Richer loot and protection details</p>
        </div>
      </div>
      {error && <p className="text-[10px] font-bold text-[#ef5350]">{error}</p>}
      <div className="flex flex-col gap-2">
        {logs.map((entry) => (
          (() => {
            const antiFarmPenaltyApplied = Boolean(
              entry.metadata &&
                typeof entry.metadata === "object" &&
                "antiFarmPenaltyApplied" in entry.metadata &&
                entry.metadata.antiFarmPenaltyApplied
            );

            return (
              <div key={entry.id} className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-black tracking-[2px] px-2 py-0.5 rounded ${entry.result === "win" ? "bg-[#66bb6a20] text-[#66bb6a]" : "bg-[#ef535020] text-[#ef5350]"}`}>
                    {entry.outcomeType === "evaded" ? "EVADED" : entry.result.toUpperCase()}
                  </span>
                  <span className="text-[10px] text-[#555]">{timeAgo(entry.createdAt)}</span>
                </div>
                <p className="text-[12px] text-[#ddd]">
                  {isIncoming(entry.type) ? `${entry.attackerName} hit you.` : `You hit ${entry.defenderName}.`}
                </p>
                <div className="flex flex-wrap gap-3 text-[10px] font-bold">
                  <span className="text-[#14F195]">Cash {entry.loot >= 0 ? "+" : "-"}${Math.floor(Math.abs(entry.loot)).toLocaleString()}</span>
                  <span className="text-[#42a5f5]">Stolen ${Math.floor(entry.cashStolen).toLocaleString()}</span>
                  <span className="text-[#ff9800]">Heat +{entry.heatChange}</span>
                </div>
                {entry.protectionTriggered && entry.protectionTriggered.length > 0 && (
                  <p className="text-[10px] font-bold text-[#fdd835]">Protection triggered: {entry.protectionTriggered.join(", ")}</p>
                )}
                {antiFarmPenaltyApplied && (
                  <p className="text-[10px] font-bold text-[#ff9800]">Repeat-target penalty reduced the payout.</p>
                )}
                {entry.revengeAvailable && entry.revengeTargetId && (
                  <button
                    onClick={() => revenge(entry)}
                    disabled={!!revengeBusy[entry.id]}
                    className="w-full py-2 rounded border border-[rgba(153,69,255,0.3)] bg-[#1a0a2e] text-[#9945FF] text-[10px] font-black tracking-[2px] disabled:opacity-40"
                  >
                    {revengeBusy[entry.id] ? "REVENGING..." : "REVENGE"}
                  </button>
                )}
              </div>
            );
          })()
        ))}
      </div>
      <div className="h-16 md:hidden" />
    </div>
  );
}
