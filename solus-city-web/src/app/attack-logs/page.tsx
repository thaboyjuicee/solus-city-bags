"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ScrollText } from "lucide-react";
import { api } from "@/lib/api/client";
import { AttackLogEntry } from "@/lib/gameApi";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { RevengeAlert } from "@/components/game/RevengeAlert";
import { BATTLE_RESULT_KEY, BattleResult } from "@/lib/battle";

type Filter = "all" | "incoming" | "outgoing";

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
  return type.startsWith("attacked");
}

function ResultBadge({ entry }: { entry: AttackLogEntry }) {
  // Evaded takes priority
  if (entry.outcomeType === "evaded") {
    return <span className="text-[9px] font-black tracking-[2px] uppercase px-2 py-0.5 rounded bg-[#fdd835]/20 text-[#fdd835] border border-[#fdd835]/30">EVADED</span>;
  }
  // For incoming attacks, flip the result (result is from attacker's POV)
  const iWon = isIncoming(entry.type) ? entry.result === "loss" : entry.result === "win";
  return iWon
    ? <span className="text-[9px] font-black tracking-[2px] uppercase px-2 py-0.5 rounded bg-[#66bb6a]/20 text-[#66bb6a] border border-[#66bb6a]/30">WIN</span>
    : <span className="text-[9px] font-black tracking-[2px] uppercase px-2 py-0.5 rounded bg-[#ef5350]/20 text-[#ef5350] border border-[#ef5350]/30">LOSS</span>;
}

export default function AttackLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AttackLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

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

  const filtered = logs.filter((entry) => {
    if (filter === "incoming") return isIncoming(entry.type);
    if (filter === "outgoing") return !isIncoming(entry.type);
    return true;
  });

  const FILTERS: Array<{ id: Filter; label: string }> = [
    { id: "all", label: "All" },
    { id: "incoming", label: "Incoming" },
    { id: "outgoing", label: "Outgoing" },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="h-28 rounded-lg overflow-hidden border border-white/10 bg-black/20 backdrop-blur-sm flex items-end relative">
        <Image src="/assets/images/arena_banner.png" alt="Attack logs banner" fill className="object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        <div className="relative z-10 px-3 pb-3 flex items-end gap-2">
          <ScrollText size={18} className="text-[#fdd835] mb-0.5" />
          <div>
            <p className="text-[10px] font-black text-[#fdd835] tracking-[3px] uppercase">Attack Logs</p>
            <p className="text-[11px] font-semibold text-[#888]">Your combat history and revenge opportunities</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3">
        {FILTERS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`py-2 border text-[10px] font-black tracking-[2px] uppercase ${
              filter === id
                ? "bg-[#1a0a2e] border-[rgba(153,69,255,0.3)] text-[#9945FF]"
                : "bg-black/20 border-white/10 text-[#555]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-[11px] text-[#555] text-center py-8">No logs found.</p>
      )}

      {filtered.map((entry) => (
        <div key={entry.id} className="rounded-lg border border-white/10 bg-black/20 p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-black text-[#eee]">{entry.attackerName} vs {entry.defenderName}</p>
            <div className="flex items-center gap-2">
              <ResultBadge entry={entry} />
              <p className="text-[10px] text-[#666]">{timeAgo(entry.createdAt)}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] font-bold">
            <span className="text-[#66bb6a]">${Math.floor(Math.abs(entry.loot)).toLocaleString()}</span>
            <span className="text-[#42a5f5]">Stolen ${Math.floor(entry.cashStolen).toLocaleString()}</span>
            <span className="text-[#ff9800]">Heat +{entry.heatChange}</span>
          </div>
          {entry.protectionTriggered && entry.protectionTriggered.length > 0 && (
            <p className="text-[10px] text-[#fdd835]">Protection: {entry.protectionTriggered.join(", ")}</p>
          )}
          {entry.revengeAvailable && entry.revengeTargetId && isIncoming(entry.type) && (
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
