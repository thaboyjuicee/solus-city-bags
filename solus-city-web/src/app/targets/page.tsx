"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { BATTLE_RESULT_KEY, BattleResult, formatHospitalMessage } from "@/lib/battle";
import { StatusBars, type ProfileStats } from "@/components/ui/StatusBars";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Target {
  id: string;
  type: "player" | "npc";
  displayName: string;
  name?: string;
  wallet: string;
  rp: number;
  level: number;
  attackPower: number;
  defensePower: number;
  ap?: number;
  dp?: number;
  shieldActive: boolean;
  inHospital: boolean;
  flavor?: string;
}

// Only the fields from /me that this page needs
type PageProfile = ProfileStats & {
  inHospital: boolean;
  hospitalUntil: string | null;
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ target }: { target: Target }) {
  if (target.shieldActive) {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold tracking-wide bg-[#1e88e520] text-[#1e88e5]">
        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        SHIELDED
      </span>
    );
  }
  if (target.inHospital) {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold tracking-wide bg-[#ef535020] text-[#ef5350]">
        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        HOSPITAL
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded text-[9px] font-bold tracking-wide bg-[#66bb6a20] text-[#66bb6a]">
      ACTIVE
    </span>
  );
}

function TargetCard({
  target,
  profile,
  attacking,
  error,
  onAttack,
}: {
  target: Target;
  profile: PageProfile;
  attacking: boolean;
  error: string | null;
  onAttack: (target: Target) => void;
}) {
  const ap = target.attackPower ?? target.ap ?? 0;
  const dp = target.defensePower ?? target.dp ?? 0;
  const disabled = attacking || target.shieldActive || profile.inHospital;

  return (
    <div className={`bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-3.5 flex flex-col gap-2 ${target.shieldActive ? "opacity-40" : ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[#eee] text-[15px] font-bold truncate">
            {target.displayName || target.name}
          </span>
          <span className="flex-shrink-0 bg-[#9945FF20] text-[#9945FF] text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wide">
            LV {target.level}
          </span>
          {target.type === "npc" && (
            <span className="flex-shrink-0 bg-[#14F19520] text-[#14F195] text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wide">
              NPC
            </span>
          )}
        </div>
        <StatusBadge target={target} />
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-1.5 text-[12px] font-bold">
        <span className="text-[#14F195]">RP {target.rp}</span>
        <span className="text-[#333]">·</span>
        <span className="text-[#ef5350]">AP {ap}</span>
        <span className="text-[#333]">·</span>
        <span className="text-[#1e88e5]">DP {dp}</span>
      </div>

      {/* NPC flavor text */}
      {target.flavor && (
        <p className="text-text-dim text-[10px]">{target.flavor}</p>
      )}

      {/* Attack button */}
      <button
        onClick={() => onAttack(target)}
        disabled={disabled}
        className={`w-full py-2.5 rounded border flex items-center justify-center gap-1.5 text-[11px] font-bold tracking-[2px] transition-colors ${
          disabled
            ? "bg-black/20 border-white/10 text-text-dim opacity-40 cursor-not-allowed"
            : "bg-black/20 border-[#7f1919] text-[#ef5350] hover:bg-black/30"
        }`}
      >
        {attacking ? (
          <LoadingSpinner size={16} color="#ef5350" />
        ) : (
          <>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5zm-5 0c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5S11 2.67 11 3.5v5c0 .83-.67 1.5-1.5 1.5zm10.5 3H15v-1.5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5V13H5c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 .55.45 1 1 1h10c.55 0 1-.45 1-1v-5h1c.55 0 1-.45 1-1s-.45-1-1-1z" />
            </svg>
            {target.shieldActive
              ? "SHIELDED"
              : profile.inHospital
              ? "IN HOSPITAL"
              : "ATTACK"}
          </>
        )}
      </button>

      {/* Inline attack error */}
      {error && (
        <div className="rounded px-3 py-2 bg-[#1a0a0a] border border-[#7f1919] text-[11px] font-bold text-[#ef5350]">
          {error}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TargetsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<PageProfile | null>(null);
  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  // Per-target: { attacking, error }
  const [attackState, setAttackState] = useState<
    Record<string, { attacking: boolean; error: string | null }>
  >({});

  const fetchData = useCallback(async () => {
    setPageError(null);
    try {
      const [profileRes, targetsRes] = await Promise.all([
        api.get<PageProfile>("/me"),
        api.get<Target[]>("/targets"),
      ]);
      setProfile(profileRes.data);
      setTargets(targetsRes.data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to load targets.";
      setPageError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const attack = async (target: Target) => {
    if (!profile) return;

    // Client-side hospital guard with formatted message
    if (profile.inHospital) {
      setAttackState((prev) => ({
        ...prev,
        [target.id]: {
          attacking: false,
          error: formatHospitalMessage(profile.hospitalUntil ?? undefined),
        },
      }));
      return;
    }

    setAttackState((prev) => ({
      ...prev,
      [target.id]: { attacking: true, error: null },
    }));

    try {
      const res = await api.post<BattleResult>("/battle/attack", {
        targetId: target.id,
        targetType: target.type,
      });

      // Use the display name the user already saw in the targets list.
      // The server falls back to "Player" for unnamed accounts, which loses
      // the wallet-abbreviated name shown here — preserve it instead.
      const resultToStore: BattleResult = {
        ...res.data,
        opponent: {
          ...res.data.opponent,
          name: target.displayName || target.name || res.data.opponent.name,
        },
      };
      sessionStorage.setItem(BATTLE_RESULT_KEY, JSON.stringify(resultToStore));
      router.push("/battle-result");
    } catch (err: unknown) {
      const data = (
        err as {
          response?: {
            data?: { error?: string; code?: string; recoverAt?: string };
          };
        }
      )?.response?.data;

      const msg =
        data?.code === "IN_HOSPITAL"
          ? formatHospitalMessage(data.recoverAt)
          : data?.error ?? "Attack failed. Please try again.";

      setAttackState((prev) => ({
        ...prev,
        [target.id]: { attacking: false, error: msg },
      }));
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
  if (pageError) {
    return (
      <div className="flex flex-col min-h-dvh bg-background items-center justify-center gap-4 px-6">
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
            src="/assets/images/arena_banner.png"
            alt="Battle banner"
            fill
            className="object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          <div className="relative z-10 px-3 pb-3 flex w-full items-end justify-between">
            <div>
              <p className="text-[10px] font-black text-[#eee] tracking-[3px] uppercase mb-1">
                Targets
              </p>
              <p className="text-[11px] font-semibold text-text-dim">
                Players in your RP range — costs 1 energy to attack
              </p>
            </div>
            <button
              onClick={() => { setLoading(true); fetchData(); }}
              className="bg-black/20 backdrop-blur-sm border border-white/10 rounded p-2 text-text-dim hover:text-text-secondary transition-colors"
              title="Refresh targets"
              aria-label="Refresh targets"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 4v6h-6" /><path d="M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Hospital banner for the attacker */}
        {profile?.inHospital && (
          <div className="flex items-center justify-center gap-2 bg-black/20 backdrop-blur-sm border border-[#7f1919] rounded px-3 py-2">
            <svg className="w-3 h-3 text-[#ef5350]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span className="text-[#ef5350] text-[11px] font-bold">
              {formatHospitalMessage(profile.hospitalUntil ?? undefined)}
            </span>
          </div>
        )}

        {/* Target list */}
        {targets.length === 0 ? (
          <p className="text-text-dim text-sm text-center py-8">
            No targets available in your RP range.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {targets.map((target) => {
              const state = attackState[target.id];
              return (
                <TargetCard
                  key={`${target.type}:${target.id}`}
                  target={target}
                  profile={profile!}
                  attacking={state?.attacking ?? false}
                  error={state?.error ?? null}
                  onAttack={attack}
                />
              );
            })}
          </div>
        )}

        <div className="h-16 md:hidden" />
      </div>
    </div>
  );
}

