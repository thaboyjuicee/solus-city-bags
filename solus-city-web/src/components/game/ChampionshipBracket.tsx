"use client";

import { ChampionshipSummary } from "@/lib/gameApi";

export function ChampionshipBracket({ championship }: { championship: ChampionshipSummary | null }) {
  if (!championship) {
    return <div className="sc-panel p-4 text-[12px] text-[#777]">No championship bracket available yet.</div>;
  }

  const rounds = new Map<number, ChampionshipSummary["matches"]>();
  championship.matches.forEach((match) => {
    const current = rounds.get(match.round) ?? [];
    current.push(match);
    rounds.set(match.round, current);
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="sc-kicker">Championship</p>
          <p className="mt-2 text-[28px] font-black text-[#f4f5fb]">{championship.season.name}</p>
        </div>
        <div className="flex gap-2">
          <span className="sc-chip sc-chip-green">Round {championship.currentRound || 1}</span>
          <span className="sc-chip sc-chip-orange">{championship.qualifiers.length} teams</span>
        </div>
      </div>

      <div className="sc-panel-strong p-4">
        <p className="text-[11px] font-black text-[#9f64ff]">
          {championship.qualifiers[0] ? `${championship.qualifiers[0].syndicate.name} - Seed #${championship.qualifiers[0].seed}` : "No top seed"}
        </p>
      </div>

      <div className="space-y-5">
        {Array.from(rounds.entries())
          .sort(([a], [b]) => b - a)
          .map(([round, matches]) => (
            <div key={round} className="space-y-3">
              <p className="text-[24px] font-black text-[#f3f4fa]">Round {round} - {round === championship.currentRound ? "Active" : "Results"}</p>
              {matches.map((match) => (
                <div key={match.id} className="sc-panel p-4">
                  <div className="flex items-center justify-between gap-3 text-[10px] font-black tracking-[0.16em] uppercase text-[#6f7388]">
                    <span>{match.status}</span>
                    <span>{new Date(match.endsAt).toLocaleString()}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                    <div className={`rounded-2xl border p-5 text-center ${match.winnerSyndicate?.id === match.syndicateA.id ? "border-[rgba(54,212,127,0.24)] bg-[rgba(12,40,28,0.92)]" : "border-white/8 bg-black/20"}`}>
                      <p className="text-[15px] font-black text-[#f3f4fa]">{match.syndicateA.name}</p>
                      <p className="mt-2 text-[42px] font-black" style={{ color: match.winnerSyndicate?.id === match.syndicateA.id ? "#36d47f" : "#ff9d32" }}>{match.scoreA}</p>
                      {match.winnerSyndicate?.id === match.syndicateA.id ? <p className="text-[10px] font-black tracking-[0.18em] text-[#36d47f] uppercase">Winner</p> : null}
                    </div>
                    <span className="text-[12px] font-black tracking-[0.18em] text-[#5e6276] uppercase">VS</span>
                    <div className={`rounded-2xl border p-5 text-center ${match.winnerSyndicate?.id === match.syndicateB.id ? "border-[rgba(54,212,127,0.24)] bg-[rgba(12,40,28,0.92)]" : "border-white/8 bg-black/20"}`}>
                      <p className="text-[15px] font-black text-[#f3f4fa]">{match.syndicateB.name}</p>
                      <p className="mt-2 text-[42px] font-black" style={{ color: match.winnerSyndicate?.id === match.syndicateB.id ? "#36d47f" : "#ff9d32" }}>{match.scoreB}</p>
                      {match.winnerSyndicate?.id === match.syndicateB.id ? <p className="text-[10px] font-black tracking-[0.18em] text-[#36d47f] uppercase">Winner</p> : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}
