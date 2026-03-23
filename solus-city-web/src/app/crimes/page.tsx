"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { MeResponse } from "@/lib/gameApi";

<<<<<<< HEAD
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
        <span className={`text-[15px] font-bold ${locked ? "text-[#c8cdc2]" : "text-[#f2f4ec]"}`}>
          {crime.name}
        </span>
        <span
          className={`flex items-center gap-1 rounded px-1.5 py-0.5 ${
            locked ? "bg-[#66666620] text-[#d0d5ca]" : "bg-[#9945FF20] text-[#9945ff]"
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
=======
interface Crime { id: string; name: string; nerveCost: number; cashMin: number; cashMax: number; xpReward: number; successRate: number; levelReq: number; locked?: boolean; }
interface CommitResponse { success: boolean; crimeName: string; cashGained: number; xpGained: number; leveledUp: boolean; newLevel: number; profile: { nerve: number; cash: number; xp: number; level: number; }; heatChange?: number; newHeat?: number; wantedTier?: string; }
type CrimeResult = { ok: true; data: CommitResponse } | { ok: false; msg: string };
const TAGS = ["Stealth", "Theft", "Hustle", "Financial", "Extortion", "Heist"];
const BORDER = ["#9f64ff", "#4f8cff", "#f7bf35", "#36d47f", "#ff9d32", "#ff5d5d"];
function formatCashRange(min: number, max: number) { return `$${Math.floor(min / 1000)}K-$${Math.floor(max / 1000)}K`; }
function ratingLabel(rate: number) { if (rate >= 0.85) return "SAFE"; if (rate >= 0.7) return "FAVORABLE"; if (rate >= 0.55) return "EVEN"; return "RISKY"; }
function SuccessBars({ rate }: { rate: number }) { const filled = Math.max(1, Math.min(5, Math.round(rate * 5))); return <div className="flex items-center gap-1">{Array.from({ length: 5 }).map((_, index) => <span key={index} className={`h-3 w-[5px] rounded-full ${index < filled ? "bg-[#36d47f]" : "bg-white/8"}`} />)}<span className="ml-1 text-[10px] font-black text-[#36d47f]">{Math.round(rate * 100)}%</span></div>; }
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39

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

<<<<<<< HEAD
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
        <div className="h-28 rounded-lg overflow-hidden border border-white/10 bg-black/20 backdrop-blur-sm flex items-end relative">
          <Image
            src="/assets/images/crimes_banner.png"
            alt="Crimes banner"
            fill
            className="object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          <div className="relative z-10 px-3 pb-3">
            <p className="text-[20px] font-black text-[#f2f4ec] tracking-[4px]">CRIMES</p>
            <p className="text-[11px] font-semibold text-text-dim">
              Use nerve to commit crimes for cash and XP
            </p>
          </div>
        </div>

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



=======
  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><LoadingSpinner size={32} /></div>;
  if (error || !profile) return <div className="sc-panel-danger p-5 text-[13px] text-[#ff9d9d]">{error ?? "Profile unavailable."}</div>;

  return <div className="space-y-4"><div><p className="sc-page-title">Crimes</p><p className="sc-subtitle mt-2">Use nerve · earn cash · build rep</p></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div className="sc-stat"><p className="sc-label">Nerve</p><p className="mt-3 text-[28px] font-black text-[#4f8cff]">{profile.nerve}/{profile.maxNerve}</p></div><div className="sc-stat"><p className="sc-label">Cash</p><p className="mt-3 text-[28px] font-black text-[#36d47f]">${Math.floor(profile.cash).toLocaleString()}</p></div><div className="sc-stat"><p className="sc-label">Level</p><p className="mt-3 text-[28px] font-black text-[#9f64ff]">{profile.level}</p></div><div className="sc-stat"><p className="sc-label">Heat</p><p className="mt-3 text-[28px] font-black text-[#ff5d5d]">{profile.heat}</p></div></div><section className="space-y-3"><div><p className="sc-kicker">Available Crimes</p><p className="mt-2 text-[26px] font-black text-[#f4f5fb]">Unlocked Operations</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{crimes.map((crime, index) => { const locked = typeof crime.locked === "boolean" ? crime.locked : profile.level < crime.levelReq; const notEnoughNerve = !locked && profile.nerve < crime.nerveCost; const busy = committing === crime.id; const tone = BORDER[index % BORDER.length]; const result = results[crime.id]; return <div key={crime.id} className="rounded-[18px] border bg-[#0f1016]/94 p-4" style={{ borderColor: locked ? "rgba(255,255,255,0.08)" : tone }}><div className="flex items-center justify-between gap-3"><span className="sc-chip" style={{ color: tone, borderColor: `${tone}44`, backgroundColor: `${tone}14` }}>{TAGS[index % TAGS.length]}</span><SuccessBars rate={crime.successRate} /></div><p className="mt-4 text-[28px] font-black text-[#f4f5fb]">{crime.name}</p><div className="mt-2 grid grid-cols-2 gap-3"><div className="sc-stat"><p className="sc-label">Nerve</p><p className="mt-2 text-[16px] font-black text-[#4f8cff]">{crime.nerveCost}</p></div><div className="sc-stat"><p className="sc-label">Cash Range</p><p className="mt-2 text-[16px] font-black text-[#36d47f]">{formatCashRange(crime.cashMin, crime.cashMax)}</p></div></div><div className="mt-3 flex items-center justify-between"><p className="text-[11px] font-black text-[#7c8095]">{crime.xpReward} XP</p><span className="sc-chip" style={{ letterSpacing: "0.08em" }}>{ratingLabel(crime.successRate)}</span></div><button onClick={() => commit(crime)} disabled={busy || locked || notEnoughNerve} className={`sc-button mt-4 w-full ${locked || notEnoughNerve ? "text-[#555]" : "sc-button-danger"}`}>{busy ? "COMMITTING..." : locked ? "LOCKED" : notEnoughNerve ? "NOT ENOUGH NERVE" : "COMMIT CRIME"}</button>{result ? <div className={`mt-3 rounded-xl border px-3 py-3 text-[12px] font-bold ${result.ok ? "border-[rgba(54,212,127,0.2)] bg-[rgba(12,31,22,0.9)] text-[#cfead8]" : "border-[rgba(255,93,93,0.18)] bg-[rgba(27,13,15,0.9)] text-[#ffaaaa]"}`}>{result.ok ? `${result.data.success ? "Success" : "Failed"} · +$${Math.floor(result.data.cashGained).toLocaleString()} · +${result.data.xpGained} XP` : result.msg}</div> : null}</div>; })}</div></section></div>;
}
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
