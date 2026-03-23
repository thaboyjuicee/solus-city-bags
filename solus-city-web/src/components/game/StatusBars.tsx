"use client";

import { useEffect, useRef } from "react";

const BARS = [
  { key: "hp", label: "Health", currentKey: "health", maxKey: "maxHealth", color: "#e53935" },
  { key: "en", label: "Energy", currentKey: "energy", maxKey: "maxEnergy", color: "#43a047" },
  { key: "nv", label: "Nerve", currentKey: "nerve", maxKey: "maxNerve", color: "#1e88e5" },
  { key: "happiness", label: "Happiness", currentKey: "happiness", maxKey: "maxHappiness", color: "#fdd835" },
] as const;

export interface ProfileStats {
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  nerve: number;
  maxNerve: number;
  happiness: number;
  maxHappiness: number;
  level: number;
  xp: number;
  cash: number;
  rp: number;
  name: string;
  ap: number;
  dp: number;
  inHospital: boolean;
}

function AnimatedBar({
  current,
  max,
  color,
}: {
  current: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.min(current / max, 1) * 100 : 0;
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = fillRef.current;
    if (!el) return;
    el.style.width = "0%";
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (fillRef.current) fillRef.current.style.width = `${pct}%`;
      });
    });
    return () => cancelAnimationFrame(id);
  }, [pct]);

  return (
    <div className="flex-1 h-2 rounded-full bg-[#1e1e1e] overflow-hidden">
      <div
        ref={fillRef}
        className="h-full rounded-full transition-all duration-500"
        style={{ backgroundColor: color, width: "0%" }}
      />
    </div>
  );
}

interface StatusBarsProps {
  profile: ProfileStats;
}

export function StatusBars({ profile }: StatusBarsProps) {
  const xpNext = profile.level * 100;

  return (
    <div className="bg-black/20 backdrop-blur-sm border-b border-white/10 px-3 py-2">
      <div className="flex flex-col gap-1">
        {BARS.map(({ label, currentKey, maxKey, color, key }) => {
          const current = profile[currentKey];
          const max = profile[maxKey];

          return (
            <div key={key} className="flex items-center gap-2">
              <span className="w-[64px] shrink-0 text-[10px] font-bold text-[#777]">
                {label}
              </span>
              <AnimatedBar current={current} max={max} color={color} />
              <span className="w-14 text-right text-[10px] text-[#d0d5ca]">
                {current}/{max}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="bg-[#9945FF] text-white text-[9px] font-bold px-2 py-0.5 rounded">
            LV {profile.level}
          </span>
          <span className="text-[9px] font-bold text-[#d0d5ca]">
            XP {profile.xp}/{xpNext}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-bold">
          <span className="text-[#66bb6a]">Cash {Math.floor(profile.cash).toLocaleString()}</span>
          <span className="text-[#ef5350]">AP {profile.ap}</span>
          <span className="text-[#42a5f5]">DP {profile.dp}</span>
        </div>
      </div>
    </div>
  );
}

