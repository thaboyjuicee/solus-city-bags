"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { SeasonRankCard } from "@/components/game/SeasonRankCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { SeasonSummary } from "@/lib/gameApi";

export default function SeasonsPage() {
  const [current, setCurrent] = useState<SeasonSummary | null>(null);
  const [history, setHistory] = useState<SeasonSummary[]>([]);

  useEffect(() => {
    Promise.all([
      api.get<{ currentSeason: SeasonSummary | null }>("/seasons/current"),
      api.get<{ history: SeasonSummary[] }>("/seasons/history"),
    ]).then(([currentRes, historyRes]) => {
      setCurrent(currentRes.data.currentSeason);
      setHistory(historyRes.data.history);
    });
  }, []);

  if (!current && history.length === 0) return <div className="flex min-h-dvh items-center justify-center"><LoadingSpinner size={32} /></div>;

  return (
    <div className="flex flex-col gap-4">
      <SeasonRankCard season={current} />
      <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-2">
        <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase">Season History</p>
        {history.map((season) => (
          <div key={season.id} className="rounded-md border border-white/10 bg-black/20 p-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[12px] font-bold text-[#eee]">{season.name}</p>
              <p className="text-[10px] text-[#777]">Rank {season.player?.rank ?? "-"}</p>
            </div>
            <p className="text-[14px] font-black text-[#66bb6a]">{season.player?.score ?? 0}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

