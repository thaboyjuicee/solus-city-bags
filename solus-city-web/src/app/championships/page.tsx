"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { ChampionshipBracket } from "@/components/game/ChampionshipBracket";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ChampionshipSummary } from "@/lib/gameApi";

export default function ChampionshipsPage() {
  const [current, setCurrent] = useState<ChampionshipSummary | null>(null);
  const [bracket, setBracket] = useState<ChampionshipSummary | null>(null);
  const [qualifiers, setQualifiers] = useState<Array<{ seed: number; qualifyingPoints: number; syndicate: { id: string; name: string } }> | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<{ championship: ChampionshipSummary | null }>("/championships/current"),
      api.get<{ bracket: ChampionshipSummary | null }>("/championships/bracket"),
      api.get<{ qualifiers: Array<{ seed: number; qualifyingPoints: number; syndicate: { id: string; name: string } }> }>("/championships/qualifiers"),
    ]).then(([currentRes, bracketRes, qualifiersRes]) => {
      setCurrent(currentRes.data.championship);
      setBracket(bracketRes.data.bracket);
      setQualifiers(qualifiersRes.data.qualifiers);
    });
  }, []);

  if (!bracket && !current && !qualifiers) return <div className="flex min-h-dvh items-center justify-center"><LoadingSpinner size={32} /></div>;

  return (
    <div className="flex flex-col gap-4">
      {current && (
        <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black tracking-[3px] text-[#aab0a3] uppercase">Current Championship</p>
            <p className="text-[18px] font-black text-[#f2f4ec]">{current.season.name}</p>
          </div>
          <p className="text-[11px] font-black tracking-[2px] text-[#fdd835] uppercase">{current.status}</p>
        </div>
      )}

      {qualifiers && qualifiers.length > 0 && (
        <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
          <p className="text-[10px] font-black tracking-[3px] text-[#aab0a3] uppercase">Qualifiers</p>
          {qualifiers.map((entry) => (
            <div key={entry.syndicate.id} className="rounded-md border border-white/10 bg-black/20 p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[12px] font-bold text-[#f2f4ec]">#{entry.seed} {entry.syndicate.name}</p>
                <p className="text-[10px] text-[#777]">Qualifier score {entry.qualifyingPoints}</p>
              </div>
              <p className="text-[9px] uppercase tracking-[2px] text-[#66bb6a]">Qualified</p>
            </div>
          ))}
        </div>
      )}

      <ChampionshipBracket championship={bracket} />
    </div>
  );
}


