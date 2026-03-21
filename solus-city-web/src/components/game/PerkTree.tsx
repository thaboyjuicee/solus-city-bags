"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/api/client";
import { PerksResponse } from "@/lib/gameApi";

export function PerkTree({
  data,
  onUpdated,
}: {
  data: PerksResponse;
  onUpdated: () => Promise<void> | void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const unlocked = useMemo(() => new Set(data.unlocked.map((row) => row.perkDefinition.id)), [data.unlocked]);

  const grouped = useMemo(() => {
    return data.branches.map((branch) => ({
      ...branch,
      perks: data.definitions.filter((perk) => perk.branch === branch.code),
    }));
  }, [data]);

  const unlock = async (perkDefinitionId: string) => {
    setBusyId(perkDefinitionId);
    try {
      await api.post("/perks/unlock", { perkDefinitionId });
      await onUpdated();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase">Perks</p>
          <p className="text-[12px] text-[#aaa]">Unlock branches that shape your build server-side.</p>
        </div>
        <p className="text-[18px] font-black text-[#fdd835]">{data.availablePoints}</p>
      </div>
      {grouped.map((branch) => (
        <div key={branch.code} className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-2">
          <div>
            <p className="text-[10px] font-black tracking-[3px] text-[#9945FF] uppercase">{branch.name}</p>
            <p className="text-[11px] text-[#888]">{branch.description}</p>
          </div>
          {branch.perks.map((perk) => {
            const isUnlocked = unlocked.has(perk.id);
            const blockedByPrereq = !!perk.prerequisitePerk && !unlocked.has(perk.prerequisitePerk.id);
            return (
              <div key={perk.id} className="rounded-md border border-white/10 bg-black/20 p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[12px] font-bold text-[#eee]">{perk.name}</p>
                  <p className="text-[10px] text-[#888]">{perk.description}</p>
                  <p className="text-[9px] text-[#555] uppercase tracking-[2px] mt-1">
                    Tier {perk.tier} • {perk.effectType.replaceAll("_", " ")}
                  </p>
                </div>
                <button
                  disabled={isUnlocked || blockedByPrereq || data.availablePoints < 1 || busyId === perk.id}
                  onClick={() => unlock(perk.id)}
                  className="px-3 py-2 rounded border border-[rgba(153,69,255,0.3)] bg-[#1a0a2e] text-[#9945FF] text-[10px] font-black tracking-[2px] disabled:opacity-40"
                >
                  {isUnlocked ? "UNLOCKED" : busyId === perk.id ? "..." : blockedByPrereq ? "LOCKED" : "UNLOCK"}
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
