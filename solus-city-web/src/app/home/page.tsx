"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { api } from "@/lib/api/client";
import { TOKEN_KEY } from "@/lib/config";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { StatusBars } from "@/components/ui/StatusBars";
import { StatCard } from "@/components/game/StatCard";
import { HeatMeter } from "@/components/game/HeatMeter";
import { WantedBadge } from "@/components/game/WantedBadge";
import { VaultCard } from "@/components/game/VaultCard";
import { HospitalOptionsCard } from "@/components/game/HospitalOptionsCard";
import { MissionCard } from "@/components/game/MissionCard";
import { MeResponse } from "@/lib/gameApi";

interface EventItem {
  id: string;
  type: string;
  message: string;
  ts: string;
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatTimeLeft(value: string | null) {
  if (!value) return "No active rotation";
  const diff = new Date(value).getTime() - Date.now();
  if (diff <= 0) return "Refreshing now";
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  return hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m`;
}

export default function HomePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<MeResponse | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [profileRes, eventsRes] = await Promise.all([
        api.get<MeResponse>("/me"),
        api.get<EventItem[]>("/events"),
      ]);
      setProfile(profileRes.data);
      setEvents(eventsRes.data);
      setError(null);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to load home.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    router.push("/login");
  };

  const displayName = useMemo(() => {
    if (!profile) return "Seeker";
    return profile.name || `${profile.wallet.slice(0, 8)}...`;
  }, [profile]);

  if (loading) {
    return <div className="flex min-h-dvh items-center justify-center"><LoadingSpinner size={32} /></div>;
  }
  if (error || !profile) {
    return (
      <div className="flex min-h-dvh items-center justify-center flex-col gap-3">
        <p className="text-[#ef5350] text-sm">{error ?? "Profile not found"}</p>
        <button onClick={() => { setLoading(true); fetchData(); }} className="px-4 py-2 rounded-md bg-[#1a0a2e] text-[#9945FF] text-sm font-bold">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <StatusBars profile={profile} />

      <div className="relative h-36 rounded-md overflow-hidden border border-white/10 bg-black/20 backdrop-blur-sm">
        <Image src="/assets/images/home_skyline.png" alt="Solus city skyline" fill className="object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0a0a0a]" />
        <div className="absolute inset-x-3 bottom-2 flex items-end justify-between">
          <div>
            <p className="text-xl font-black tracking-wider text-[#eee]">{displayName}</p>
            <p className="text-[10px] tracking-widest text-[#555]">LEVEL {profile.level} • {profile.rp} RP</p>
          </div>
          <button onClick={logout} className="h-7 w-7 rounded-sm bg-black/20 backdrop-blur-sm border border-white/10 text-[#888] flex items-center justify-center" aria-label="Log out">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-2">
        <HeatMeter heat={profile.heat} />
        <WantedBadge tier={profile.wantedTier} />
        <VaultCard walletCash={profile.cash} vaultCash={profile.vaultCash} />
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <StatCard label="Cash" value={`$${Math.floor(profile.cash).toLocaleString()}`} color="#66bb6a" />
        <StatCard label="Income" value={`$${profile.incomePerHour}`} color="#42a5f5" />
        <StatCard label="Market" value={formatTimeLeft(profile.blackMarketEndsAt)} color="#9945FF" />
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <StatCard label="AP" value={String(profile.ap)} color="#ef5350" />
        <StatCard label="DP" value={String(profile.dp)} color="#42a5f5" />
      </div>

      <HospitalOptionsCard active={profile.inHospital} onUpdated={fetchData} />

      <div>
        <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase mb-2">Mission Preview</p>
        <div className="grid md:grid-cols-2 gap-2">
          {profile.missionsPreview.slice(0, 4).map((mission) => (
            <MissionCard key={mission.id} mission={mission} />
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase mb-2">Recent Activity</p>
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md px-3 py-2.5 space-y-2">
          {events.length === 0 ? (
            <p className="text-[#444] text-[11px] text-center">No recent activity.</p>
          ) : (
            events.map((evt, i) => (
              <div key={evt.id} className={`flex items-start gap-2 ${i < events.length - 1 ? "pb-2 border-b border-[#1e1e1e]" : ""}`}>
                <div className="w-2 h-2 rounded-full mt-1 bg-[#9945FF]" />
                <p className="text-[11px] flex-1 leading-snug text-[#ddd]">{evt.message}</p>
                <span className="text-[9px] whitespace-nowrap text-[#555]">{timeAgo(evt.ts)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="h-16 md:hidden" />
    </div>
  );
}
