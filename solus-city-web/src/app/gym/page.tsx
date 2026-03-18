"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { api } from "@/lib/api/client";
import { StatusBars, type ProfileStats } from "@/components/ui/StatusBars";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Stat = "strength" | "speed" | "defense" | "dexterity";

interface TrainResponse {
  stat: Stat;
  gained: number;
  happyBonus: boolean;
  xpGained: number;
  leveledUp: boolean;
  newLevel: number;
  profile: {
    energy: number;
    happiness: number;
    strength: number;
    speed: number;
    defense: number;
    dexterity: number;
    xp: number;
    level: number;
  };
}

type StatResult =
  | { ok: true; data: TrainResponse }
  | { ok: false; msg: string };

type PageProfile = ProfileStats & {
  strength: number;
  speed: number;
  defense: number;
  dexterity: number;
  inHospital: boolean;
};

// ---------------------------------------------------------------------------
// Constants â€” mirrors GymScreen.tsx and the server constants
// ---------------------------------------------------------------------------

const STATS: { key: Stat; label: string; color: string }[] = [
  { key: "strength",  label: "Strength",  color: "#ff9800" },
  { key: "speed",     label: "Speed",     color: "#ab47bc" },
  { key: "defense",   label: "Defense",   color: "#26c6da" },
  { key: "dexterity", label: "Dexterity", color: "#fdd835" },
];

const GYM_ENERGY_COST = 5;

// ---------------------------------------------------------------------------
// Animated stat bar â€” mirrors GymScreen AnimatedStatBar
// Fill % = Math.min(value / 5, 100) so the bar is "full" at 500 points
// ---------------------------------------------------------------------------

