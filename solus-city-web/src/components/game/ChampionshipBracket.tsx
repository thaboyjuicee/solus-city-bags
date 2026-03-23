"use client";

import { ChampionshipSummary } from "@/lib/gameApi";

export function ChampionshipBracket({ championship }: { championship: ChampionshipSummary | null }) {
  if (!championship) {
    return <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-[12px] text-[#777]">No championship bracket available yet.</div>;
  }

  const rounds = new Map<number, ChampionshipSummary["matches"]>();
  championship.matches.forEach((match) => {
    const current = rounds.get(match.round) ?? [];
    current.push(match);
    rounds.set(match.round, current);
  });

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black tracking-[3px] text-[#aab0a3] uppercase">Championship Bracket</p>
          <p className="text-[18px] font-black text-[#f2f4ec]">{championship.season.name}</p>
        </div>
        <p className="text-[11px] font-black tracking-[2px] text-[#fdd835] uppercase">Round {championship.currentRound || 1}</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {Array.from(rounds.entries()).map(([round, matches]) => (
          <div key={round} className="rounded-md border border-white/10 bg-black/20 p-3 flex flex-col gap-3">
            <p className="text-[10px] font-black tracking-[2px] text-[#aab0a3] uppercase">Round {round}</p>
            {matches.map((match) => (
              <div key={match.id} className="rounded-md border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[12px] font-bold text-[#f2f4ec]">{match.syndicateA.name}</p>
                    <p className="text-[11px] text-[#d0d5ca]">vs {match.syndicateB.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[14px] font-black text-[#66bb6a]">{match.scoreA} - {match.scoreB}</p>
                    <p className="text-[9px] tracking-[2px] uppercase text-[#777]">{match.status}</p>
                  </div>
                </div>
                {match.winnerSyndicate && (
                  <p className="mt-2 text-[10px] text-[#fdd835] uppercase tracking-[2px]">Winner: {match.winnerSyndicate.name}</p>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}


