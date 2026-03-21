"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { LeaderboardResponse } from "@/lib/gameApi";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

const TABS: Array<"season" | "pvp" | "crime"> = ["season", "pvp", "crime"];

export default function LeaderboardPage() {
  const [tab, setTab] = useState<"season" | "pvp" | "crime">("season");
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (nextTab: "season" | "pvp" | "crime") => {
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
      <div className="flex gap-2 overflow-x-auto">
        {TABS.map((entry) => (
          <button
            key={entry}
            onClick={() => setTab(entry)}
            className={`px-3 py-2 rounded-md border text-[10px] font-black tracking-[2px] uppercase ${tab === entry ? "bg-[#1a0a2e] border-[rgba(153,69,255,0.3)] text-[#9945FF]" : "bg-black/20 border-white/10 text-[#666]"}`}
          >
            {entry}
          </button>
        ))}
      </div>
      {loading || !data ? (
        <div className="flex justify-center py-12"><LoadingSpinner size={28} /></div>
      ) : (
        <div className="flex flex-col gap-2">
          {data.entries.map((entry) => (
            <div key={entry.userId} className={`rounded-lg border p-3 flex items-center justify-between gap-3 ${entry.isMe ? "border-[rgba(153,69,255,0.3)] bg-[#1a0a2e]" : "border-white/10 bg-black/20"}`}>
              <div>
                <p className="text-[12px] font-bold text-[#eee]">#{entry.rank} {entry.name}</p>
                <p className="text-[10px] text-[#777]">LV {entry.level} • RP {entry.rp ?? 0}</p>
              </div>
              <div className="text-right">
                <p className="text-[14px] font-black text-[#fdd835]">{entry.score ?? entry.seasonScore ?? entry.rp ?? 0}</p>
                <p className="text-[9px] text-[#666] uppercase tracking-[2px]">{data.type}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

