"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Swords } from "lucide-react";
import { api } from "@/lib/api/client";
import { BATTLE_RESULT_KEY, BattleResult, formatHospitalMessage } from "@/lib/battle";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { MeResponse, TargetPreview } from "@/lib/gameApi";

function bandTone(value: string) { const mapping: Record<string, string> = { safe: "#36d47f", favorable: "#4f8cff", even: "#f7bf35", risky: "#ff9d32", dangerous: "#ff5d5d", low: "#36d47f", medium: "#4f8cff", high: "#ff9d32", jackpot: "#f7bf35", watched: "#f7bf35", wanted: "#ff9d32", most_wanted: "#ff5d5d" }; return mapping[value] ?? "#9f64ff"; }
function BandBox({ label, value }: { label: string; value: string }) { const tone = bandTone(value); return <div className="sc-stat"><p className="sc-label">{label}</p><p className="mt-3 text-[13px] font-black uppercase" style={{ color: tone }}>{value.replaceAll("_", " ")}</p></div>; }

export default function TargetsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<MeResponse | null>(null);
  const [targets, setTargets] = useState<TargetPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [attackState, setAttackState] = useState<Record<string, { attacking: boolean; error: string | null }>>({});

  const fetchData = useCallback(async () => {
    try { const [profileRes, targetsRes] = await Promise.all([api.get<MeResponse>("/me"), api.get<TargetPreview[]>("/targets")]); setProfile(profileRes.data); setTargets(targetsRes.data); setPageError(null); }
    catch (err: unknown) { setPageError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to load targets."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const attack = async (target: TargetPreview) => {
    if (!profile) return;
    if (profile.inHospital) { setAttackState((prev) => ({ ...prev, [target.id]: { attacking: false, error: formatHospitalMessage(profile.hospitalUntil ?? undefined) } })); return; }
    setAttackState((prev) => ({ ...prev, [target.id]: { attacking: true, error: null } }));
    try { const res = await api.post<BattleResult>("/battle/attack", { targetId: target.id, targetType: target.type }); sessionStorage.setItem(BATTLE_RESULT_KEY, JSON.stringify({ ...res.data, opponent: { ...res.data.opponent, name: target.displayName } })); router.push("/battle-result"); }
    catch (err: unknown) { const data = (err as { response?: { data?: { error?: string; code?: string; recoverAt?: string } } })?.response?.data; setAttackState((prev) => ({ ...prev, [target.id]: { attacking: false, error: data?.code === "IN_HOSPITAL" ? formatHospitalMessage(data.recoverAt) : data?.error ?? "Attack failed." } })); }
  };

  const npcTargets = useMemo(() => targets.filter((entry) => entry.type === "npc"), [targets]);
  const playerTargets = useMemo(() => targets.filter((entry) => entry.type === "player"), [targets]);

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><LoadingSpinner size={32} /></div>;
  if (pageError || !profile) return <div className="sc-panel-danger p-5 text-[13px] text-[#ff9d9d]">{pageError ?? "Profile missing"}</div>;

  return <div className="space-y-5"><div><p className="sc-page-title">Battle Targets</p><p className="sc-subtitle mt-2">Scan · scout · strike</p></div><div className="flex flex-wrap gap-3"><span className="sc-chip sc-chip-purple">AP: {profile.ap}</span><span className="sc-chip">DP: {profile.dp}</span></div>{[{ title: "Street Targets", subtitle: "NPC enemies · lower risk", items: npcTargets }, { title: "Player Targets", subtitle: "PVP combat · higher risk · higher reward", items: playerTargets }].map((group) => <section key={group.title} className="space-y-3"><div><p className="text-[24px] font-black text-[#f4f5fb]">{group.title}</p><p className="sc-subtitle mt-1">{group.subtitle}</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{group.items.map((target) => { const state = attackState[target.id]; return <div key={`${target.type}:${target.id}`} className="sc-panel p-4"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap gap-2"><span className={`sc-chip ${target.type === "npc" ? "" : "sc-chip-purple"}`}>{target.type}</span>{target.syndicateBadge ? <span className="sc-chip sc-chip-orange">{target.syndicateBadge}</span> : null}</div><p className="mt-4 text-[28px] font-black text-[#f4f5fb]">{target.displayName}</p><p className="mt-1 text-[11px] text-[#6d7186]">LV {target.level} · {target.rp.toLocaleString()} RP</p></div>{target.shieldActive ? <span className="sc-chip sc-chip-purple">Shield</span> : null}</div><p className="mt-3 text-[12px] text-[#7b8094]">{target.flavor ?? "Street intel pending."}</p><div className="mt-4 grid grid-cols-3 gap-3"><BandBox label="Win" value={target.winChanceBand} /><BandBox label="Loot" value={target.lootBand} /><BandBox label="Heat" value={target.heatBand} /></div>{target.recentlyFarmedPenalty ? <div className="mt-4 rounded-xl border border-[rgba(255,157,50,0.24)] bg-[rgba(255,157,50,0.08)] px-4 py-3 text-[12px] text-[#ffbf72]">Repeat-target penalty active.</div> : null}{target.inHospital ? <div className="mt-4 rounded-xl border border-[rgba(255,93,93,0.18)] bg-[rgba(27,13,15,0.9)] px-4 py-3 text-[12px] text-[#ff9d9d]">Target hospitalized.</div> : null}{target.mismatchPenaltyApplied ? <div className="mt-4 rounded-xl border border-[rgba(255,93,93,0.18)] bg-[rgba(27,13,15,0.9)] px-4 py-3 text-[12px] text-[#ff9d9d]">Rewards will be dampened against this target.</div> : null}<button onClick={() => attack(target)} disabled={!!state?.attacking || profile.inHospital || target.inHospital || target.shieldActive} className={`sc-button mt-4 w-full ${target.shieldActive || target.inHospital ? "text-[#555]" : "sc-button-orange"}`}>{state?.attacking ? "ATTACKING..." : <><Swords size={14} /> ATTACK</>}</button>{state?.error ? <p className="mt-3 text-[11px] font-bold text-[#ff8d8d]">{state.error}</p> : null}</div>; })}</div></section>)}</div>;
}
