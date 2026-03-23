"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { AttackLogEntry } from "@/lib/gameApi";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { RevengeAlert } from "@/components/game/RevengeAlert";
import { BATTLE_RESULT_KEY, BattleResult } from "@/lib/battle";

type Filter = "all" | "incoming" | "outgoing";
function timeAgo(ts: string) { const diffMs = Date.now() - new Date(ts).getTime(); const mins = Math.floor(diffMs / 60000); if (mins < 1) return "just now"; if (mins < 60) return `${mins}m ago`; const hrs = Math.floor(mins / 60); if (hrs < 24) return `${hrs}h ago`; return `${Math.floor(hrs / 24)}d ago`; }
function isIncoming(type: string) { return type.startsWith("attacked"); }
function iWon(entry: AttackLogEntry) { if (entry.outcomeType === "evaded") return false; return isIncoming(entry.type) ? entry.result === "loss" : entry.result === "win"; }

export default function AttackLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AttackLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const fetchLogs = useCallback(async () => {
    try { const res = await api.get<AttackLogEntry[]>("/logs/attacks"); setLogs(res.data); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filtered = useMemo(() => logs.filter((entry) => filter === "all" ? true : filter === "incoming" ? isIncoming(entry.type) : !isIncoming(entry.type)), [filter, logs]);
  const wins = filtered.filter((entry) => iWon(entry)).length;
  const losses = filtered.length - wins;
  const winRate = filtered.length > 0 ? Math.round((wins / filtered.length) * 100) : 0;

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><LoadingSpinner size={32} /></div>;

  return <div className="space-y-4"><div><p className="sc-page-title">Attack Logs</p><p className="sc-subtitle mt-2">Your combat history</p></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div className="sc-stat"><p className="sc-label">Wins</p><p className="mt-3 text-[28px] font-black text-[#36d47f]">{wins}</p></div><div className="sc-stat"><p className="sc-label">Losses</p><p className="mt-3 text-[28px] font-black text-[#ff5d5d]">{losses}</p></div><div className="sc-stat"><p className="sc-label">Win Rate</p><p className="mt-3 text-[28px] font-black text-[#9f64ff]">{winRate}%</p></div><div className="sc-stat"><p className="sc-label">Total</p><p className="mt-3 text-[28px] font-black text-[#f4f5fb]">{filtered.length}</p></div></div><div className="flex flex-wrap gap-2 border-b border-white/8 pb-3">{(["all", "incoming", "outgoing"] as Filter[]).map((value) => <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] ${filter === value ? "bg-[rgba(153,69,255,0.14)] text-[#9f64ff]" : "text-[#5f6377]"}`}>{value}</button>)}</div>{filtered.length === 0 ? <div className="sc-panel p-4 text-[12px] text-[#6d7186]">No logs found.</div> : null}<div className="space-y-3">{filtered.map((entry) => { const win = iWon(entry); return <div key={entry.id} className={`rounded-[18px] border px-4 py-4 ${win ? "border-[rgba(54,212,127,0.18)] bg-[rgba(10,26,18,0.9)]" : "border-[rgba(255,93,93,0.16)] bg-[rgba(24,11,14,0.9)]"}`}><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap gap-2"><span className={`sc-chip ${win ? "sc-chip-green" : "sc-chip-red"}`}>{win ? "Win" : "Loss"}</span><span className="sc-chip">{entry.targetType}</span></div><p className="mt-3 text-[20px] font-black text-[#f4f5fb]">{entry.attackerName} vs {entry.defenderName}</p></div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#6c7084]">{timeAgo(entry.createdAt)}</p></div><div className="mt-4 grid gap-3 md:grid-cols-6"><div className="sc-stat"><p className="sc-label">Cash</p><p className="mt-2 text-[16px] font-black" style={{ color: win ? '#36d47f' : '#ff5d5d' }}>{win ? "+" : "-"}${Math.floor(Math.abs(entry.loot)).toLocaleString()}</p></div><div className="sc-stat"><p className="sc-label">RP</p><p className="mt-2 text-[16px] font-black text-[#9f64ff]">{entry.rpChange >= 0 ? "+" : ""}{entry.rpChange}</p></div><div className="sc-stat"><p className="sc-label">XP</p><p className="mt-2 text-[16px] font-black text-[#4f8cff]">+{entry.xpGained}</p></div><div className="sc-stat"><p className="sc-label">Heat</p><p className="mt-2 text-[16px] font-black text-[#ff9d32]">{entry.heatChange >= 0 ? "+" : ""}{entry.heatChange}</p></div><div className="sc-stat"><p className="sc-label">Dmg Out</p><p className="mt-2 text-[16px] font-black text-[#ff5d5d]">{entry.damageDealt}</p></div><div className="sc-stat"><p className="sc-label">Dmg In</p><p className="mt-2 text-[16px] font-black text-[#f4f5fb]">{entry.damageTaken}</p></div></div>{entry.protectionTriggered && entry.protectionTriggered.length > 0 ? <p className="mt-3 text-[11px] font-black text-[#f7bf35]">Protection triggered: {entry.protectionTriggered.join(", ")}</p> : null}{entry.revengeAvailable && entry.revengeTargetId && isIncoming(entry.type) ? <div className="mt-4 space-y-3"><RevengeAlert targetName={entry.attackerName} expiresAt={entry.revengeExpiresAt} bonusPercent={entry.revengeBonusPreview} /><button disabled={busyId === entry.id} onClick={async () => { setBusyId(entry.id); try { const res = await api.post<BattleResult>("/battle/attack", { targetId: entry.revengeTargetId, targetType: "player" }); sessionStorage.setItem(BATTLE_RESULT_KEY, JSON.stringify(res.data)); router.push("/battle-result"); } finally { setBusyId(null); } }} className="sc-button sc-button-orange w-full">{busyId === entry.id ? "REVENGING..." : "TAKE REVENGE"}</button></div> : null}</div>; })}</div></div>;
}