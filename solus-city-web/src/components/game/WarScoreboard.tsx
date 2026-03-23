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
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase">Active War</p>
          <p className="mt-1 break-words text-[14px] font-black text-[#eee]">
            {war.attackerSyndicate?.name ?? "Attacker"} vs {war.defenderSyndicate?.name ?? "Defender"}
          </p>
          {war.territory && <p className="text-[11px] text-[#888] mt-1">Linked territory: {war.territory.name}</p>}
        </div>
        <p className="text-[11px] font-bold text-[#fdd835] uppercase tracking-[2px]">{timeRemaining(war.endsAt)}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md border border-[#1f5f36] bg-[#0f2a18] p-3">
          <p className="text-[9px] font-black tracking-[2px] text-[#66bb6a] uppercase">Attacker</p>
          <p className="text-[20px] font-black text-[#eee] mt-1">{war.attackerScore}</p>
        </div>
        <div className="rounded-md border border-[rgba(153,69,255,0.3)] bg-[#1a0a2e] p-3 text-right">
          <p className="text-[9px] font-black tracking-[2px] text-[#9945FF] uppercase">Defender</p>
          <p className="text-[20px] font-black text-[#eee] mt-1">{war.defenderScore}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => onJoin?.()}
          className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-[10px] font-black tracking-[2px] text-[#ddd]"
        >
          JOIN WAR
        </button>
        {canManageActions && (
          <>
            <button
              type="button"
              disabled={busyAction === "supply_deliver"}
              onClick={() => onAction?.("supply_deliver")}
              className="w-full rounded-md border border-[#1f5f36] bg-[#0f2a18] px-3 py-2 text-[10px] font-black tracking-[2px] text-[#66bb6a] disabled:opacity-40"
            >
              {busyAction === "supply_deliver" ? "DELIVERING..." : "SUPPLY DELIVER"}
            </button>
            <button
              type="button"
              disabled={busyAction === "node_secure"}
              onClick={() => onAction?.("node_secure")}
              className="w-full rounded-md border border-[rgba(153,69,255,0.3)] bg-[#1a0a2e] px-3 py-2 text-[10px] font-black tracking-[2px] text-[#9945FF] disabled:opacity-40"
            >
              {busyAction === "node_secure" ? "SECURING..." : "SECURE NODE"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
