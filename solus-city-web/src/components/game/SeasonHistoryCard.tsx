"use client";

import { SeasonHistoryEntry } from "@/lib/gameApi";

export function SeasonHistoryCard({ entry }: { entry: SeasonHistoryEntry }) {
  return (
    <div className="sc-panel p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
<<<<<<< HEAD
          <p className="text-[12px] font-bold text-[#f2f4ec]">{entry.season.name}</p>
          <p className="text-[10px] text-[#777]">Rank {entry.season.player?.rank ?? "-"} - Score {entry.season.player?.score ?? 0}</p>
=======
          <p className="text-[16px] font-black text-[#f4f5fb]">{entry.season.name}</p>
          <p className="mt-1 text-[11px] text-[#7f8397]">Rank #{entry.season.player?.rank ?? "-"} · Score {entry.season.player?.score ?? 0}</p>
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
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
<<<<<<< HEAD
}



=======
}
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
