"use client";

import { SeasonHistoryEntry } from "@/lib/gameApi";

export function SeasonHistoryCard({ entry }: { entry: SeasonHistoryEntry }) {
  return (
    <div className="sc-panel p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[16px] font-black text-[#f4f5fb]">{entry.season.name}</p>
          <p className="mt-1 text-[11px] text-[#7f8397]">Rank #{entry.season.player?.rank ?? "-"} · Score {entry.season.player?.score ?? 0}</p>
        </div>
        <p className={`text-[10px] font-black tracking-[2px] uppercase ${entry.rewardClaimed ? "text-[#36d47f]" : "text-[#ff9d32]"}`}>
          {entry.rewardClaimed ? "Reward Granted" : "Reward Pending"}
        </p>
      </div>
      {entry.highlights.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {entry.highlights.map((highlight) => (
            <span key={highlight.id} className="sc-chip" style={{ letterSpacing: "0.08em" }}>
              {highlight.category} #{highlight.rank}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
