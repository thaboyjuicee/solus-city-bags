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
<<<<<<< HEAD
      <div className="rounded-lg border border-white/10 bg-black/20 p-4">
        <p className="text-[10px] font-black tracking-[3px] text-[#aab0a3] uppercase">Season</p>
        <p className="text-[12px] text-[#aaa] mt-2">No active season right now.</p>
=======
      <div className="sc-panel p-4">
        <p className="sc-kicker">Season</p>
        <p className="mt-2 text-[12px] text-[#aaa]">No active season right now.</p>
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
      </div>
    );
  }

  return (
    <div className="sc-panel-strong p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
<<<<<<< HEAD
          <p className="text-[10px] font-black tracking-[3px] text-[#fdd835] uppercase">Current Season</p>
          <p className="text-[16px] font-black text-[#f2f4ec]">{season.name}</p>
=======
          <p className="sc-kicker text-[#f7bf35]">Current Season</p>
          <p className="mt-2 text-[28px] font-black text-[#f4f5fb]">{season.name}</p>
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
        </div>
        <div className="text-right">
          <p className="text-[9px] text-[#aab0a3] font-bold tracking-[2px]">TIME LEFT</p>
          <p className="text-[12px] font-black text-[#fdd835]">{formatRemaining(season.timeRemainingMs)}</p>
        </div>
      </div>
<<<<<<< HEAD
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md bg-black/20 border border-white/10 p-3">
          <p className="text-[9px] font-bold tracking-[2px] text-[#aab0a3]">RANK</p>
          <p className="text-[18px] font-black text-[#9945FF]">{season.player?.rank ?? "-"}</p>
        </div>
        <div className="rounded-md bg-black/20 border border-white/10 p-3">
          <p className="text-[9px] font-bold tracking-[2px] text-[#aab0a3]">SCORE</p>
          <p className="text-[18px] font-black text-[#66bb6a]">{season.player?.score ?? 0}</p>
=======
      <div className="grid grid-cols-2 gap-3">
        <div className="sc-stat">
          <p className="sc-label">Overall Rank</p>
          <p className="mt-3 text-[28px] font-black text-[#9f64ff]">#{season.player?.rank ?? "-"}</p>
        </div>
        <div className="sc-stat">
          <p className="sc-label">Total Score</p>
          <p className="mt-3 text-[28px] font-black text-[#f4f5fb]">{season.player?.score ?? 0}</p>
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
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
<<<<<<< HEAD
}

=======
}
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
