"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { MissionCard } from "@/components/game/MissionCard";
import { MeResponse, Mission } from "@/lib/gameApi";
import { StatusBars } from "@/components/ui/StatusBars";

export default function MissionsPage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [daily, setDaily] = useState<Mission[]>([]);
  const [weekly, setWeekly] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchMissions = useCallback(async () => {
    try {
      const [missionsRes, meRes] = await Promise.all([
        api.get<{ daily: Mission[]; weekly: Mission[] }>("/missions"),
        api.get<MeResponse>("/me"),
      ]);
      setDaily(missionsRes.data.daily);
      setWeekly(missionsRes.data.weekly);
      setMe(meRes.data);
      setError(null);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to load missions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  const claim = async (mission: Mission) => {
    setBusyId(mission.id);
    try {
      await api.post(`/missions/${mission.id}/claim`);
      await fetchMissions();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Claim failed.");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <div className="flex min-h-dvh items-center justify-center"><LoadingSpinner size={32} /></div>;

  return (
    <div className="flex flex-col gap-4">
      {me ? <StatusBars profile={me} /> : null}
      <div>
        <p className="text-[10px] font-black text-[#eee] tracking-[3px] uppercase">Missions</p>
        <p className="text-[11px] text-[#555]">Daily and weekly contracts</p>
      </div>
      {error && <p className="text-[10px] font-bold text-[#ef5350]">{error}</p>}
      <div>
        <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase mb-2">Daily</p>
        <div className="grid md:grid-cols-2 gap-2">
          {daily.map((mission) => <MissionCard key={mission.id} mission={mission} onClaim={claim} busy={busyId === mission.id} />)}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase mb-2">Weekly</p>
        <div className="grid md:grid-cols-2 gap-2">
          {weekly.map((mission) => <MissionCard key={mission.id} mission={mission} onClaim={claim} busy={busyId === mission.id} />)}
        </div>
      </div>
      <div className="h-16 md:hidden" />
    </div>
  );
}
