"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type Stat = "strength" | "speed" | "defense" | "dexterity";
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

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><LoadingSpinner size={32} /></div>;
  if (pageError || !profile) return <div className="sc-panel-danger p-5 text-[13px] text-[#ff9d9d]">{pageError ?? "Profile unavailable."}</div>;

  return <div className="space-y-4"><div><p className="sc-page-title">Gym</p><p className="sc-subtitle mt-2">Train your stats · build your edge</p></div><div className="sc-panel p-5"><p className="text-[24px] font-black text-[#f4f5fb]">Combat Profile</p><div className="mt-4 grid gap-4 md:grid-cols-4">{STATS.map((stat) => <div key={stat.key} className="text-center"><p className="text-[34px] font-black" style={{ color: stat.color }}>{statValue(profile, stat.key)}</p><p className="mt-1 text-[11px] font-black uppercase tracking-[0.12em] text-[#6e7287]">{stat.label}</p></div>)}</div><div className="mt-5 flex flex-wrap gap-4 text-[12px] font-black"><span className="text-[#36d47f]">Energy {profile.energy}/{profile.maxEnergy}</span><span className="text-[#36d47f]">Cash ${Math.floor(profile.cash).toLocaleString()}</span></div></div><section className="space-y-3"><p className="text-[24px] font-black text-[#f4f5fb]">Training Stations</p><div className="grid gap-4 md:grid-cols-2">{STATS.map((stat) => { const value = statValue(profile, stat.key); const busy = training === stat.key; const result = results[stat.key]; const activeStyle = { borderColor: `${stat.color}66`, color: stat.color, backgroundColor: `${stat.color}14` }; return <div key={stat.key} className="sc-panel p-5"><div className="flex items-start justify-between gap-3"><div><p className="sc-label">{stat.label}</p><p className="mt-2 text-[40px] font-black" style={{ color: stat.color }}>{value}</p></div><div className="text-right"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6e7287]">Gain per train</p><p className="mt-2 text-[20px] font-black text-[#f4f5fb]">+1 {stat.label.slice(0, 3).toUpperCase()}</p></div></div><div className="mt-4"><div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.14em] text-[#6e7287]"><span>Progress</span><span>{value}/200</span></div><div className="sc-progress"><div className="h-full rounded-full" style={{ width: `${Math.min(100, (value / 200) * 100)}%`, backgroundColor: stat.color }} /></div></div><div className="mt-4 grid grid-cols-3 gap-3"><div className="sc-stat"><p className="sc-label">Energy</p><p className="mt-2 text-[14px] font-black text-[#4f8cff]">{stat.energy}</p></div><div className="sc-stat"><p className="sc-label">Cash</p><p className="mt-2 text-[14px] font-black text-[#36d47f]">Free</p></div><div className="sc-stat"><p className="sc-label">XP</p><p className="mt-2 text-[14px] font-black text-[#9f64ff]">+{stat.xp}</p></div></div><button onClick={() => train(stat.key)} disabled={busy || profile.inHospital} className={`sc-button mt-4 w-full ${busy || profile.inHospital ? "text-[#555]" : ""}`} style={busy || profile.inHospital ? undefined : activeStyle}>{busy ? `TRAINING ${stat.label.toUpperCase()}...` : `TRAIN ${stat.label.toUpperCase()}`}</button>{result ? <div className={`mt-3 rounded-xl border px-4 py-3 text-[12px] font-bold ${result.ok ? "border-[rgba(54,212,127,0.2)] bg-[rgba(12,31,22,0.9)] text-[#cfead8]" : "border-[rgba(255,93,93,0.18)] bg-[rgba(27,13,15,0.9)] text-[#ffaaaa]"}`}>{result.ok ? `+${result.data.gained} ${stat.label} · +${result.data.xpGained} XP${result.data.happyBonus ? " · happiness bonus" : ""}` : result.msg}</div> : null}</div>; })}</div></section></div>;
}