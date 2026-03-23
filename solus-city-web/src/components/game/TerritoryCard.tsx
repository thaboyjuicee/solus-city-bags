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
  const contested = territory.contestState.toLowerCase().includes("contest") || territory.contestState.toLowerCase().includes("war");
  const unclaimed = !territory.owner;
  const toneClass = unclaimed
    ? "border-white/8 bg-[#111218]"
    : contested
    ? "border-[rgba(255,157,50,0.24)] bg-[rgba(255,157,50,0.08)]"
    : "border-[rgba(54,212,127,0.18)] bg-[rgba(13,34,24,0.86)]";

  return (
    <div className={`rounded-[18px] border p-4 flex flex-col gap-4 ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <span className={`sc-chip ${unclaimed ? "" : contested ? "sc-chip-orange" : "sc-chip-green"}`}>
          {unclaimed ? "Unclaimed" : contested ? "Contested" : "Controlled"}
        </span>
        <p className="text-[10px] font-black tracking-[0.18em] text-[#7b7f93] uppercase">Bonus</p>
      </div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[18px] font-black text-[#f3f4fa]">{territory.name}</p>
          <p className="mt-1 text-[10px] font-black tracking-[0.18em] text-[#7d8196] uppercase">{territory.code.replaceAll("_", " ")}</p>
        </div>
        <TerritoryBonusBadge bonusType={territory.bonusType} bonusValue={territory.bonusValue} />
      </div>
      <div className="flex items-center justify-between gap-3 text-[12px] text-[#8f93a8]">
        <span>{territory.owner?.name ?? "Unclaimed"}</span>
        <span className="font-black text-[#b6bacb]">{territory.influence.toLocaleString()}/5,000</span>
      </div>
      <div className="sc-progress">
        <div className={`h-full rounded-full ${contested ? "bg-[#ff9d32]" : unclaimed ? "bg-[#b8bbca]" : "bg-[#36d47f]"}`} style={{ width: `${Math.min(100, (territory.influence / 5000) * 100)}%` }} />
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onOpen} className="sc-button">
          Details
        </button>
        {canContribute ? (
          <>
            <button type="button" disabled={busyAction === "donate_cash"} onClick={() => onContribute?.("donate_cash")} className="sc-button sc-button-green">
              {busyAction === "donate_cash" ? "WORKING..." : "Claim Territory"}
            </button>
            <button type="button" disabled={busyAction === "complete_local_task"} onClick={() => onContribute?.("complete_local_task")} className="sc-button sc-button-primary">
              {busyAction === "complete_local_task" ? "WORKING..." : "Local Task"}
            </button>
            <button type="button" disabled={busyAction === "war_control_action"} onClick={() => onContribute?.("war_control_action")} className="sc-button sc-button-danger">
              {busyAction === "war_control_action" ? "WORKING..." : "Join War"}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
