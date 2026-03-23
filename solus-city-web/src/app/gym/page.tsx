"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type Stat = "strength" | "speed" | "defense" | "dexterity";
<<<<<<< HEAD

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
// Constants - mirrors GymScreen.tsx and the server constants
// ---------------------------------------------------------------------------

type StatIcon = "dumbbell" | "target" | "shield" | "swords";

const STATS: { key: Stat; label: string; color: string; icon: StatIcon }[] = [
  { key: "strength", label: "Strength", color: "#ff9800", icon: "dumbbell" },
  { key: "speed", label: "Speed", color: "#ab47bc", icon: "target" },
  { key: "defense", label: "Defense", color: "#26c6da", icon: "shield" },
  { key: "dexterity", label: "Dexterity", color: "#fdd835", icon: "swords" },
];

const GYM_ENERGY_COST = 5;

// ---------------------------------------------------------------------------
// Animated stat bar - mirrors GymScreen AnimatedStatBar
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

function StatIcon({ icon, className }: { icon: StatIcon; className?: string }) {
  if (icon === "swords") {
    return <Swords className={className} />;
  }

  if (icon === "target") {
    return <Target className={className} />;
  }

  if (icon === "shield") {
    return <Shield className={className} />;
  }

  return <Dumbbell className={className} />;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
=======
type PageProfile = { level: number; xp: number; cash: number; energy: number; maxEnergy: number; happiness: number; strength: number; speed: number; defense: number; dexterity: number; inHospital: boolean; };
interface TrainResponse { stat: Stat; gained: number; happyBonus: boolean; xpGained: number; leveledUp: boolean; newLevel: number; profile: { energy: number; happiness: number; strength: number; speed: number; defense: number; dexterity: number; xp: number; level: number; }; }
type StatResult = { ok: true; data: TrainResponse } | { ok: false; msg: string };
const STATS: Array<{ key: Stat; label: string; color: string; energy: number; xp: number }> = [
  { key: "strength", label: "Strength", color: "#ff5d5d", energy: 4, xp: 12 },
  { key: "speed", label: "Speed", color: "#36d47f", energy: 4, xp: 12 },
  { key: "defense", label: "Defense", color: "#4f8cff", energy: 5, xp: 14 },
  { key: "dexterity", label: "Dexterity", color: "#f7bf35", energy: 3, xp: 10 },
];
function statValue(profile: PageProfile, stat: Stat) { return profile[stat]; }
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39

export default function GymPage() {
  const [profile, setProfile] = useState<PageProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [training, setTraining] = useState<Stat | null>(null);
  const [results, setResults] = useState<Partial<Record<Stat, StatResult>>>({});

  const fetchProfile = useCallback(async () => {
    setPageError(null);
    try { const res = await api.get<PageProfile>("/me"); setProfile(res.data); }
    catch (err: unknown) { setPageError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to load profile."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const train = async (stat: Stat) => {
    if (training !== null) return;
    setTraining(stat);
    try {
      const response = await api.post<TrainResponse>("/gym/train", { stat });
      const data = response.data;
      setProfile((prev) => prev ? { ...prev, energy: data.profile.energy, happiness: data.profile.happiness, strength: data.profile.strength, speed: data.profile.speed, defense: data.profile.defense, dexterity: data.profile.dexterity, xp: data.profile.xp, level: data.profile.level } : prev);
      setResults((prev) => ({ ...prev, [stat]: { ok: true, data } }));
    } catch (err: unknown) {
      setResults((prev) => ({ ...prev, [stat]: { ok: false, msg: (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Training failed." } }));
    } finally { setTraining(null); }
  };

<<<<<<< HEAD
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
            <p className="text-[10px] font-black text-[#f2f4ec] tracking-[3px] uppercase mb-1">
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
            <CircleX className="w-3.5 h-3.5 text-[#ef5350]" />
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
                <span className="w-10 text-right text-[13px] font-bold text-[#f2f4ec]">
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
                      <StatIcon icon={s.icon} className="w-3.5 h-3.5" />
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
                          {" - "}
                          +{result.data.xpGained} XP
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
            <CircleHelp className="w-3.5 h-3.5 text-text-dim" />
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





=======
  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><LoadingSpinner size={32} /></div>;
  if (pageError || !profile) return <div className="sc-panel-danger p-5 text-[13px] text-[#ff9d9d]">{pageError ?? "Profile unavailable."}</div>;

  return <div className="space-y-4"><div><p className="sc-page-title">Gym</p><p className="sc-subtitle mt-2">Train your stats · build your edge</p></div><div className="sc-panel p-5"><p className="text-[24px] font-black text-[#f4f5fb]">Combat Profile</p><div className="mt-4 grid gap-4 md:grid-cols-4">{STATS.map((stat) => <div key={stat.key} className="text-center"><p className="text-[34px] font-black" style={{ color: stat.color }}>{statValue(profile, stat.key)}</p><p className="mt-1 text-[11px] font-black uppercase tracking-[0.12em] text-[#6e7287]">{stat.label}</p></div>)}</div><div className="mt-5 flex flex-wrap gap-4 text-[12px] font-black"><span className="text-[#36d47f]">Energy {profile.energy}/{profile.maxEnergy}</span><span className="text-[#36d47f]">Cash ${Math.floor(profile.cash).toLocaleString()}</span></div></div><section className="space-y-3"><p className="text-[24px] font-black text-[#f4f5fb]">Training Stations</p><div className="grid gap-4 md:grid-cols-2">{STATS.map((stat) => { const value = statValue(profile, stat.key); const busy = training === stat.key; const result = results[stat.key]; const activeStyle = { borderColor: `${stat.color}66`, color: stat.color, backgroundColor: `${stat.color}14` }; return <div key={stat.key} className="sc-panel p-5"><div className="flex items-start justify-between gap-3"><div><p className="sc-label">{stat.label}</p><p className="mt-2 text-[40px] font-black" style={{ color: stat.color }}>{value}</p></div><div className="text-right"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6e7287]">Gain per train</p><p className="mt-2 text-[20px] font-black text-[#f4f5fb]">+1 {stat.label.slice(0, 3).toUpperCase()}</p></div></div><div className="mt-4"><div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.14em] text-[#6e7287]"><span>Progress</span><span>{value}/200</span></div><div className="sc-progress"><div className="h-full rounded-full" style={{ width: `${Math.min(100, (value / 200) * 100)}%`, backgroundColor: stat.color }} /></div></div><div className="mt-4 grid grid-cols-3 gap-3"><div className="sc-stat"><p className="sc-label">Energy</p><p className="mt-2 text-[14px] font-black text-[#4f8cff]">{stat.energy}</p></div><div className="sc-stat"><p className="sc-label">Cash</p><p className="mt-2 text-[14px] font-black text-[#36d47f]">Free</p></div><div className="sc-stat"><p className="sc-label">XP</p><p className="mt-2 text-[14px] font-black text-[#9f64ff]">+{stat.xp}</p></div></div><button onClick={() => train(stat.key)} disabled={busy || profile.inHospital} className={`sc-button mt-4 w-full ${busy || profile.inHospital ? "text-[#555]" : ""}`} style={busy || profile.inHospital ? undefined : activeStyle}>{busy ? `TRAINING ${stat.label.toUpperCase()}...` : `TRAIN ${stat.label.toUpperCase()}`}</button>{result ? <div className={`mt-3 rounded-xl border px-4 py-3 text-[12px] font-bold ${result.ok ? "border-[rgba(54,212,127,0.2)] bg-[rgba(12,31,22,0.9)] text-[#cfead8]" : "border-[rgba(255,93,93,0.18)] bg-[rgba(27,13,15,0.9)] text-[#ffaaaa]"}`}>{result.ok ? `+${result.data.gained} ${stat.label} · +${result.data.xpGained} XP${result.data.happyBonus ? " · happiness bonus" : ""}` : result.msg}</div> : null}</div>; })}</div></section></div>;
}
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
