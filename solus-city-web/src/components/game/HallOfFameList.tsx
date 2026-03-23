"use client";

import { HallOfFameEntry } from "@/lib/gameApi";

export function HallOfFameList({ entries }: { entries: HallOfFameEntry[] }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
      <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase">Hall of Fame</p>
      {entries.length === 0 ? (
        <p className="text-[12px] text-[#777]">No hall of fame records yet.</p>
      ) : (
        entries.map((entry) => {
          const displayName = typeof entry.display?.name === "string" ? entry.display.name : entry.user?.name ?? entry.syndicate?.name ?? entry.category;
          return (
            <div key={entry.id} className="rounded-md border border-white/10 bg-black/20 p-3 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="break-words text-[12px] font-bold text-[#eee]">#{entry.rank} {displayName}</p>
                <p className="break-words text-[10px] text-[#777]">{entry.category.replaceAll("_", " ")} • {entry.season.name}</p>
              </div>
              <p className="text-[9px] tracking-[2px] uppercase text-[#fdd835]">FAME</p>
            </div>
          );
        })
      )}
    </div>
  );
}

