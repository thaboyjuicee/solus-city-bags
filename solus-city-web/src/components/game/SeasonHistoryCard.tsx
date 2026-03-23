"use client";

import { SeasonHistoryEntry } from "@/lib/gameApi";

export function SeasonHistoryCard({ entry }: { entry: SeasonHistoryEntry }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/20 p-3 flex flex-col gap-3">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="break-words text-[12px] font-bold text-[#eee]">{entry.season.name}</p>
          <p className="break-words text-[10px] text-[#777]">Rank {entry.season.player?.rank ?? "-"} • Score {entry.season.player?.score ?? 0}</p>
        </div>
        <p className={`text-[9px] font-black tracking-[2px] uppercase ${entry.rewardClaimed ? "text-[#66bb6a]" : "text-[#ff8a65]"}`}>
          {entry.rewardClaimed ? "Reward Granted" : "Reward Pending"}
        </p>
      </div>
      {entry.highlights.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {entry.highlights.map((highlight) => (
            <span key={highlight.id} className="rounded-sm border border-white/10 bg-black/20 px-2 py-1 text-[10px] text-[#bbb]">
              {highlight.category} #{highlight.rank}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

