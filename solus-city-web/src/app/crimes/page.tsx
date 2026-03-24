"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { StatusBars, type ProfileStats } from "@/components/ui/StatusBars";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageBanner } from "@/components/game/PageBanner";
import { Crosshair } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Crime {
  id: string;
  name: string;
  nerveCost: number;
  cashMin: number;
  cashMax: number;
  xpReward: number;
  successRate: number;
  levelReq: number;
  locked?: boolean;
}

interface CommitResponse {
  success: boolean;
  crimeName: string;
  cashGained: number;
  xpGained: number;
  leveledUp: boolean;
  newLevel: number;
  profile: {
    nerve: number;
    cash: number;
    xp: number;
    level: number;
  };
}

// Result stored per crime card — either a successful commit outcome or an
// error message (e.g. "Not enough nerve"). Cleared when a new commit starts.
type CrimeResult =
  | { ok: true; data: CommitResponse }
  | { ok: false; msg: string };

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ResultBanner({ result }: { result: CrimeResult }) {
  if (!result.ok) {
    return (
      <div className="mt-2 rounded px-3 py-2 bg-black/20 backdrop-blur-sm border border-[#7f1919] text-[11px] font-bold text-[#ef5350]">
        {result.msg}
      </div>
    );
  }

  const { data } = result;
  return (
    <div
      className={`mt-2 rounded px-3 py-2 border text-[11px] font-bold flex flex-col gap-0.5 ${
        data.success
          ? "bg-black/20 backdrop-blur-sm border-[#1a4a1a] text-[#66bb6a]"
          : "bg-black/20 backdrop-blur-sm border-[#4a4a1a] text-[#fdd835]"
      }`}
    >
      {data.success ? (
        <>
          <span>Success — +${data.cashGained.toLocaleString()} cash · +{data.xpGained} XP</span>
          {data.leveledUp && (
            <span className="text-[#9945FF]">
              LEVEL UP! Now Level {data.newLevel}
            </span>
          )}
        </>
      ) : (
        <span>
          {data.crimeName} failed — +{data.xpGained} XP
        </span>
      )}
    </div>
  );
}

