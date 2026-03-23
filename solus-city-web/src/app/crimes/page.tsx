"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { MeResponse } from "@/lib/gameApi";

interface Crime { id: string; name: string; nerveCost: number; cashMin: number; cashMax: number; xpReward: number; successRate: number; levelReq: number; locked?: boolean; }
interface CommitResponse { success: boolean; crimeName: string; cashGained: number; xpGained: number; leveledUp: boolean; newLevel: number; profile: { nerve: number; cash: number; xp: number; level: number; }; heatChange?: number; newHeat?: number; wantedTier?: string; }
type CrimeResult = { ok: true; data: CommitResponse } | { ok: false; msg: string };
const TAGS = ["Stealth", "Theft", "Hustle", "Financial", "Extortion", "Heist"];
const BORDER = ["#9f64ff", "#4f8cff", "#f7bf35", "#36d47f", "#ff9d32", "#ff5d5d"];
function formatCashRange(min: number, max: number) { return `$${Math.floor(min / 1000)}K-$${Math.floor(max / 1000)}K`; }
function ratingLabel(rate: number) { if (rate >= 0.85) return "SAFE"; if (rate >= 0.7) return "FAVORABLE"; if (rate >= 0.55) return "EVEN"; return "RISKY"; }
function SuccessBars({ rate }: { rate: number }) { const filled = Math.max(1, Math.min(5, Math.round(rate * 5))); return <div className="flex items-center gap-1">{Array.from({ length: 5 }).map((_, index) => <span key={index} className={`h-3 w-[5px] rounded-full ${index < filled ? "bg-[#36d47f]" : "bg-white/8"}`} />)}<span className="ml-1 text-[10px] font-black text-[#36d47f]">{Math.round(rate * 100)}%</span></div>; }

export default function CrimesPage() {
  const [profile, setProfile] = useState<MeResponse | null>(null);
  const [crimes, setCrimes] = useState<Crime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [committing, setCommitting] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, CrimeResult>>({});

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const [profileRes, crimesRes] = await Promise.all([api.get<MeResponse>("/me"), api.get<Crime[]>("/crimes")]);
      setProfile(profileRes.data);
      setCrimes(crimesRes.data);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to load crimes.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const commit = async (crime: Crime) => {
    if (committing !== null) return;
    setCommitting(crime.id);
    setResults((prev) => { const next = { ...prev }; delete next[crime.id]; return next; });
    try {
      const response = await api.post<CommitResponse>("/crimes/commit", { crimeId: crime.id });
      const data = response.data;
      setProfile((prev) => prev ? { ...prev, nerve: data.profile.nerve, cash: data.profile.cash, xp: data.profile.xp, level: data.profile.level, heat: data.newHeat ?? prev.heat, wantedTier: data.wantedTier ?? prev.wantedTier } : prev);
      setResults((prev) => ({ ...prev, [crime.id]: { ok: true, data } }));
    } catch (err: unknown) {
      setResults((prev) => ({ ...prev, [crime.id]: { ok: false, msg: (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Crime failed. Please try again." } }));
    } finally { setCommitting(null); }
  };

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><LoadingSpinner size={32} /></div>;
  if (error || !profile) return <div className="sc-panel-danger p-5 text-[13px] text-[#ff9d9d]">{error ?? "Profile unavailable."}</div>;

  return <div className="space-y-4"><div><p className="sc-page-title">Crimes</p><p className="sc-subtitle mt-2">Use nerve · earn cash · build rep</p></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div className="sc-stat"><p className="sc-label">Nerve</p><p className="mt-3 text-[28px] font-black text-[#4f8cff]">{profile.nerve}/{profile.maxNerve}</p></div><div className="sc-stat"><p className="sc-label">Cash</p><p className="mt-3 text-[28px] font-black text-[#36d47f]">${Math.floor(profile.cash).toLocaleString()}</p></div><div className="sc-stat"><p className="sc-label">Level</p><p className="mt-3 text-[28px] font-black text-[#9f64ff]">{profile.level}</p></div><div className="sc-stat"><p className="sc-label">Heat</p><p className="mt-3 text-[28px] font-black text-[#ff5d5d]">{profile.heat}</p></div></div><section className="space-y-3"><div><p className="sc-kicker">Available Crimes</p><p className="mt-2 text-[26px] font-black text-[#f4f5fb]">Unlocked Operations</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{crimes.map((crime, index) => { const locked = typeof crime.locked === "boolean" ? crime.locked : profile.level < crime.levelReq; const notEnoughNerve = !locked && profile.nerve < crime.nerveCost; const busy = committing === crime.id; const tone = BORDER[index % BORDER.length]; const result = results[crime.id]; return <div key={crime.id} className="rounded-[18px] border bg-[#0f1016]/94 p-4" style={{ borderColor: locked ? "rgba(255,255,255,0.08)" : tone }}><div className="flex items-center justify-between gap-3"><span className="sc-chip" style={{ color: tone, borderColor: `${tone}44`, backgroundColor: `${tone}14` }}>{TAGS[index % TAGS.length]}</span><SuccessBars rate={crime.successRate} /></div><p className="mt-4 text-[28px] font-black text-[#f4f5fb]">{crime.name}</p><div className="mt-2 grid grid-cols-2 gap-3"><div className="sc-stat"><p className="sc-label">Nerve</p><p className="mt-2 text-[16px] font-black text-[#4f8cff]">{crime.nerveCost}</p></div><div className="sc-stat"><p className="sc-label">Cash Range</p><p className="mt-2 text-[16px] font-black text-[#36d47f]">{formatCashRange(crime.cashMin, crime.cashMax)}</p></div></div><div className="mt-3 flex items-center justify-between"><p className="text-[11px] font-black text-[#7c8095]">{crime.xpReward} XP</p><span className="sc-chip" style={{ letterSpacing: "0.08em" }}>{ratingLabel(crime.successRate)}</span></div><button onClick={() => commit(crime)} disabled={busy || locked || notEnoughNerve} className={`sc-button mt-4 w-full ${locked || notEnoughNerve ? "text-[#555]" : "sc-button-danger"}`}>{busy ? "COMMITTING..." : locked ? "LOCKED" : notEnoughNerve ? "NOT ENOUGH NERVE" : "COMMIT CRIME"}</button>{result ? <div className={`mt-3 rounded-xl border px-3 py-3 text-[12px] font-bold ${result.ok ? "border-[rgba(54,212,127,0.2)] bg-[rgba(12,31,22,0.9)] text-[#cfead8]" : "border-[rgba(255,93,93,0.18)] bg-[rgba(27,13,15,0.9)] text-[#ffaaaa]"}`}>{result.ok ? `${result.data.success ? "Success" : "Failed"} · +$${Math.floor(result.data.cashGained).toLocaleString()} · +${result.data.xpGained} XP` : result.msg}</div> : null}</div>; })}</div></section></div>;
}