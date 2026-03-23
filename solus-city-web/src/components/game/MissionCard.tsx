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
<<<<<<< HEAD
          <p className="text-[11px] font-bold text-[#f2f4ec]">{mission.name}</p>
          <p className="text-[10px] text-[#aab0a3]">{mission.description}</p>
        </div>
        <span className="text-[9px] font-bold tracking-[2px] text-[#d0d5ca] uppercase">{mission.type}</span>
=======
          <p className="text-[18px] font-black text-[#f3f4fa]">{mission.name}</p>
          <p className="mt-1 text-[12px] text-[#717589]">{mission.description}</p>
        </div>
        <span className={`sc-chip ${mission.type === "weekly" ? "sc-chip-orange" : "sc-chip-purple"}`}>{mission.type}</span>
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
      </div>

      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
        <span className="text-[11px] font-black text-[#8a8da2]">{mission.progress}/{mission.goalValue}</span>
        <div className="sc-progress">
          <div className="h-full rounded-full bg-[#4f8cff] transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[11px] font-black text-[#4f8cff]">{pct}%</span>
      </div>
<<<<<<< HEAD
      <div className="flex items-center justify-between text-[10px] font-bold">
        <span className="text-[#d0d5ca]">
          {mission.progress}/{mission.goalValue}
        </span>
        <span className="text-[#66bb6a]">
          ${Math.floor(mission.rewards.cash).toLocaleString()} • {mission.rewards.rp} RP
        </span>
=======

      <div className="flex items-center justify-between gap-3 text-[11px] font-bold">
        <div className="flex flex-col gap-1">
          <span className="text-[#36d47f]">${Math.floor(mission.rewards.cash).toLocaleString()}</span>
          <span className="text-[#9f64ff]">{mission.rewards.rp} RP</span>
        </div>
        <p className="text-right text-[10px] text-[#64687b] uppercase tracking-[0.18em]">
          {mission.claimed ? "Reward locked in" : mission.completed ? "Ready to claim" : "Active contract"}
        </p>
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
      </div>

      {onClaim ? (
        <button
          onClick={() => onClaim(mission)}
          disabled={!canClaim || busy}
<<<<<<< HEAD
          className={`w-full py-2 rounded border text-[10px] font-black tracking-[2px] ${
            canClaim && !busy
              ? "border-[rgba(153,69,255,0.3)] bg-[#1a0a2e] text-[#9945FF]"
              : "border-white/10 bg-black/20 text-[#aab0a3] opacity-60"
          }`}
=======
          className={`sc-button w-full ${canClaim && !busy ? "sc-button-green" : "text-[#555] opacity-60"}`}
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
        >
          {mission.claimed ? "CLAIMED" : busy ? "CLAIMING..." : canClaim ? "CLAIM" : "IN PROGRESS"}
        </button>
      ) : null}
    </div>
  );
<<<<<<< HEAD
}

=======
}
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
