"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api/client";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { MissionCard } from "@/components/game/MissionCard";
import { Mission } from "@/lib/gameApi";

export default function MissionsPage() {
  const [daily, setDaily] = useState<Mission[]>([]);
  const [weekly, setWeekly] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"daily" | "weekly">("daily");

  const fetchMissions = useCallback(async () => {
    try { const res = await api.get<{ daily: Mission[]; weekly: Mission[] }>("/missions"); setDaily(res.data.daily); setWeekly(res.data.weekly); setError(null); }
    catch (err: unknown) { setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to load missions."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchMissions(); }, [fetchMissions]);

  const claim = async (mission: Mission) => {
    setBusyId(mission.id);
    try { await api.post(`/missions/${mission.id}/claim`); await fetchMissions(); }
    catch (err: unknown) { setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Claim failed."); }
    finally { setBusyId(null); }
  };

  const activeList = tab === "daily" ? daily : weekly;
  const dailyDone = useMemo(() => daily.filter((mission) => mission.claimed || mission.completed).length, [daily]);
  const weeklyDone = useMemo(() => weekly.filter((mission) => mission.claimed || mission.completed).length, [weekly]);

<<<<<<< HEAD
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-[10px] font-black text-[#f2f4ec] tracking-[3px] uppercase">Missions</p>
        <p className="text-[11px] text-[#aab0a3]">Daily and weekly contracts</p>
      </div>
      {error && <p className="text-[10px] font-bold text-[#ef5350]">{error}</p>}
      <div>
        <p className="text-[10px] font-black tracking-[3px] text-[#aab0a3] uppercase mb-2">Daily</p>
        <div className="grid md:grid-cols-2 gap-2">
          {daily.map((mission) => <MissionCard key={mission.id} mission={mission} onClaim={claim} busy={busyId === mission.id} />)}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-black tracking-[3px] text-[#aab0a3] uppercase mb-2">Weekly</p>
        <div className="grid md:grid-cols-2 gap-2">
          {weekly.map((mission) => <MissionCard key={mission.id} mission={mission} onClaim={claim} busy={busyId === mission.id} />)}
        </div>
      </div>
      <div className="h-16 md:hidden" />
    </div>
  );
}

=======
  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><LoadingSpinner size={32} /></div>;

  return <div className="space-y-4"><div><p className="sc-page-title">Mission Board</p><p className="sc-subtitle mt-2">Complete objectives · earn rewards</p></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div className="sc-stat"><p className="sc-label">Daily Active</p><p className="mt-3 text-[28px] font-black text-[#4f8cff]">{daily.length}</p></div><div className="sc-stat"><p className="sc-label">Daily Done</p><p className="mt-3 text-[28px] font-black text-[#36d47f]">{dailyDone}</p></div><div className="sc-stat"><p className="sc-label">Weekly Active</p><p className="mt-3 text-[28px] font-black text-[#9f64ff]">{weekly.length}</p></div><div className="sc-stat"><p className="sc-label">Weekly Done</p><p className="mt-3 text-[28px] font-black text-[#36d47f]">{weeklyDone}</p></div></div><div className="flex gap-2 border-b border-white/8 pb-3">{(["daily", "weekly"] as const).map((value) => <button key={value} type="button" onClick={() => setTab(value)} className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] ${tab === value ? "bg-[rgba(153,69,255,0.14)] text-[#9f64ff]" : "text-[#5f6377]"}`}>{value}</button>)}</div>{error ? <div className="sc-panel-danger p-4 text-[12px] text-[#ffb0b0]">{error}</div> : null}<div className="space-y-3">{activeList.map((mission) => <MissionCard key={mission.id} mission={mission} onClaim={claim} busy={busyId === mission.id} />)}</div></div>;
}
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
