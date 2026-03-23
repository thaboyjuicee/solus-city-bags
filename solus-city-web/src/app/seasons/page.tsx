"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api/client";
import { HallOfFameList } from "@/components/game/HallOfFameList";
import { SeasonHistoryCard } from "@/components/game/SeasonHistoryCard";
import { SeasonRankCard } from "@/components/game/SeasonRankCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { HallOfFameEntry, SeasonHistoryEntry, SeasonRewardPreviewResponse, SeasonSummary } from "@/lib/gameApi";

export default function SeasonsPage() {
  const [current, setCurrent] = useState<SeasonSummary | null>(null);
  const [rewardPreview, setRewardPreview] = useState<SeasonRewardPreviewResponse | null>(null);
  const [history, setHistory] = useState<SeasonHistoryEntry[]>([]);
  const [hallOfFame, setHallOfFame] = useState<HallOfFameEntry[]>([]);
  const [tab, setTab] = useState<"current" | "history" | "rewards">("current");

  useEffect(() => {
    Promise.all([
      api.get<{ currentSeason: SeasonSummary | null }>("/seasons/current"),
      api.get<{ rewardPreview: SeasonRewardPreviewResponse | null }>("/seasons/current/rewards"),
      api.get<{ history: SeasonHistoryEntry[]; hallOfFameHighlights: HallOfFameEntry[] }>("/seasons/history"),
    ]).then(([currentRes, rewardsRes, historyRes]) => {
      setCurrent(currentRes.data.currentSeason); setRewardPreview(rewardsRes.data.rewardPreview); setHistory(historyRes.data.history ?? []); setHallOfFame(historyRes.data.hallOfFameHighlights ?? []);
    });
  }, []);

  const rewardCards = useMemo(() => !rewardPreview ? [] : [
    { label: "Overall", entry: rewardPreview.projected.overall, color: "#36d47f" },
    { label: "PVP", entry: rewardPreview.projected.pvp, color: "#4f8cff" },
    { label: "Crime", entry: rewardPreview.projected.crime, color: "#ff9d32" },
    { label: "Syndicate", entry: rewardPreview.projected.syndicate, color: "#9f64ff" },
  ], [rewardPreview]);

  if (!current && history.length === 0) return <div className="flex min-h-[60vh] items-center justify-center"><LoadingSpinner size={32} /></div>;

  return <div className="space-y-4"><div><p className="sc-page-title">Seasons</p><p className="sc-subtitle mt-2">Season 4 · Blood Money</p></div><div className="flex flex-wrap gap-2 border-b border-white/8 pb-3">{([ ["current", "Current Season"], ["history", "History"], ["rewards", "Reward Tiers"] ] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setTab(value)} className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] ${tab === value ? "bg-[rgba(153,69,255,0.14)] text-[#9f64ff]" : "text-[#5f6377]"}`}>{label}</button>)}</div>{tab === "current" ? <div className="space-y-4"><SeasonRankCard season={current} /><div className="grid gap-3 md:grid-cols-4">{rewardCards.map((card) => <div key={card.label} className="sc-stat"><p className="sc-label">{card.label}</p><p className="mt-3 text-[22px] font-black" style={{ color: card.color }}>{card.entry?.label ?? "-"}</p><p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#707488]">{card.entry?.rankLabel ?? "No tier"}</p></div>)}</div></div> : null}{tab === "history" ? <div className="space-y-4">{history.map((entry) => <SeasonHistoryCard key={entry.season.id} entry={entry} />)}<HallOfFameList entries={hallOfFame} /></div> : null}{tab === "rewards" && rewardPreview ? <div className="space-y-4">{Object.entries(rewardPreview.rewardTiers).map(([category, tiers]) => <div key={category} className="sc-panel p-4"><p className="sc-kicker">{category.replaceAll("_", " ")}</p><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{tiers.map((tier) => <div key={tier.key} className="sc-stat"><p className="sc-label">{tier.label}</p><p className="mt-3 text-[20px] font-black text-[#f7bf35]">{tier.rankLabel}</p><p className="mt-2 text-[12px] text-[#7a7f95]">${Math.floor(tier.cash).toLocaleString()} · {tier.rp} RP · {tier.prestigePoints} PP</p></div>)}</div></div>)}</div> : null}</div>;
}
