"use client";

import { HallOfFameEntry } from "@/lib/gameApi";

export function HallOfFameList({ entries }: { entries: HallOfFameEntry[] }) {
  return (
    <div className="sc-panel p-4 flex flex-col gap-3">
      <p className="sc-kicker">Hall of Fame</p>
      {entries.length === 0 ? (
        <p className="text-[12px] text-[#777]">No hall of fame records yet.</p>
      ) : (
        entries.map((entry) => {
          const displayName = typeof entry.display?.name === "string" ? entry.display.name : entry.user?.name ?? entry.syndicate?.name ?? entry.category;
          return (
            <div key={entry.id} className="rounded-xl border border-white/8 bg-[#0c0d13] px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[14px] font-black text-[#f4f5fb]">#{entry.rank} {displayName}</p>
                <p className="mt-1 text-[10px] font-black tracking-[0.12em] text-[#76798d] uppercase">{entry.category.replaceAll("_", " ")} · {entry.season.name}</p>
              </div>
              <p className="text-[10px] font-black tracking-[0.18em] uppercase text-[#f7bf35]">Fame</p>
            </div>
          );
        })
      )}
    </div>
  );
}
