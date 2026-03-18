"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { TOKEN_KEY } from "@/lib/config";
import { StatusBars, type ProfileStats } from "@/components/ui/StatusBars";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

// ---------------------------------------------------------------------------
// Types — shapes match /me and /events responses exactly
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Helpers — ported verbatim from HomeScreen.tsx
// ---------------------------------------------------------------------------

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
    case "attack_win":  return "#66bb6a";
    case "attack_loss": return "#ef5350";
    case "attacked":    return "#ef5350";
    case "hospital":    return "#ef5350";
    case "crime":       return "#fdd835";
    case "gym":         return "#ff9800";
    case "level_up":    return "#9945FF";
    case "shop":        return "#42a5f5";
    default:            return "#555";
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-[#141414] border border-[#1e1e1e] rounded-lg p-2.5 flex flex-col items-center gap-0.5 min-w-0">
      <span className="text-[9px] font-black uppercase tracking-[2px] text-text-dim text-center">
        {label}
      </span>
      <span className="text-sm font-black text-center" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HomePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);

    try {
      const [profileRes, eventsRes] = await Promise.all([
        api.get<Profile>("/me"),
        api.get<EventItem[]>("/events"),
      ]);
      setProfile(profileRes.data);
      setEvents(eventsRes.data);
    } catch (err: unknown) {
      // 401 is handled by the axios interceptor (redirects to /login)
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to load profile. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    router.push("/login");
  };

  // ------------------------------------------------------------------
  // Loading
  // ------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex flex-col min-h-dvh bg-background items-center justify-center">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Error (non-401 — 401 is already redirected by the interceptor)
  // ------------------------------------------------------------------
  if (error) {
    return (
      <div className="flex flex-col min-h-dvh bg-background items-center justify-center gap-4 px-6">
        <p className="text-danger text-sm text-center">{error}</p>
        <button
          onClick={() => fetchData()}
          className="px-5 py-2.5 bg-accent rounded-lg text-white font-semibold text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Success
  // ------------------------------------------------------------------
  const shieldActive = profile ? new Date(profile.shieldUntil) > new Date() : false;
  const displayName =
    profile?.name ||
    (profile?.wallet ? profile.wallet.slice(0, 8) + "…" : "Seeker");

  return (
    <div className="flex flex-col bg-background min-h-dvh">
      {/* Status bars strip — always visible at the top */}
      {profile && <StatusBars profile={profile} />}

      <div className="max-w-2xl w-full mx-auto px-3 py-3 flex flex-col gap-3">

        {/* Hero card */}
        <div className="relative h-36 rounded-lg overflow-hidden border border-[#1e1e1e] bg-[#0d0d0d] flex items-end">
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          <div className="relative z-10 flex w-full items-end justify-between px-3 py-2.5">
            <div>
              <p className="text-[18px] font-black text-[#eee] tracking-wide">
                {displayName}
              </p>
              <p className="text-[10px] font-bold tracking-[2px] text-[#eee] mt-0.5">
                LEVEL {profile?.level} | RP {profile?.rp}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Refresh */}
              <button
                onClick={() => fetchData(true)}
                disabled={refreshing}
                className="bg-[#141414] border border-[#1e1e1e] rounded p-2 text-text-dim hover:text-text-secondary transition-colors disabled:opacity-50"
                title="Refresh"
                aria-label="Refresh"
              >
                <svg
                  className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M23 4v6h-6" />
                  <path d="M1 20v-6h6" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
              </button>
              {/* Logout */}
              <button
                onClick={logout}
                className="bg-[#141414] border border-[#1e1e1e] rounded p-2 text-text-dim hover:text-text-secondary transition-colors"
                title="Log out"
                aria-label="Log out"
              >
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Shield banner */}
        {shieldActive && (
          <div className="flex items-center justify-center gap-1.5 bg-[#0a1a0a] border border-[#1a3a1a] rounded px-3 py-2">
            <svg className="w-3 h-3 text-[#66bb6a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span className="text-[#66bb6a] text-[10px] font-bold tracking-[2px]">
              SHIELD ACTIVE — until{" "}
              {new Date(profile!.shieldUntil).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        )}

        {/* Economy stats */}
        <div className="grid grid-cols-4 gap-1.5">
          <StatBox label="Cash"       value={`$${Math.floor(profile?.cash ?? 0).toLocaleString()}`} color="#66bb6a" />
          <StatBox label="Income/hr"  value={`$${profile?.incomePerHour ?? 0}`}                     color="#eeeeee" />
          <StatBox label="AP"         value={String(profile?.ap ?? 0)}                              color="#ef5350" />
          <StatBox label="DP"         value={String(profile?.dp ?? 0)}                              color="#42a5f5" />
        </div>

        {/* Combat stats */}
        <p className="text-[10px] font-bold tracking-[3px] uppercase text-text-dim">
          Combat Stats
        </p>
        <div className="grid grid-cols-4 gap-1.5">
          <StatBox label="STR" value={String(profile?.strength   ?? 0)} color="#ff9800" />
          <StatBox label="SPD" value={String(profile?.speed      ?? 0)} color="#9945FF" />
          <StatBox label="DEF" value={String(profile?.defense    ?? 0)} color="#26c6da" />
          <StatBox label="DEX" value={String(profile?.dexterity  ?? 0)} color="#fdd835" />
        </div>

        {/* Syndicate badge */}
        {profile?.syndicate && (
          <div className="flex items-center gap-2 bg-[#141414] border border-[#1e1e1e] rounded-lg px-3 py-2">
            <span className="text-[9px] font-black uppercase tracking-[2px] text-text-dim">
              Syndicate
            </span>
            <span className="text-text-primary text-xs font-bold flex-1">
              {profile.syndicate.name}
            </span>
            <span className="text-[9px] text-text-dim uppercase tracking-wide">
              {profile.syndicate.role}
            </span>
          </div>
        )}

        {/* Recent activity */}
        <p className="text-[10px] font-bold tracking-[3px] uppercase text-text-dim">
          Recent Activity
        </p>
        <div className="bg-[#141414] border border-[#1e1e1e] rounded-lg px-3 pb-2">
          {events.length === 0 ? (
            <p className="text-[#333] text-xs font-semibold text-center py-4">
              No recent activity
            </p>
          ) : (
            events.map((evt, i) => (
              <div
                key={evt.id}
                className={`flex items-center gap-2 py-1.5 ${
                  i < events.length - 1 ? "border-b border-[#1e1e1e]" : ""
                }`}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: eventColor(evt.type) }}
                />
                <p className="flex-1 text-[#ccc] text-[11px] font-semibold leading-snug">
                  {evt.message}
                </p>
                <span className="text-[#444] text-[9px] font-bold ml-2 whitespace-nowrap">
                  {timeAgo(evt.ts)}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Bottom padding for mobile nav */}
        <div className="h-16 md:hidden" />
      </div>
    </div>
  );
}
