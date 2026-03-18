"use client";

import { useEffect, useRef } from "react";

// Mirrors the exact bar colours and layout from mobile StatusBars.tsx
const BARS = [
  { label: "HP", currentKey: "health",    maxKey: "maxHealth",    color: "#e53935" },
  { label: "EN", currentKey: "energy",    maxKey: "maxEnergy",    color: "#43a047" },
  { label: "NV", currentKey: "nerve",     maxKey: "maxNerve",     color: "#1e88e5" },
  { label: "HA", currentKey: "happiness", maxKey: "maxHappiness", color: "#fdd835" },
] as const;

export interface ProfileStats {
  health: number;     maxHealth: number;
  energy: number;     maxEnergy: number;
  nerve: number;      maxNerve: number;
  happiness: number;  maxHappiness: number;
  level: number;
  xp: number;
  cash: number;
  ap: number;
  dp: number;
  inHospital: boolean;
}

function AnimatedBar({
  label,
  current,
  max,
  color,
}: {
  label: string;
  current: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.min(current / max, 1) * 100 : 0;
  const fillRef = useRef<HTMLDivElement>(null);

  // Animate width on mount / value change
  useEffect(() => {
    const el = fillRef.current;
    if (!el) return;
    el.style.transition = "none";
    el.style.width = "0%";
    // Kick off transition after the zero-width paint settles
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = "width 600ms ease";
        el.style.width = `${pct}%`;
      });
    });
    return () => cancelAnimationFrame(id);
  }, [pct]);

  return (
    <div className="flex items-center gap-1.5">
      <span className="w-5 text-[9px] font-bold tracking-widest uppercase text-text-dim">
        {label}
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
        <div ref={fillRef} className="h-full rounded-full" style={{ backgroundColor: color, width: "0%" }} />
      </div>
      <span className="w-12 text-right text-[9px] font-bold text-text-dim">
        {current}/{max}
      </span>
    </div>
  );
}

interface Props {
  profile: ProfileStats;
}

export function StatusBars({ profile }: Props) {
  const xpNext = 100 * profile.level;

  return (
    <div className="bg-background border-b border-border px-3 py-2 flex flex-col gap-1">
      {profile.inHospital && (
        <div className="flex items-center justify-center gap-1.5 bg-[#1a0a0a] border border-[#7f1919] rounded px-3 py-1.5 mb-1">
          <span className="text-[#ef5350] text-[10px] font-black tracking-[3px]">
            IN HOSPITAL
          </span>
        </div>
      )}

      {BARS.map(({ label, currentKey, maxKey, color }) => (
        <AnimatedBar
          key={label}
          label={label}
          current={profile[currentKey]}
          max={profile[maxKey]}
          color={color}
        />
      ))}

      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
        <span className="bg-[#9945FF20] text-[#9945FF] text-[9px] font-bold px-1.5 py-0.5 rounded">
          LV {profile.level}
        </span>
        <span className="text-[#fdd835] text-[9px] font-bold">
          XP {profile.xp}/{xpNext}
        </span>
        <span className="text-[#66bb6a] text-[9px] font-bold flex-1">
          ${Math.floor(profile.cash).toLocaleString()}
        </span>
        <span className="text-[#ef5350] text-[9px] font-bold">AP {profile.ap}</span>
        <span className="text-[#1e88e5] text-[9px] font-bold">DP {profile.dp}</span>
      </div>
    </div>
  );
}
