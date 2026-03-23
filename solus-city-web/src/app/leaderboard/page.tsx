"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { LeaderboardResponse } from "@/lib/gameApi";

type LeaderboardTab = LeaderboardResponse["type"];

const TABS: LeaderboardTab[] = ["season", "pvp", "crime", "syndicates", "prestige", "hall_of_fame"];

export default function LeaderboardPage() {
  const [tab, setTab] = useState<LeaderboardTab>("pvp");
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (nextTab: LeaderboardTab) => {
    setLoading(true);
    try {
      const res = await api.get<LeaderboardResponse>(`/leaderboard?type=${nextTab}`);
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(tab);
  }, [fetchData, tab]);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 xl:grid-cols-6">
        {TABS.map((entry) => (
          <button
            key={entry}
            onClick={() => setTab(entry)}
            className={`min-w-0 rounded-md border px-2 py-2 text-[8px] font-black uppercase tracking-[0.5px] text-center sm:text-[9px] sm:tracking-[1px] ${tab === entry ? "bg-[#1a0a2e] border-[rgba(153,69,255,0.3)] text-[#9945FF]" : "bg-black/20 border-white/10 text-[#666]"}`}
          >
            <span className="block leading-tight">{entry.replace(/_/g, " ")}</span>
          </button>
        ))}
      </div>
      {loading || !data ? (
        <div className="flex justify-center py-12"><LoadingSpinner size={28} /></div>
      ) : (
        <div className="flex flex-col gap-2">
          {data.entries.map((entry) => {
            const secondaryText =
              tab === "syndicates"
                ? `${entry.membersCount ?? 0} members • ${entry.warRating ?? 0} war rating`
                : tab === "prestige"
                    ? `Prestige ${entry.prestigeLevel ?? 0} • Points ${entry.prestigePoints ?? 0}`
                    : tab === "hall_of_fame"
                      ? `${entry.category?.replaceAll("_", " ") ?? "fame"} • ${entry.seasonName ?? "history"}`
                      : `LV ${entry.level ?? 1} • RP ${entry.rp ?? 0}`;

            return (
              <div key={`${tab}-${entry.userId}-${entry.rank}`} className={`rounded-lg border p-3 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between ${entry.isMe ? "border-[rgba(153,69,255,0.3)] bg-[#1a0a2e]" : "border-white/10 bg-black/20"}`}>
                <div className="min-w-0">
                  <p className="break-words text-[12px] font-bold text-[#eee]">#{entry.rank} {entry.name}</p>
                  <p className="break-words text-[10px] text-[#777]">{secondaryText}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[14px] font-black text-[#fdd835]">{entry.score ?? entry.seasonScore ?? entry.rp ?? 0}</p>
                  <p className="text-[9px] text-[#666] uppercase tracking-[2px]">{data.type}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

