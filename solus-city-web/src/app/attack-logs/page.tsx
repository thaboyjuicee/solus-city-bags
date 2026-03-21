"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { AttackLogEntry } from "@/lib/gameApi";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { RevengeAlert } from "@/components/game/RevengeAlert";
import { BATTLE_RESULT_KEY, BattleResult } from "@/lib/battle";

function timeAgo(ts: string): string {
  const diffMs = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AttackLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AttackLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await api.get<AttackLogEntry[]>("/logs/attacks");
      setLogs(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  if (loading) return <div className="flex min-h-dvh items-center justify-center"><LoadingSpinner size={32} /></div>;

  return (
    <div className="flex flex-col gap-3">
      {logs.map((entry) => (
        <div key={entry.id} className="rounded-lg border border-white/10 bg-black/20 p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-black text-[#eee]">{entry.attackerName} vs {entry.defenderName}</p>
            <p className="text-[10px] text-[#666]">{timeAgo(entry.createdAt)}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] font-bold">
            <span className="text-[#66bb6a]">${Math.floor(Math.abs(entry.loot)).toLocaleString()}</span>
            <span className="text-[#42a5f5]">Stolen ${Math.floor(entry.cashStolen).toLocaleString()}</span>
            <span className="text-[#ff9800]">Heat +{entry.heatChange}</span>
          </div>
          {entry.protectionTriggered && entry.protectionTriggered.length > 0 && (
            <p className="text-[10px] text-[#fdd835]">Protection: {entry.protectionTriggered.join(", ")}</p>
          )}
          {entry.revengeAvailable && entry.revengeTargetId && (
            <>
              <RevengeAlert targetName={entry.attackerName} expiresAt={entry.revengeExpiresAt} bonusPercent={entry.revengeBonusPreview} />
              <button
                disabled={busyId === entry.id}
                onClick={async () => {
                  setBusyId(entry.id);
                  try {
                    const res = await api.post<BattleResult>("/battle/attack", { targetId: entry.revengeTargetId, targetType: "player" });
                    sessionStorage.setItem(BATTLE_RESULT_KEY, JSON.stringify(res.data));
                    router.push("/battle-result");
                  } finally {
                    setBusyId(null);
                  }
                }}
                className="w-full py-2 rounded border border-[rgba(153,69,255,0.3)] bg-[#1a0a2e] text-[#9945FF] text-[10px] font-black tracking-[2px] disabled:opacity-40"
              >
                {busyId === entry.id ? "REVENGING..." : "TAKE REVENGE"}
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
