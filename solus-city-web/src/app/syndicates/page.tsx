"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api/client";
import { StatusBars, type ProfileStats } from "@/components/ui/StatusBars";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SyndicateListItem {
  id: string;
  name: string;
  description: string;
  buffType: string;
  buffValue: number;
  memberCount: number;
  totalRp: number;
}

interface SyndicateLeaderboardItem {
  id: string;
  name: string;
  memberCount: number;
  totalRp: number;
  buffType: string;
  buffValue: number;
}

type PageProfile = ProfileStats & {
  syndicate: {
    id: string;
    name: string;
    role: string;
    buffType: string;
    buffValue: number;
  } | null;
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SyndicatesPage() {
  const [profile, setProfile] = useState<PageProfile | null>(null);
  const [syndicates, setSyndicates] = useState<SyndicateListItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<SyndicateLeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // Create form
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Per-syndicate join state
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joinErrors, setJoinErrors] = useState<Record<string, string>>({});

  // Leave
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setPageError(null);
    try {
      const [profileRes, syndicatesRes, leaderboardRes] = await Promise.all([
        api.get<PageProfile>("/me"),
        api.get<SyndicateListItem[]>("/syndicates"),
        api.get<SyndicateLeaderboardItem[]>("/leaderboard/syndicates"),
      ]);
      setProfile(profileRes.data);
      setSyndicates(syndicatesRes.data);
      setLeaderboard(leaderboardRes.data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to load syndicates.";
      setPageError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const mySyndicate = useMemo(
    () => syndicates.find((s) => s.id === profile?.syndicate?.id) ?? null,
    [profile?.syndicate?.id, syndicates]
  );

  const createSyndicate = async () => {
    if (!createName.trim()) {
      setCreateError("Syndicate name is required.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      await api.post("/syndicates", { name: createName.trim(), description: createDesc.trim() });
      setCreateName("");
      setCreateDesc("");
      setLoading(true);
      await fetchData();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Could not create syndicate.";
      setCreateError(msg);
    } finally {
      setCreating(false);
    }
  };

  const joinSyndicate = async (id: string) => {
    setJoiningId(id);
    setJoinErrors((prev) => { const n = { ...prev }; delete n[id]; return n; });
    try {
      await api.post(`/syndicates/${id}/join`);
      setLoading(true);
      await fetchData();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Could not join syndicate.";
      setJoinErrors((prev) => ({ ...prev, [id]: msg }));
    } finally {
      setJoiningId(null);
    }
  };

  const leaveSyndicate = async () => {
    setLeaving(true);
    setLeaveError(null);
    try {
      await api.post("/syndicates/leave");
      setLoading(true);
      await fetchData();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Could not leave syndicate.";
      setLeaveError(msg);
    } finally {
      setLeaving(false);
    }
  };

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
  // Error
  // ------------------------------------------------------------------
  if (pageError) {
    return (
      <div className="flex flex-col min-h-dvh bg-transparent items-center justify-center gap-4 px-6">
        <p className="text-danger text-sm text-center">{pageError}</p>
        <button
          onClick={() => { setLoading(true); fetchData(); }}
          className="px-5 py-2.5 bg-accent rounded-lg text-white font-semibold text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  const inASyndicate = !!profile?.syndicate;
  const busy = creating || leaving || joiningId !== null;

  return (
    <div className="flex flex-col bg-transparent min-h-dvh">
      {profile && <StatusBars profile={profile} />}

      <div className="flex flex-col gap-3">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-[#eee] tracking-[3px] uppercase">
              Syndicates
            </p>
            <p className="text-[11px] font-semibold text-text-dim mt-0.5">
              Join a crew and rise together
            </p>
          </div>
          <button
            onClick={() => { setLoading(true); fetchData(); }}
            className="bg-black/20 backdrop-blur-sm border border-white/10 rounded p-2 text-text-dim hover:text-text-secondary transition-colors"
            aria-label="Refresh syndicates"
          >
            <svg
              className="w-3.5 h-3.5"
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

        {/* ---- MY SYNDICATE ---- */}
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-3.5">
          <p className="text-[9px] font-black tracking-[2px] uppercase text-text-dim mb-2.5">
            My Syndicate
          </p>

          {mySyndicate ? (
            <>
              <p className="text-[#eee] text-[15px] font-bold mb-1">{mySyndicate.name}</p>
              <p className="text-[11px] text-text-dim mb-0.5">
                Members {mySyndicate.memberCount}/20 · Total RP {mySyndicate.totalRp.toLocaleString()}
              </p>
              <p className="text-[11px] text-text-dim mb-3">
                Buff: +{Math.round(mySyndicate.buffValue * 100)}%{" "}
                {mySyndicate.buffType.toUpperCase()}
              </p>
              {profile?.syndicate?.role && (
                <p className="text-[10px] font-black tracking-[2px] text-[#9945FF] mb-3">
                  {profile.syndicate.role.toUpperCase()}
                </p>
              )}

              {leaveError && (
                <p className="text-[#ef5350] text-[11px] font-bold mb-2">{leaveError}</p>
              )}
              <button
                onClick={leaveSyndicate}
                disabled={busy}
                className="w-full py-2.5 border border-[#7f1919] bg-[#1a0a0a] rounded text-[#ef5350] text-[10px] font-black tracking-[2px] disabled:opacity-45 flex items-center justify-center gap-1.5"
              >
                {leaving ? <LoadingSpinner size={14} color="#ef5350" /> : "LEAVE SYNDICATE"}
              </button>
            </>
          ) : (
            <>
              <p className="text-[11px] text-text-dim mb-3">You are not in a syndicate.</p>
              <input
                type="text"
                value={createName}
                onChange={(e) => { setCreateName(e.target.value); setCreateError(null); }}
                placeholder="Syndicate Name (3–24 chars)"
                maxLength={24}
                className="w-full bg-black/20 backdrop-blur-sm border border-white/10 rounded px-3 py-2 text-[#eee] text-[13px] focus:outline-none focus:border-accent mb-2 placeholder:text-[#555]"
              />
              <input
                type="text"
                value={createDesc}
                onChange={(e) => setCreateDesc(e.target.value)}
                placeholder="Description (optional)"
                maxLength={180}
                className="w-full bg-black/20 backdrop-blur-sm border border-white/10 rounded px-3 py-2 text-[#eee] text-[13px] focus:outline-none focus:border-accent mb-2 placeholder:text-[#555]"
              />
              {createError && (
                <p className="text-[#ef5350] text-[11px] font-bold mb-2">{createError}</p>
              )}
              <button
                onClick={createSyndicate}
                disabled={busy}
                className="w-full py-2.5 border border-[rgba(153,69,255,0.3)] bg-[#1a0a2e] rounded text-[#9945FF] text-[10px] font-black tracking-[2px] disabled:opacity-45 flex items-center justify-center gap-1.5"
              >
                {creating ? <LoadingSpinner size={14} color="#9945FF" /> : "CREATE SYNDICATE"}
              </button>
            </>
          )}
        </div>

        {/* ---- TOP SYNDICATES ---- */}
        {leaderboard.length > 0 && (
          <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-3.5">
            <p className="text-[9px] font-black tracking-[2px] uppercase text-text-dim mb-2.5">
              Top Syndicates
            </p>
            {leaderboard.slice(0, 5).map((entry, i) => (
              <div key={entry.id} className="flex items-center py-1.5">
                <span className="w-7 text-[12px] font-bold text-[#9945FF]">#{i + 1}</span>
                <span className="flex-1 text-[12px] text-[#eee] truncate">{entry.name}</span>
                <span className="text-[12px] font-bold text-[#14F195]">
                  {entry.totalRp.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ---- DISCOVER ---- */}
        <p className="text-[9px] font-black tracking-[2px] uppercase text-text-dim">
          Discover
        </p>

        {syndicates.length === 0 ? (
          <p className="text-text-dim text-sm text-center py-6">No syndicates yet — create the first one!</p>
        ) : (
          <div className="flex flex-col gap-2">
            {syndicates.map((item) => {
              const joined = profile?.syndicate?.id === item.id;
              return (
                <div key={item.id} className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-3.5 flex flex-col gap-1.5">
                  <p className="text-[#eee] text-[14px] font-bold">{item.name}</p>
                  <p className="text-[11px] text-text-dim">{item.description || "No description"}</p>
                  <p className="text-[11px] text-text-dim">
                    Members {item.memberCount}/20 · RP {item.totalRp.toLocaleString()}
                  </p>
                  <p className="text-[11px] text-text-dim">
                    Buff: +{Math.round(item.buffValue * 100)}% {item.buffType.toUpperCase()}
                  </p>

                  {joined ? (
                    <p className="text-[#14F195] text-[10px] font-black tracking-[2px]">
                      YOU ARE A MEMBER
                    </p>
                  ) : !inASyndicate ? (
                    <>
                      {joinErrors[item.id] && (
                        <p className="text-[#ef5350] text-[11px] font-bold">{joinErrors[item.id]}</p>
                      )}
                      <button
                        onClick={() => joinSyndicate(item.id)}
                        disabled={busy}
                        className="w-full py-2.5 border border-[rgba(153,69,255,0.3)] bg-[#1a0a2e] rounded text-[#9945FF] text-[10px] font-black tracking-[2px] disabled:opacity-45 flex items-center justify-center gap-1.5"
                      >
                        {joiningId === item.id ? (
                          <LoadingSpinner size={14} color="#9945FF" />
                        ) : (
                          "JOIN"
                        )}
                      </button>
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        <div className="h-16 md:hidden" />
      </div>
    </div>
  );
}