function AnimatedStatBar({ value, color }: { value: number; color: string }) {
  const fillRef = useRef<HTMLDivElement>(null);
  const pct = Math.min(value / 5, 100);

  useEffect(() => {
    const el = fillRef.current;
    if (!el) return;
    el.style.transition = "none";
    el.style.width = "0%";
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        el.style.transition = "width 600ms ease";
        el.style.width = `${pct}%`;
      })
    );
    return () => cancelAnimationFrame(id);
  }, [pct]);

  return (
    <div className="flex-1 h-1.5 bg-[#1e1e1e] rounded-full overflow-hidden mx-2">
      <div
        ref={fillRef}
        className="h-full rounded-full"
        style={{ backgroundColor: color, width: "0%" }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function GymPage() {
  const [profile, setProfile] = useState<PageProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [training, setTraining] = useState<Stat | null>(null);
  // Per-stat last result
  const [results, setResults] = useState<Partial<Record<Stat, StatResult>>>({});

  const fetchProfile = useCallback(async () => {
    setPageError(null);
    try {
      const res = await api.get<PageProfile>("/me");
      setProfile(res.data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to load profile.";
      setPageError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const train = async (stat: Stat) => {
    if (training !== null) return;
    setTraining(stat);
    setResults((prev) => {
      const next = { ...prev };
      delete next[stat];
      return next;
    });

    try {
      const res = await api.post<TrainResponse>("/gym/train", { stat });
      const data = res.data;

      // Patch local profile from the partial returned by the server
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              energy:    data.profile.energy,
              happiness: data.profile.happiness,
              strength:  data.profile.strength,
              speed:     data.profile.speed,
              defense:   data.profile.defense,
              dexterity: data.profile.dexterity,
              xp:        data.profile.xp,
              level:     data.profile.level,
            }
          : prev
      );

      setResults((prev) => ({ ...prev, [stat]: { ok: true, data } }));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Training failed. Please try again.";
      setResults((prev) => ({ ...prev, [stat]: { ok: false, msg } }));
    } finally {
      setTraining(null);
    }
  };

  // ------------------------------------------------------------------
  // Loading
  // ------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex min-h-dvh bg-transparent items-center justify-center">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Fatal error
  // ------------------------------------------------------------------
  if (pageError) {
    return (
      <div className="flex flex-col min-h-dvh bg-transparent items-center justify-center gap-4 px-6">
        <p className="text-danger text-sm text-center">{pageError}</p>
        <button
          onClick={() => { setLoading(true); fetchProfile(); }}
          className="px-5 py-2.5 bg-accent rounded-lg text-white font-semibold text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  const notEnoughEnergy = (profile?.energy ?? 0) < GYM_ENERGY_COST;

  return (
    <div className="flex flex-col bg-transparent min-h-dvh">
      {profile && <StatusBars profile={profile} />}

      <div className="flex flex-col gap-3">

        {/* Hero */}
        <div className="h-28 rounded-lg overflow-hidden border border-white/10 bg-black/20 flex items-end relative backdrop-blur-sm">
          <Image
            src="/assets/images/gym_banner.png"
            alt="Gym banner"
            fill
            className="object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          <div className="relative z-10 px-3 pb-3">
            <p className="text-[10px] font-black text-[#eee] tracking-[3px] uppercase mb-1">
              Gym
            </p>
            <p className="text-[11px] font-semibold text-text-dim">
              Spend {GYM_ENERGY_COST} energy to train a combat stat
            </p>
          </div>
        </div>

        {/* Hospital banner */}
        {profile?.inHospital && (
          <div className="flex items-center justify-center gap-2 bg-black/20 border border-[#7f1919] rounded px-3 py-2 backdrop-blur-sm">
            <span className="text-[#ef5350] text-[11px] font-bold">
              You are in the hospital and cannot train.
            </span>
          </div>
        )}

        {/* Current stats panel */}
        <div className="bg-black/20 border border-white/10 rounded-lg p-3.5 flex flex-col gap-2.5 backdrop-blur-sm">
          {STATS.map((s) => {
            const val = profile ? (profile as unknown as Record<string, number>)[s.key] ?? 0 : 0;
            return (
              <div key={s.key} className="flex items-center">
                <span
                  className="w-[72px] text-[11px] font-bold tracking-wide"
                  style={{ color: s.color }}
                >
                  {s.label}
                </span>
                <AnimatedStatBar value={val} color={s.color} />
                <span className="w-10 text-right text-[13px] font-bold text-[#eee]">
                  {val}
                </span>
              </div>
            );
          })}
        </div>

        {/* Train buttons */}
        <div className="flex flex-col gap-2">
          {STATS.map((s) => {
            const isTraining = training === s.key;
            const anyTraining = training !== null;
            const disabled = anyTraining || !!profile?.inHospital;
            const result = results[s.key];

            return (
              <div key={s.key}>
                <button
                  onClick={() => train(s.key)}
                  disabled={disabled}
                  className="w-full border rounded-lg p-3.5 flex items-center justify-center gap-2 text-[11px] font-bold tracking-[2px] bg-black/20 transition-opacity backdrop-blur-sm"
                  style={{
                    borderColor: disabled ? "rgba(255,255,255,0.08)" : s.color,
                    color: disabled ? "#555" : s.color,
                    opacity: anyTraining && !isTraining ? 0.4 : 1,
                  }}
                >
                  {isTraining ? (
                    <LoadingSpinner size={16} color={s.color} />
                  ) : (
                    <>
                      {/* Dumbbell icon */}
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6.5 6.5h11M6.5 17.5h11M6 10h1a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1zM17 10h1a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1zM3 12h2M19 12h2" />
                      </svg>
                      TRAIN {s.label.toUpperCase()}
                      {notEnoughEnergy && !profile?.inHospital && (
                        <span className="text-[9px] normal-case tracking-normal font-normal text-text-dim ml-1">
                          (low energy)
                        </span>
                      )}
                    </>
                  )}
                </button>

                {/* Inline result */}
                {result && (
                  <div
                    className={`mt-1.5 rounded px-3 py-2 border text-[11px] font-bold flex flex-col gap-0.5 ${
                      result.ok
                        ? "bg-[#0a1a0a] border-[#1a4a1a] text-[#66bb6a]"
                        : "bg-[#1a0a0a] border-[#7f1919] text-[#ef5350]"
                    }`}
                  >
                    {result.ok ? (
                      <>
                        <span>
                          +{result.data.gained} {s.label}
                          {result.data.happyBonus && (
                            <span className="text-[#fdd835] ml-1">
                              (happiness bonus!)
                            </span>
                          )}
                          {" "}Â· +{result.data.xpGained} XP
                        </span>
                        {result.data.leveledUp && (
                          <span className="text-[#9945FF]">
                            LEVEL UP! Now Level {result.data.newLevel}
                          </span>
                        )}
                      </>
                    ) : (
                      <span>{result.msg}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Info box */}
        <div className="bg-black/20 border border-white/10 rounded-lg p-3 flex flex-col gap-1.5 backdrop-blur-sm">
          <div className="flex items-center gap-1.5 mb-0.5">
            <svg
              className="w-3 h-3 text-text-dim"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="text-[9px] font-black tracking-[2px] uppercase text-text-dim">
              Info
            </span>
          </div>
          <p className="text-[#444] text-[11px]">Energy cost: {GYM_ENERGY_COST} per session</p>
          <p className="text-[#444] text-[11px]">Stat gain: 1-3 points (bonus +1 with happiness)</p>
          <p className="text-[#444] text-[11px]">XP reward: 10 per session</p>
          <p className="text-[#444] text-[11px]">Training raises STR/SPD/DEF/DEX which feed into AP & DP</p>
        </div>

      </div>
    </div>
  );
}