function CrimeCard({
  crime,
  profile,
  committing,
  result,
  onCommit,
}: {
  crime: Crime;
  profile: ProfileStats & { level: number };
  committing: string | null;
  result: CrimeResult | undefined;
  onCommit: (crime: Crime) => void;
}) {
  const locked = typeof crime.locked === "boolean" ? crime.locked : profile.level < crime.levelReq;
  const notEnoughNerve = !locked && profile.nerve < crime.nerveCost;
  const isCommitting = committing === crime.id;
  const anyCommitting = committing !== null;

  return (
    <div
      className="rounded-lg p-3.5 flex flex-col gap-2 transition-opacity border backdrop-blur-sm"
      style={{
        backgroundColor: locked ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.20)",
        borderColor: locked ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.10)",
        color: locked ? "#b0b0b0" : "#eee",
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className={`text-[15px] font-bold ${locked ? "text-[#a6a6a6]" : "text-[#eee]"}`}>
          {crime.name}
        </span>
        <span
          className={`flex items-center gap-1 rounded px-1.5 py-0.5 ${
            locked ? "bg-[#66666620] text-[#888]" : "bg-[#9945FF20] text-[#9945ff]"
          }`}
        >
          {locked && (
            <svg
              className={`w-2.5 h-2.5 ${locked ? "text-[#999]" : "text-[#1e88e5]"}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          )}
          <span className={`text-[9px] font-bold ${locked ? "text-[#999]" : "text-text-dim"}`}>LV.{crime.levelReq}</span>
        </span>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-1 flex-wrap">
        {/* Nerve cost */}
        <span className="flex items-center gap-1">
          <svg className={`w-2.5 h-2.5 ${locked ? "text-[#999]" : "text-[#1e88e5]"}`} viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          <span
            className={`text-[10px] font-bold ${
              notEnoughNerve ? "text-[#ef5350]" : locked ? "text-[#8f8f8f]" : "text-[#1e88e5]"
            }`}
          >
            {crime.nerveCost} NV
          </span>
        </span>
        <span className={`text-[10px] mx-1 ${locked ? "text-[#666]" : "text-[#333]"}`}>&middot;</span>
        <span className={`text-[10px] font-bold ${locked ? "text-[#8f8f8f]" : "text-[#66bb6a]"}`}>
          ${crime.cashMin.toLocaleString()}–${crime.cashMax.toLocaleString()}
        </span>
        <span className={`text-[10px] mx-1 ${locked ? "text-[#666]" : "text-[#333]"}`}>&middot;</span>
        <span className={`text-[10px] font-bold ${locked ? "text-[#8f8f8a]" : "text-[#fdd835]"}`}>
          {crime.xpReward} XP
        </span>
        <span className={`text-[10px] mx-1 ${locked ? "text-[#666]" : "text-[#333]"}`}>&middot;</span>
        <span className={`text-[10px] font-bold ${locked ? "text-[#777]" : "text-text-dim"}`}>
          {Math.round(crime.successRate * 100)}%
        </span>
      </div>

      {/* Commit button */}
      <button
        onClick={() => onCommit(crime)}
        disabled={anyCommitting || locked}
        className={`w-full py-2.5 rounded flex items-center justify-center border text-[11px] font-bold tracking-[2px] transition-colors ${
          locked
            ? "bg-black/20 border-white/10 text-[#666] cursor-not-allowed"
            : anyCommitting
            ? "bg-black/20 border-white/10 text-text-dim cursor-not-allowed"
            : notEnoughNerve
            ? "bg-black/20 border-[#7f1919] text-[#ef5350] opacity-60 cursor-not-allowed"
            : "bg-black/20 border-[#7f1919] text-[#ef5350] hover:bg-black/30"
        }`}
      >
        {isCommitting ? (
          <LoadingSpinner size={12} color="#ef5350" />
        ) : locked ? (
          "LOCKED"
        ) : notEnoughNerve ? (
          "NOT ENOUGH NERVE"
        ) : (
          "COMMIT CRIME"
        )}
      </button>

      {/* Inline result */}
      {result && <ResultBanner result={result} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CrimesPage() {
  const [profile, setProfile] = useState<(ProfileStats & { level: number }) | null>(null);
  const [crimes, setCrimes] = useState<Crime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [committing, setCommitting] = useState<string | null>(null);
  // Per-crime last result — keyed by crime ID
  const [results, setResults] = useState<Record<string, CrimeResult>>({});

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const [profileRes, crimesRes] = await Promise.all([
        api.get<ProfileStats & { level: number }>("/me"),
        api.get<Crime[]>("/crimes"),
      ]);
      setProfile(profileRes.data);
      setCrimes(crimesRes.data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Failed to load crimes.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const commit = async (crime: Crime) => {
    if (committing !== null) return;
    setCommitting(crime.id);
    // Clear any previous result for this card
    setResults((prev) => {
      const next = { ...prev };
      delete next[crime.id];
      return next;
    });

    try {
      const res = await api.post<CommitResponse>("/crimes/commit", {
        crimeId: crime.id,
      });
      const data = res.data;

      // Patch local profile from the partial profile returned by the server
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              nerve: data.profile.nerve,
              cash: data.profile.cash,
              xp: data.profile.xp,
              level: data.profile.level,
            }
          : prev
      );

      setResults((prev) => ({ ...prev, [crime.id]: { ok: true, data } }));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Crime failed. Please try again.";
      setResults((prev) => ({ ...prev, [crime.id]: { ok: false, msg } }));
    } finally {
      setCommitting(null);
    }
  };

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
  // Fatal error
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

  // ------------------------------------------------------------------
  // Main view
  // ------------------------------------------------------------------
  return (
    <div className="flex flex-col bg-background min-h-dvh">
      {profile && <StatusBars profile={profile} />}

      <div className="flex flex-col gap-3">
        {/* Hero */}
        <PageBanner
          imageSrc="/assets/images/crimes_banner.png"
          imageAlt="Crimes banner"
          title="Crimes"
          subtitle="Use nerve to commit crimes for cash and XP"
          icon={<Crosshair className="h-5 w-5 text-[#eee]" />}
          subtitleClassName="text-text-dim"
        />

        {/* Crimes list */}
        {crimes.length === 0 ? (
          <p className="text-text-dim text-sm text-center py-8">
            No crimes available at your level yet.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {crimes.map((crime) => (
              <CrimeCard
                key={crime.id}
                crime={crime}
                profile={profile!}
                committing={committing}
                result={results[crime.id]}
                onCommit={commit}
              />
            ))}
          </div>
        )}

        <div className="h-16 md:hidden" />
      </div>
    </div>
  );
}


