"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { LeaderboardResponse } from "@/lib/gameApi";

type LeaderboardTab = LeaderboardResponse["type"];

const TABS: LeaderboardTab[] = ["season", "pvp", "crime", "syndicates", "territories", "prestige", "hall_of_fame"];

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
      <div className="grid grid-cols-7">
        {TABS.map((entry) => (
          <button
            key={entry}
            onClick={() => setTab(entry)}
            className={`px-2 py-2 border text-[9px] font-black tracking-[1px] uppercase text-center ${tab === entry ? "bg-[#1a0a2e] border-[rgba(153,69,255,0.3)] text-[#9945FF]" : "bg-black/20 border-white/10 text-[#666]"}`}
          >
            {entry.replace(/_/g, " ")}
          </button>
        ))}
      </div>
      {loading || !data ? (
        <div className="flex justify-center py-12"><LoadingSpinner size={28} /></div>
      ) : (
        <div className="flex flex-col gap-2">
          {data.entries.map((entry) => {
            const secondaryText =
              tab === "territories"
                ? `${entry.territoryOwner ?? "Unclaimed"} • ${entry.bonusType?.replaceAll("_", " ") ?? "bonus"}`
                : tab === "syndicates"
                  ? `${entry.membersCount ?? 0} members • ${entry.territoryCount ?? 0} territories`
                  : tab === "prestige"
                    ? `Prestige ${entry.prestigeLevel ?? 0} • Points ${entry.prestigePoints ?? 0}`
                    : tab === "hall_of_fame"
                      ? `${entry.category?.replaceAll("_", " ") ?? "fame"} • ${entry.seasonName ?? "history"}`
                      : `LV ${entry.level ?? 1} • RP ${entry.rp ?? 0}`;

            return (
              <div key={`${tab}-${entry.userId}-${entry.rank}`} className={`rounded-lg border p-3 flex items-center justify-between gap-3 ${entry.isMe ? "border-[rgba(153,69,255,0.3)] bg-[#1a0a2e]" : "border-white/10 bg-black/20"}`}>
                <div>
                  <p className="text-[12px] font-bold text-[#eee]">#{entry.rank} {entry.name}</p>
                  <p className="text-[10px] text-[#777]">{secondaryText}</p>
                </div>
                <div className="text-right">
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

