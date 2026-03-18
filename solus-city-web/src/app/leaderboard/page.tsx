"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { StatusBars, type ProfileStats } from "@/components/ui/StatusBars";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LeaderboardEntry {
  rank: number;
  name: string;
  wallet: string;
  rp: number;
  level: number;
  ap: number;
  dp: number;
  isMe: boolean;
}

// ---------------------------------------------------------------------------
// Helpers — ported from LeaderboardScreen.tsx
// ---------------------------------------------------------------------------

function getRankColor(rank: number): string {
  if (rank === 1) return "#fdd835";
  if (rank === 2) return "#bbbbbb";
  if (rank === 3) return "#cd7f32";
  return "#555555";
}

function RankCell({ rank }: { rank: number }) {
  const color = getRankColor(rank);
  if (rank <= 3) {
    // Trophy icon (SVG inline, matches lucide Trophy shape)
    return (
      <svg
        width={14}
        height={14}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
      </svg>
    );
  }
  return <span className="text-[12px]" style={{ color }}>{rank}</span>;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LeaderboardPage() {
  const [profile, setProfile] = useState<ProfileStats | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const [profileRes, lbRes] = await Promise.all([
        api.get<ProfileStats>("/me"),
        api.get<LeaderboardEntry[]>("/leaderboard"),
      ]);
      setProfile(profileRes.data);
      setEntries(lbRes.data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to load leaderboard.";
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ------------------------------------------------------------------
  // Loading
  // ------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex min-h-dvh bg-background items-center justify-center">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Error
  // ------------------------------------------------------------------
  if (error) {
    return (
      <div className="flex flex-col min-h-dvh bg-background items-center justify-center gap-4 px-6">
        <p className="text-danger text-sm text-center">{error}</p>
        <button
          onClick={() => { setLoading(true); fetchData(); }}
          className="px-5 py-2.5 bg-accent rounded-lg text-white font-semibold text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  // Separate top-100 rows from the self-row appended outside top 100
  const top100 = entries.filter((e) => e.rank <= 100);
  const selfOutside = entries.find((e) => e.isMe && e.rank > 100) ?? null;

  return (
    <div className="flex flex-col bg-background min-h-dvh">
      {profile && <StatusBars profile={profile} />}

      <div className="flex flex-col gap-3">

        {/* Hero / header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-[#eee] tracking-[3px] uppercase">
              Leaderboard
            </p>
            <p className="text-[11px] font-semibold text-text-dim mt-0.5">
              Top 100 players ranked by RP
            </p>
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="bg-[#141414] border border-[#1e1e1e] rounded p-2 text-text-dim hover:text-text-secondary transition-colors disabled:opacity-50"
            aria-label="Refresh leaderboard"
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
        </div>

        {/* Table */}
        <div className="bg-[#141414] border border-[#1e1e1e] rounded-lg overflow-hidden">

          {/* Column headers */}
          <div className="flex items-center px-3 py-2 border-b border-[#1e1e1e] bg-[#111]">
            <span className="w-8 text-[9px] font-black tracking-[2px] uppercase text-text-dim">#</span>
            <span className="flex-1 text-[9px] font-black tracking-[2px] uppercase text-text-dim">Player</span>
            <span className="w-8 text-center text-[9px] font-black tracking-[2px] uppercase text-text-dim">LV</span>
            <span className="w-14 text-right text-[9px] font-black tracking-[2px] uppercase text-text-dim">RP</span>
          </div>

          {/* Rows */}
          {top100.length === 0 ? (
            <p className="text-text-dim text-sm text-center py-8">No players yet.</p>
          ) : (
            top100.map((entry) => (
              <div
                key={entry.rank}
                className={`flex items-center px-3 py-2.5 border-b border-[#111] ${
                  entry.isMe ? "bg-[#1a0a2e]" : ""
                }`}
              >
                {/* Rank */}
                <div className="w-8 flex items-center">
                  <RankCell rank={entry.rank} />
                </div>

                {/* Name + AP/DP sub-line */}
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <span
                    className={`text-[12px] truncate ${
                      entry.isMe ? "text-[#9945FF] font-bold" : "text-[#ccc]"
                    }`}
                  >
                    {entry.name}
                  </span>
                  <span className="text-[9px] text-text-dim">
                    AP{" "}
                    <span className="text-[#ef5350] font-bold">{entry.ap}</span>
                    {"  "}DP{" "}
                    <span className="text-[#1e88e5] font-bold">{entry.dp}</span>
                  </span>
                </div>

                {/* Level */}
                <span className="w-8 text-center text-[12px] text-text-dim">
                  {entry.level ?? "-"}
                </span>

                {/* RP */}
                <span
                  className={`w-14 text-right text-[12px] font-bold ${
                    entry.isMe ? "text-[#14F195]" : "text-[#14F195]"
                  }`}
                >
                  {entry.rp.toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Out-of-top-100 self row */}
        {selfOutside && (
          <>
            {/* Ellipsis separator */}
            <div className="flex items-center gap-2">
              <div className="flex-1 border-t border-dashed border-[#333]" />
              <span className="text-text-dim text-[10px] tracking-widest">· · ·</span>
              <div className="flex-1 border-t border-dashed border-[#333]" />
            </div>

            <div className="bg-[#1a0a2e] border border-[rgba(153,69,255,0.3)] rounded-lg overflow-hidden">
              <div className="flex items-center px-3 py-2 border-b border-[rgba(153,69,255,0.15)] bg-[#111]">
                <span className="flex-1 text-[9px] font-black tracking-[2px] uppercase text-text-dim">
                  Your rank
                </span>
              </div>
              <div className="flex items-center px-3 py-2.5">
                <div className="w-8 flex items-center">
                  <span className="text-[12px] text-text-dim">
                    {selfOutside.rank}
                  </span>
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <span className="text-[12px] text-[#9945FF] font-bold truncate">
                    {selfOutside.name}
                  </span>
                  <span className="text-[9px] text-text-dim">
                    AP{" "}
                    <span className="text-[#ef5350] font-bold">{selfOutside.ap}</span>
                    {"  "}DP{" "}
                    <span className="text-[#1e88e5] font-bold">{selfOutside.dp}</span>
                  </span>
                </div>
                <span className="w-8 text-center text-[12px] text-text-dim">
                  {selfOutside.level ?? "-"}
                </span>
                <span className="w-14 text-right text-[12px] font-bold text-[#14F195]">
                  {selfOutside.rp.toLocaleString()}
                </span>
              </div>
            </div>
          </>
        )}

        <div className="h-16 md:hidden" />
      </div>
    </div>
  );
}

