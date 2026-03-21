"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    Promise.all([
      api.get<{ currentSeason: SeasonSummary | null }>("/seasons/current"),
      api.get<{ rewardPreview: SeasonRewardPreviewResponse | null }>("/seasons/current/rewards"),
      api.get<{ history: SeasonHistoryEntry[]; hallOfFameHighlights: HallOfFameEntry[] }>("/seasons/history"),
    ]).then(([currentRes, rewardsRes, historyRes]) => {
      setCurrent(currentRes.data.currentSeason);
      setRewardPreview(rewardsRes.data.rewardPreview);
      setHistory(historyRes.data.history ?? []);
      setHallOfFame(historyRes.data.hallOfFameHighlights ?? []);
    });
  }, []);

  if (!current && history.length === 0) return <div className="flex min-h-dvh items-center justify-center"><LoadingSpinner size={32} /></div>;

  return (
    <div className="flex flex-col gap-4">
      <SeasonRankCard season={current} />

      {rewardPreview && (
        <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
          <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase">Reward Preview</p>
          <div className="grid gap-2 md:grid-cols-3">
            <div className="rounded-md border border-white/10 bg-black/20 p-3">
              <p className="text-[9px] font-bold tracking-[2px] text-[#555]">OVERALL</p>
              <p className="text-[14px] font-black text-[#66bb6a]">{rewardPreview.projected.overall?.label ?? "-"}</p>
              <p className="text-[10px] text-[#777] mt-1">{rewardPreview.projected.overall?.rankLabel ?? "No tier"}</p>
            </div>
            <div className="rounded-md border border-white/10 bg-black/20 p-3">
              <p className="text-[9px] font-bold tracking-[2px] text-[#555]">PVP</p>
              <p className="text-[14px] font-black text-[#42a5f5]">{rewardPreview.projected.pvp?.label ?? "-"}</p>
              <p className="text-[10px] text-[#777] mt-1">{rewardPreview.projected.pvp?.rankLabel ?? "No tier"}</p>
            </div>
            <div className="rounded-md border border-white/10 bg-black/20 p-3">
              <p className="text-[9px] font-bold tracking-[2px] text-[#555]">CRIME</p>
              <p className="text-[14px] font-black text-[#ff8a65]">{rewardPreview.projected.crime?.label ?? "-"}</p>
              <p className="text-[10px] text-[#777] mt-1">{rewardPreview.projected.crime?.rankLabel ?? "No tier"}</p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
        <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase">Season History</p>
        {history.map((entry) => (
          <SeasonHistoryCard key={entry.season.id} entry={entry} />
        ))}
      </div>

      <HallOfFameList entries={hallOfFame} />
    </div>
  );
}

