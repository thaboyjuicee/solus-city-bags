"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { api } from "@/lib/api/client";
import { TOKEN_KEY } from "@/lib/config";
import { StatusBars, type ProfileStats } from "@/components/ui/StatusBars";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { StatCard } from "@/components/game/StatCard";

interface Profile extends ProfileStats {
  wallet: string;
  name: string | null;
  rp: number;
  strength: number;
  speed: number;
  defense: number;
  dexterity: number;
  incomePerHour: number;
  shieldUntil: string;
  hospitalUntil: string | null;
  syndicate: {
    id: string;
    name: string;
    role: string;
    buffType: string;
    buffValue: number;
  } | null;
}

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

function eventColor(type: string): string {
  switch (type) {
    case "attack_win":
    case "crime":
      return "#66bb6a";
    case "attack_loss":
    case "attacked":
    case "hospital":
      return "#ef5350";
    case "gym":
      return "#ff9800";
    case "level_up":
      return "#9945FF";
    case "shop":
      return "#42a5f5";
    default:
      return "#555";
  }
}

export default function HomePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);

    try {
      const [profileRes, eventsRes] = await Promise.all([
        api.get<Profile>("/me"),
        api.get<EventItem[]>("/events"),
      ]);
      setProfile(profileRes.data);
      setEvents(eventsRes.data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Failed to load profile. Please try again.";
      setError(msg);
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh gap-4 px-6">
        <p className="text-[#ef5350] text-sm text-center">{error}</p>
        <button
          onClick={() => fetchData()}
          className="px-5 py-2.5 bg-[#1a0a2e] border border-[rgba(153,69,255,0.3)] text-[#9945FF] rounded-md text-[11px] font-bold tracking-[2px]"
        >
          Retry
        </button>
      </div>
    );
  }

  const shieldActive = profile ? new Date(profile.shieldUntil) > new Date() : false;
  const displayName =
    profile?.name || (profile?.wallet ? profile.wallet.slice(0, 8) + "..." : "Seeker");

  return (
    <div className="flex flex-col gap-3">
      {profile && <StatusBars profile={profile} />}

      <div className="relative h-36 rounded-md overflow-hidden border border-[#1e1e1e]">
        <Image
          src="/assets/images/home_skyline.png"
          alt="Solus city skyline"
          fill
          className="object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0a0a0a]" />
          <button
            onClick={logout}
            className="absolute top-2 right-2 h-7 w-7 rounded-sm bg-[#141414] border border-[#1e1e1e] text-[#888] flex items-center justify-center"
            aria-label="Log out"
          >
            <LogOut size={16} />
          </button>
        <div className="absolute inset-x-3 bottom-2 flex items-end justify-between">
          <div>
            <p className="text-xl font-black tracking-wider text-[#eee]">{displayName}</p>
            <p className="text-[10px] tracking-widest text-[#555]">
              LEVEL {profile?.level} • {profile?.rp} RP
            </p>
          </div>
        </div>
      </div>

      {shieldActive && (
        <div className="bg-[#0a1a0a] border border-[#1a3a1a] rounded-md px-3 py-2 flex items-center gap-2">
          <svg
            className="w-3 h-3 text-[#66bb6a]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[#66bb6a] text-[10px] font-bold tracking-[2px]">
            NEWBIE SHIELD ACTIVE • until {new Date(profile!.shieldUntil).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5">
        <StatCard label="Cash" value={`$${Math.floor(profile?.cash ?? 0).toLocaleString()}`} color="#66bb6a" />
        <StatCard label="Income" value={`$${profile?.incomePerHour ?? 0}`} color="#66bb6a" />
        <StatCard label="AP" value={String(profile?.ap ?? 0)} color="#ef5350" />
        <StatCard label="DP" value={String(profile?.dp ?? 0)} color="#42a5f5" />
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        <StatCard label="STR" value={String(profile?.strength ?? 0)} color="#ff9800" />
        <StatCard label="SPD" value={String(profile?.speed ?? 0)} color="#9945FF" />
        <StatCard label="DEF" value={String(profile?.defense ?? 0)} color="#26c6da" />
        <StatCard label="DEX" value={String(profile?.dexterity ?? 0)} color="#fdd835" />
      </div>

      <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase">Recent Activity</p>
      <div className="bg-[#141414] border border-[#1e1e1e] rounded-md px-3 py-2.5 space-y-2">
        {events.length === 0 ? (
          <p className="text-[#444] text-[11px] text-center">No recent activity.</p>
        ) : (
          events.map((evt, i) => (
            <div
              key={evt.id}
              className={`flex items-start gap-2 ${i < events.length - 1 ? "pb-2 border-b border-[#1e1e1e]" : ""}`}
            >
              <div
                className="w-2 h-2 rounded-full mt-1"
                style={{ backgroundColor: eventColor(evt.type) }}
              />
              <p className="text-[11px] text-[#ccc] flex-1 leading-snug">{evt.message}</p>
              <span className="text-[9px] text-[#444] whitespace-nowrap">{timeAgo(evt.ts)}</span>
            </div>
          ))
        )}
      </div>

      <div className="h-16 md:hidden" />
    </div>
  );
}
