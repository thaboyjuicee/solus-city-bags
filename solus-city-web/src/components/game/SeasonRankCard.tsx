"use client";

import { SeasonSummary } from "@/lib/gameApi";

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  return `${hours}h ${Math.floor((totalSeconds % 3600) / 60)}m`;
}

export function SeasonRankCard({ season }: { season: SeasonSummary | null }) {
  if (!season) {
    return (
      <div className="rounded-lg border border-white/10 bg-black/20 p-4">
        <p className="text-[10px] font-black tracking-[3px] text-[#aab0a3] uppercase">Season</p>
        <p className="text-[12px] text-[#aaa] mt-2">No active season right now.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black tracking-[3px] text-[#fdd835] uppercase">Current Season</p>
          <p className="text-[16px] font-black text-[#f2f4ec]">{season.name}</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-[#aab0a3] font-bold tracking-[2px]">TIME LEFT</p>
          <p className="text-[12px] font-black text-[#fdd835]">{formatRemaining(season.timeRemainingMs)}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md bg-black/20 border border-white/10 p-3">
          <p className="text-[9px] font-bold tracking-[2px] text-[#aab0a3]">RANK</p>
          <p className="text-[18px] font-black text-[#9945FF]">{season.player?.rank ?? "-"}</p>
        </div>
        <div className="rounded-md bg-black/20 border border-white/10 p-3">
          <p className="text-[9px] font-bold tracking-[2px] text-[#aab0a3]">SCORE</p>
          <p className="text-[18px] font-black text-[#66bb6a]">{season.player?.score ?? 0}</p>
        </div>
      </div>
      {season.player && (
        <div className="grid grid-cols-3 gap-2 text-[10px]">
          <div className="rounded-md bg-black/20 border border-white/10 p-2 text-center text-[#42a5f5]">PVP {season.player.pvpScore}</div>
          <div className="rounded-md bg-black/20 border border-white/10 p-2 text-center text-[#ff9800]">CRIME {season.player.crimeScore}</div>
          <div className="rounded-md bg-black/20 border border-white/10 p-2 text-center text-[#fdd835]">MISSION {season.player.missionScore}</div>
        </div>
      )}
    </div>
  );
}

