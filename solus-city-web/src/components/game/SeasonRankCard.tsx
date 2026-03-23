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
      <div className="sc-panel p-4">
        <p className="sc-kicker">Season</p>
        <p className="mt-2 text-[12px] text-[#aaa]">No active season right now.</p>
      </div>
    );
  }

  return (
    <div className="sc-panel-strong p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="sc-kicker text-[#f7bf35]">Current Season</p>
          <p className="mt-2 text-[28px] font-black text-[#f4f5fb]">{season.name}</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-[#aab0a3] font-bold tracking-[2px]">TIME LEFT</p>
          <p className="text-[12px] font-black text-[#fdd835]">{formatRemaining(season.timeRemainingMs)}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="sc-stat">
          <p className="sc-label">Overall Rank</p>
          <p className="mt-3 text-[28px] font-black text-[#9f64ff]">#{season.player?.rank ?? "-"}</p>
        </div>
        <div className="sc-stat">
          <p className="sc-label">Total Score</p>
          <p className="mt-3 text-[28px] font-black text-[#f4f5fb]">{season.player?.score ?? 0}</p>
        </div>
      </div>
      {season.player ? (
        <div className="grid grid-cols-3 gap-3 text-[11px] font-black">
          <div className="sc-stat text-[#ff5d5d]">PVP {season.player.pvpScore}</div>
          <div className="sc-stat text-[#ff9d32]">Crime {season.player.crimeScore}</div>
          <div className="sc-stat text-[#f7bf35]">Mission {season.player.missionScore}</div>
        </div>
      ) : null}
    </div>
  );
}
