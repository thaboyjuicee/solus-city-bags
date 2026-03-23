"use client";

import { TerritoryBonusBadge } from "./TerritoryBonusBadge";

type TerritorySummary = {
  id: string;
  name: string;
  code: string;
  bonusType: string;
  bonusValue: number;
  active: boolean;
  owner?: { id: string; name: string } | null;
  influence: number;
  contestState: string;
};

type Props = {
  territory: TerritorySummary;
  canContribute?: boolean;
  busyAction?: string | null;
  onOpen?: () => void;
  onContribute?: (actionType: "donate_cash" | "complete_local_task" | "war_control_action") => Promise<void> | void;
};

export function TerritoryCard({ territory, canContribute = false, busyAction, onOpen, onContribute }: Props) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase">{territory.code.replaceAll("_", " ")}</p>
          <p className="mt-1 break-words text-[16px] font-black text-[#eee]">{territory.name}</p>
        </div>
        <TerritoryBonusBadge bonusType={territory.bonusType} bonusValue={territory.bonusValue} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-md border border-white/10 bg-black/20 p-3">
          <p className="text-[9px] font-black tracking-[2px] text-[#555] uppercase">Owner</p>
          <p className="mt-1 break-words text-[12px] font-bold text-[#eee]">{territory.owner?.name ?? "Unclaimed"}</p>
        </div>
        <div className="rounded-md border border-white/10 bg-black/20 p-3">
          <p className="text-[9px] font-black tracking-[2px] text-[#555] uppercase">Influence</p>
          <p className="text-[12px] font-bold text-[#66bb6a] mt-1">{territory.influence}</p>
        </div>
      </div>

      <p className="text-[11px] text-[#888]">State: {territory.contestState.replaceAll("_", " ")}</p>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={onOpen}
          className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-[10px] font-black tracking-[2px] text-[#ddd] sm:w-auto"
        >
          DETAILS
        </button>
        {canContribute && (
          <>
            <button
              type="button"
              disabled={busyAction === "donate_cash"}
              onClick={() => onContribute?.("donate_cash")}
              className="w-full rounded-md border border-[#1f5f36] bg-[#0f2a18] px-3 py-2 text-[10px] font-black tracking-[2px] text-[#66bb6a] disabled:opacity-40 sm:w-auto"
            >
              {busyAction === "donate_cash" ? "WORKING..." : "DONATE CASH"}
            </button>
            <button
              type="button"
              disabled={busyAction === "complete_local_task"}
              onClick={() => onContribute?.("complete_local_task")}
              className="w-full rounded-md border border-[rgba(153,69,255,0.3)] bg-[#1a0a2e] px-3 py-2 text-[10px] font-black tracking-[2px] text-[#9945FF] disabled:opacity-40 sm:w-auto"
            >
              {busyAction === "complete_local_task" ? "WORKING..." : "LOCAL TASK"}
            </button>
            <button
              type="button"
              disabled={busyAction === "war_control_action"}
              onClick={() => onContribute?.("war_control_action")}
              className="w-full rounded-md border border-[#6d4c41] bg-[#231412] px-3 py-2 text-[10px] font-black tracking-[2px] text-[#ff8a65] disabled:opacity-40 sm:w-auto"
            >
              {busyAction === "war_control_action" ? "WORKING..." : "WAR CONTROL"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
