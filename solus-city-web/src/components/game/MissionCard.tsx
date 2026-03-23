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
    <div className="sc-panel p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[18px] font-black text-[#f3f4fa]">{mission.name}</p>
          <p className="mt-1 text-[12px] text-[#717589]">{mission.description}</p>
        </div>
        <span className={`sc-chip ${mission.type === "weekly" ? "sc-chip-orange" : "sc-chip-purple"}`}>{mission.type}</span>
      </div>

      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
        <span className="text-[11px] font-black text-[#8a8da2]">{mission.progress}/{mission.goalValue}</span>
        <div className="sc-progress">
          <div className="h-full rounded-full bg-[#4f8cff] transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[11px] font-black text-[#4f8cff]">{pct}%</span>
      </div>

      <div className="flex items-center justify-between gap-3 text-[11px] font-bold">
        <div className="flex flex-col gap-1">
          <span className="text-[#36d47f]">${Math.floor(mission.rewards.cash).toLocaleString()}</span>
          <span className="text-[#9f64ff]">{mission.rewards.rp} RP</span>
        </div>
        <p className="text-right text-[10px] text-[#64687b] uppercase tracking-[0.18em]">
          {mission.claimed ? "Reward locked in" : mission.completed ? "Ready to claim" : "Active contract"}
        </p>
      </div>

      {onClaim ? (
        <button
          onClick={() => onClaim(mission)}
          disabled={!canClaim || busy}
          className={`sc-button w-full ${canClaim && !busy ? "sc-button-green" : "text-[#555] opacity-60"}`}
        >
          {mission.claimed ? "CLAIMED" : busy ? "CLAIMING..." : canClaim ? "CLAIM" : "IN PROGRESS"}
        </button>
      ) : null}
    </div>
  );
}