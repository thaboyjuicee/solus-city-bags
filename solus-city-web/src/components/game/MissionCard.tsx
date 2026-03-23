import { Mission } from "@/lib/gameApi";

export function MissionCard({
  mission,
  onClaim,
  busy,
}: {
  mission: Mission;
  onClaim?: (mission: Mission) => void;
  busy?: boolean;
}) {
  const pct = Math.min(100, Math.round((mission.progress / mission.goalValue) * 100));
  const canClaim = mission.completed && !mission.claimed && !!onClaim;

  return (
    <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-3 flex flex-col gap-2">
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="break-words text-[11px] font-bold text-[#eee]">{mission.name}</p>
          <p className="break-words text-[10px] text-[#555]">{mission.description}</p>
        </div>
        <span className="text-[9px] font-bold tracking-[2px] text-[#888] uppercase">{mission.type}</span>
      </div>
      <div className="h-2 rounded-full bg-[#1e1e1e] overflow-hidden">
        <div className="h-full rounded-full bg-[#9945FF] transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex flex-col gap-1 text-[10px] font-bold sm:flex-row sm:items-center sm:justify-between">
        <span className="text-[#888]">
          {mission.progress}/{mission.goalValue}
        </span>
        <span className="text-[#66bb6a]">
          ${Math.floor(mission.rewards.cash).toLocaleString()} • {mission.rewards.rp} RP
        </span>
      </div>
      {onClaim && (
        <button
          onClick={() => onClaim(mission)}
          disabled={!canClaim || busy}
          className={`w-full py-2 rounded border text-[10px] font-black tracking-[2px] ${
            canClaim && !busy
              ? "border-[rgba(153,69,255,0.3)] bg-[#1a0a2e] text-[#9945FF]"
              : "border-white/10 bg-black/20 text-[#555] opacity-60"
          }`}
        >
          {mission.claimed ? "CLAIMED" : busy ? "CLAIMING..." : canClaim ? "CLAIM" : "IN PROGRESS"}
        </button>
      )}
    </div>
  );
}
