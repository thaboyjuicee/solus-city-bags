"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/api/client";
import { PerksResponse } from "@/lib/gameApi";

const BRANCH_SUBTITLES: Record<string, string> = {
  enforcer: "PvP pressure and loot edges",
  hustler: "Crime cash and heat control",
  grinder: "Training and recovery efficiency",
};

export function PerkTree({
  data,
  onUpdated,
}: {
  data: PerksResponse;
  onUpdated: () => Promise<void> | void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const unlocked = useMemo(
    () => new Set(data.unlocked.map((row) => row.perkDefinition.id)),
    [data.unlocked]
  );

  const grouped = useMemo(() => {
    return data.branches.map((branch) => ({
      ...branch,
      tiers: data.definitions
        .filter((perk) => perk.branch === branch.code)
        .sort((a, b) => a.tier - b.tier),
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
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black tracking-[3px] text-[#aab0a3] uppercase">Skill Tree</p>
          <p className="text-sm text-[#aaa] mt-0.5">Unlock passive bonuses that shape your build.</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-bold text-[#aab0a3] tracking-[2px] uppercase">Points</p>
          <p className="text-2xl font-black text-[#fdd835]">{data.availablePoints}</p>
        </div>
      </div>

      {/* Branches */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {grouped.map((branch) => (
          <div key={branch.code} className="flex flex-col">
            {/* Branch header */}
            <div className="rounded-lg border border-[#9945FF]/40 bg-[#1a0a2e] px-4 py-3 text-center mb-2">
              <p className="text-sm font-black tracking-[2px] text-[#9945FF] uppercase">{branch.name}</p>
              <p className="text-[10px] text-[#666] mt-0.5">
                {BRANCH_SUBTITLES[branch.code.toLowerCase()] ?? branch.description}
              </p>
            </div>

            {/* Perk nodes */}
            {branch.tiers.map((perk, index) => {
              const isUnlocked = unlocked.has(perk.id);
              const blockedByPrereq =
                !!perk.prerequisitePerk && !unlocked.has(perk.prerequisitePerk.id);
              const canUnlock = !isUnlocked && !blockedByPrereq && data.availablePoints >= 1;
              const busy = busyId === perk.id;

              return (
                <div key={perk.id} className="flex flex-col items-center">
                  {/* Connector */}
                  {index > 0 && (
                    <div
                      className={`h-6 border-l-2 ${
                        isUnlocked ? "border-[#9945FF]/60" : "border-[#9945FF]/20"
                      }`}
                    />
                  )}

                  {/* Node card */}
                  <div
                    className={`w-full rounded-lg p-3 flex flex-col gap-2 transition-all duration-200 ${
                      isUnlocked
                        ? "border border-[#9945FF] bg-[#110728] shadow-[0_0_8px_rgba(153,69,255,0.4)]"
                        : canUnlock
                        ? "border border-[#9945FF]/80 bg-black/30 hover:shadow-[0_0_8px_rgba(153,69,255,0.2)] cursor-pointer"
                        : "border border-[#9945FF]/40 bg-black/10 opacity-50"
                    }`}
                  >
                    {/* Name row + tier badge */}
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-sm font-bold leading-tight ${
                          isUnlocked ? "text-white" : canUnlock ? "text-white" : "text-[#aab0a3]"
                        }`}
                      >
                        {perk.name}
                      </p>
                      <span
                        className={`shrink-0 text-[9px] font-black tracking-[1px] uppercase px-1.5 py-0.5 rounded border ${
                          isUnlocked
                            ? "border-[#9945FF]/50 text-[#9945FF] bg-[#9945FF]/10"
                            : "border-white/10 text-[#444] bg-black/20"
                        }`}
                      >
                        TIER {perk.tier}
                      </span>
                    </div>

                    {/* Description */}
                    <p
                      className={`text-xs leading-snug ${
                        isUnlocked ? "text-gray-400" : canUnlock ? "text-gray-400" : "text-[#444]"
                      }`}
                    >
                      {perk.description}
                    </p>

                    {/* Action */}
                    {isUnlocked ? (
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <span className="text-[10px] font-black tracking-[1px] text-[#66bb6a] uppercase">✓ Unlocked</span>
                      </div>
                    ) : blockedByPrereq ? (
                      <p className="text-[10px] font-bold text-[#ef5350]/60 uppercase tracking-[1px] pt-0.5">
                        🔒 Locked
                      </p>
                    ) : (
                      <button
                        disabled={busy || data.availablePoints < 1}
                        onClick={() => unlock(perk.id)}
                        className="w-full py-2 rounded-md bg-[#9945FF] text-white text-[11px] font-black tracking-[2px] uppercase hover:bg-[#7a35cc] disabled:opacity-40 disabled:cursor-not-allowed transition-colors mt-0.5"
                      >
                        {busy ? "Unlocking..." : "UNLOCK"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

