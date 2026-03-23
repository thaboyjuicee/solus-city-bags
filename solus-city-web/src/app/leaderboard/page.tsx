"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api/client";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { LeaderboardResponse } from "@/lib/gameApi";

type LeaderboardTab = LeaderboardResponse["type"];
const TABS: Array<{ id: LeaderboardTab; label: string }> = [
  { id: "season", label: "Season" },
  { id: "pvp", label: "PVP" },
  { id: "crime", label: "Crime" },
  { id: "syndicates", label: "Syndicates" },
  { id: "territories", label: "Territories" },
  { id: "prestige", label: "Prestige" },
  { id: "hall_of_fame", label: "Hall of Fame" },
];
function primaryMetric(tab: LeaderboardTab, entry: LeaderboardResponse["entries"][number]) { if (tab === "syndicates") return entry.seasonScore ?? entry.score ?? entry.warRating ?? 0; if (tab === "territories") return entry.territoryCount ?? entry.score ?? 0; if (tab === "prestige") return entry.prestigePoints ?? entry.prestigeLevel ?? 0; if (tab === "hall_of_fame") return entry.rank; return entry.score ?? entry.seasonScore ?? entry.rp ?? 0; }

export default function LeaderboardPage() {
  const [tab, setTab] = useState<LeaderboardTab>("season");
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (nextTab: LeaderboardTab) => {
    setLoading(true); try { const response = await api.get<LeaderboardResponse>(`/leaderboard?type=${nextTab}`); setData(response.data); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(tab); }, [fetchData, tab]);
  const meEntry = useMemo(() => data?.entries.find((entry) => entry.isMe) ?? null, [data]);

  return <div className="space-y-4"><div><div className="flex items-center gap-3"><p className="sc-page-title">Leaderboard</p><span className="sc-chip sc-chip-green">Live</span></div><p className="sc-subtitle mt-2">Season 4 · Blood Money</p></div><div className="flex flex-wrap gap-2 border-b border-white/8 pb-3">{TABS.map((entry) => <button key={entry.id} onClick={() => setTab(entry.id)} className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] ${tab === entry.id ? "bg-[rgba(153,69,255,0.14)] text-[#9f64ff]" : "text-[#5f6377]"}`}>{entry.label}</button>)}</div>{loading || !data ? <div className="flex justify-center py-12"><LoadingSpinner size={28} /></div> : <div className="space-y-3">{data.entries.map((entry) => { const medal = entry.rank === 1 ? "👑" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`; const toneClass = entry.rank === 1 ? "border-[rgba(247,191,53,0.24)] bg-[rgba(51,35,10,0.94)]" : entry.rank === 2 ? "border-white/10 bg-[#14151b]" : entry.rank === 3 ? "border-[rgba(153,69,255,0.24)] bg-[rgba(27,16,40,0.94)]" : entry.isMe ? "border-[rgba(153,69,255,0.24)] bg-[rgba(27,16,40,0.75)]" : "border-white/8 bg-[#0c0d13]"; const secondaryText = tab === "syndicates" ? `${entry.membersCount ?? 0} members · war ${entry.warRating ?? 0}` : tab === "territories" ? `${entry.bonusType?.replaceAll("_", " ") ?? "territory"}${entry.bonusValue ? ` · +${entry.bonusValue}` : ""}` : tab === "prestige" ? `Prestige ${entry.prestigeLevel ?? 0} · Points ${entry.prestigePoints ?? 0}` : tab === "hall_of_fame" ? `${entry.category?.replaceAll("_", " ") ?? "fame"} · ${entry.seasonName ?? "history"}` : `LV ${entry.level ?? 1} · RP ${entry.rp ?? 0}`; return <div key={`${tab}-${entry.userId}-${entry.rank}`} className={`rounded-[16px] border px-4 py-4 flex items-center justify-between gap-4 ${toneClass}`}><div className="flex items-center gap-4"><span className="text-[16px] font-black text-[#a7abc0]">{medal}</span><div><div className="flex items-center gap-2 flex-wrap"><p className="text-[18px] font-black text-[#f4f5fb]">{entry.name}</p>{entry.isMe ? <span className="sc-chip sc-chip-purple">YOU</span> : null}</div><p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#777b90]">{secondaryText}</p></div></div><div className="text-right"><p className="text-[28px] font-black text-[#f4f5fb]">{primaryMetric(tab, entry).toLocaleString()}</p><p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#666a7e]">Score</p></div></div>; })}{meEntry ? <div className="pt-4"><p className="sc-kicker mb-3">Your Position</p><div className="rounded-[16px] border border-[rgba(153,69,255,0.24)] bg-[rgba(27,16,40,0.75)] px-4 py-4 flex items-center justify-between gap-4"><div><p className="text-[18px] font-black text-[#f4f5fb]">#{meEntry.rank} {meEntry.name}</p><p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#777b90]">Current standing</p></div><p className="text-[28px] font-black text-[#f4f5fb]">{primaryMetric(tab, meEntry).toLocaleString()}</p></div></div> : null}</div>}</div>;
}
