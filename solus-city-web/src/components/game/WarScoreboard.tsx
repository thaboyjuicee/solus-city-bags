"use client";

type WarSummary = {
  id: string;
  status: string;
  startsAt: string;
  endsAt: string;
  attackerScore: number;
  defenderScore: number;
  territory?: { id: string; name: string; code: string } | null;
  attackerSyndicate?: { id: string; name: string } | null;
  defenderSyndicate?: { id: string; name: string } | null;
};

type Props = {
  war: WarSummary;
  canManageActions?: boolean;
  onJoin?: () => Promise<void> | void;
  onAction?: (actionType: "supply_deliver" | "node_secure") => Promise<void> | void;
  busyAction?: string | null;
};

function timeRemaining(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "ended";
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export function WarScoreboard({ war, canManageActions = false, onJoin, onAction, busyAction }: Props) {
  const total = Math.max(1, war.attackerScore + war.defenderScore);
  const attackerPct = Math.round((war.attackerScore / total) * 100);

  return (
    <div className="sc-panel-danger p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="sc-kicker text-[#b06868]">Active War</p>
          <p className="mt-3 text-[26px] font-black text-[#f3f4fa]">
            {war.attackerSyndicate?.name ?? "Attacker"} vs {war.defenderSyndicate?.name ?? "Defender"}
          </p>
          {war.territory ? <p className="mt-2 text-[12px] text-[#8e92a7]">At stake: {war.territory.name}</p> : null}
        </div>
        <div className="text-right">
          <span className="sc-chip sc-chip-green">{war.status}</span>
          <p className="mt-2 text-[10px] font-black tracking-[0.18em] text-[#7f8397] uppercase">{timeRemaining(war.endsAt)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-center">
        <div>
          <p className="text-[11px] font-black tracking-[0.16em] text-[#7c8095] uppercase">{war.attackerSyndicate?.name ?? "Attacker"}</p>
          <p className="mt-2 text-[42px] font-black text-[#36d47f]">{war.attackerScore}</p>
        </div>
        <div>
          <p className="text-[11px] font-black tracking-[0.16em] text-[#7c8095] uppercase">{war.defenderSyndicate?.name ?? "Defender"}</p>
          <p className="mt-2 text-[42px] font-black text-[#f2f3fa]">{war.defenderScore}</p>
        </div>
      </div>

      <div className="h-[7px] overflow-hidden rounded-full bg-white/5">
        <div className="h-full rounded-full bg-[#36d47f]" style={{ width: `${attackerPct}%` }} />
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onJoin?.()} className="sc-button">
          Join War
        </button>
        {canManageActions ? (
          <>
            <button type="button" disabled={busyAction === "supply_deliver"} onClick={() => onAction?.("supply_deliver")} className="sc-button sc-button-green">
              {busyAction === "supply_deliver" ? "DELIVERING..." : "Supply Deliver"}
            </button>
            <button type="button" disabled={busyAction === "node_secure"} onClick={() => onAction?.("node_secure")} className="sc-button sc-button-danger">
              {busyAction === "node_secure" ? "SECURING..." : "Launch Attack"}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}