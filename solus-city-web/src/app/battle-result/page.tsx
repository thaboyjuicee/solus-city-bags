"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import {
  BATTLE_RESULT_KEY,
  BattleResult,
  formatHospitalMessage,
} from "@/lib/battle";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Row({
  label,
  value,
  highlight,
  negative,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="flex justify-between items-center py-1.5">
      <span className="text-text-dim text-[12px]">{label}</span>
      <span
        className={`text-[12px] font-bold ${
          highlight
            ? "text-[#66bb6a]"
            : negative
            ? "text-[#ef5350]"
            : "text-[#eee]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#141414] border border-[#1e1e1e] rounded-lg p-3.5 flex flex-col">
      {title && (
        <p className="text-[9px] font-black tracking-[3px] uppercase text-text-dim mb-2">
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BattleResultPage() {
  const router = useRouter();
  const [result, setResult] = useState<BattleResult | null>(null);
  const [attackingAgain, setAttackingAgain] = useState(false);
  const [attackAgainError, setAttackAgainError] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(BATTLE_RESULT_KEY);
    if (!raw) {
      router.replace("/targets");
      return;
    }
    try {
      setResult(JSON.parse(raw) as BattleResult);
    } catch {
      router.replace("/targets");
    }
  }, [router]);

  const attackAgain = async () => {
    if (!result?.opponent || result.opponent.type !== "npc") return;
    setAttackingAgain(true);
    setAttackAgainError(null);

    try {
      const res = await api.post<BattleResult>("/battle/attack", {
        targetId: result.opponent.id,
        targetType: "npc",
      });
      sessionStorage.setItem(BATTLE_RESULT_KEY, JSON.stringify(res.data));
      setResult(res.data);
      // Scroll to top so the new outcome is visible
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      const data = (
        err as {
          response?: {
            data?: { error?: string; code?: string; recoverAt?: string };
          };
        }
      )?.response?.data;

      const msUntil =
        data?.code === "IN_HOSPITAL" && data.recoverAt
          ? Math.ceil(
              Math.max(0, new Date(data.recoverAt).getTime() - Date.now()) /
                60000
            )
          : 0;

      setAttackAgainError(
        msUntil > 0
          ? `You are in the hospital. Attack again in about ${msUntil} minute${
              msUntil === 1 ? "" : "s"
            }.`
          : data?.code === "IN_HOSPITAL"
          ? formatHospitalMessage(data.recoverAt)
          : data?.error ?? "Could not attack again."
      );
    } finally {
      setAttackingAgain(false);
    }
  };

  // ------------------------------------------------------------------
  // Loading (waiting for sessionStorage read on mount)
  // ------------------------------------------------------------------
  if (!result) {
    return (
      <div className="flex min-h-dvh bg-background items-center justify-center">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Derived values
  // ------------------------------------------------------------------
  const { outcomeType, win, rpChange, loot } = result;
  const isEvade = outcomeType === "evaded";
  const rpSign = rpChange >= 0 ? "+" : "";
  const canAttackAgain = result.opponent?.type === "npc";

  const outcomeLabel = isEvade ? "EVADED" : win ? "VICTORY" : "DEFEAT";
  const outcomeColor = isEvade
    ? "text-[#f9a825]"
    : win
    ? "text-[#66bb6a]"
    : "text-[#ef5350]";

  const heroTitle = isEvade
    ? "EVADE REPORT"
    : win
    ? "VICTORY REPORT"
    : "BATTLE REPORT";

  const selfHospitalized =
    result.hospitalizedSelf ?? result.attackerHospitalized;
  const targetHospitalized =
    result.hospitalizedTarget ?? result.defenderHospitalized;

  const healthLow =
    result.updatedProfile.health <
    result.updatedProfile.maxHealth * 0.3;

  return (
    <div className="flex flex-col bg-background min-h-dvh">
      <div className="max-w-2xl w-full mx-auto px-3 py-3 flex flex-col gap-3">

        {/* Hero */}
        <div className="h-28 rounded-lg overflow-hidden border border-[#1e1e1e] bg-[#0d0d0d] flex items-end relative">
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          <div className="relative z-10 px-3 pb-3">
            <p className="text-[10px] font-black text-[#eee] tracking-[3px] uppercase mb-1">
              {heroTitle}
            </p>
            <p className="text-[11px] font-semibold text-text-dim">
              {result.opponent?.name} (
              {result.opponent?.type?.toUpperCase()})
            </p>
          </div>
        </div>

        {/* Outcome headline */}
        <div className="flex flex-col items-center py-4 gap-3">
          {/* Icon */}
          <svg
            className={`w-10 h-10 ${outcomeColor}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            {isEvade ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5zm-5 0c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5S11 2.67 11 3.5v5c0 .83-.67 1.5-1.5 1.5zM20 13H15v-1.5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5V13H5c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 .55.45 1 1 1h10c.55 0 1-.45 1-1v-5h1c.55 0 1-.45 1-1s-.45-1-1-1z" />
            )}
          </svg>

          <span
            className={`text-[36px] font-black tracking-[6px] ${outcomeColor}`}
          >
            {outcomeLabel}
          </span>
        </div>

        {/* Loot & outcome */}
        <Card>
          <Row
            label="Loot"
            value={
              isEvade
                ? "$0"
                : win
                ? `+$${loot.toLocaleString()}`
                : "$0"
            }
            highlight={win && loot > 0}
          />
          <Row
            label="RP Change"
            value={`${rpSign}${rpChange}`}
            highlight={rpChange > 0}
            negative={rpChange < 0}
          />
          <Row label="XP Gained" value={`+${result.xpGained}`} highlight />
          <Row
            label="Hit"
            value={isEvade ? "EVADED" : result.criticalHit ? "CRITICAL" : "NORMAL"}
            highlight={result.criticalHit}
          />
          {isEvade && (
            <Row
              label="Evasion Chance"
              value={`${((result.evadeChance ?? 0) * 100).toFixed(1)}%`}
            />
          )}
          {result.criticalHit && (
            <Row
              label="Critical Chance"
              value={`${((result.critChance ?? 0) * 100).toFixed(1)}%`}
            />
          )}
          <Row
            label="Opponent"
            value={`${result.opponent?.name ?? "Unknown"} (${
              result.opponent?.type ?? "player"
            })`}
          />
        </Card>

        {/* Damage */}
        <Card title="Damage">
          <Row
            label="Damage Dealt"
            value={String(result.damageDealt)}
            highlight={result.damageDealt > 0}
          />
          <Row
            label="Damage Taken"
            value={String(result.damageTaken)}
            negative={result.damageTaken > 0}
          />
          {targetHospitalized && (
            <div className="mt-2 flex items-center justify-center gap-2 rounded border border-[#2e7d32] bg-[#66bb6a10] px-3 py-2">
              <span className="text-[#66bb6a] text-[11px] font-bold tracking-wide">
                Target sent to hospital!
              </span>
            </div>
          )}
          {selfHospitalized && (
            <div className="mt-2 flex items-center justify-center gap-2 rounded border border-[#7f1919] bg-[#ef535010] px-3 py-2">
              <span className="text-[#ef5350] text-[11px] font-bold tracking-wide">
                You were hospitalized!
              </span>
            </div>
          )}
        </Card>

        {/* Battle details */}
        <Card title="Battle Details">
          <Row label="Your AP" value={String(result.attackerAP)} />
          <Row label="Their DP" value={String(result.defenderDP)} />
          <Row
            label="Win Chance"
            value={`${(result.pWin * 100).toFixed(1)}%`}
          />
          <Row label="Roll" value={result.roll.toFixed(3)} />
        </Card>

        {/* Post-battle stats */}
        <Card title="Your Stats After Battle">
          <Row
            label="Cash"
            value={`$${Math.floor(result.updatedProfile.cash).toLocaleString()}`}
          />
          <Row
            label="Health"
            value={`${result.updatedProfile.health}/${result.updatedProfile.maxHealth}`}
            negative={healthLow}
          />
          <Row label="Energy" value={String(result.updatedProfile.energy)} />
          <Row label="RP" value={String(result.updatedProfile.rp)} />
          <Row label="Level" value={String(result.updatedProfile.level)} />
        </Card>

        {/* Attack again error */}
        {attackAgainError && (
          <div className="rounded px-3 py-2 bg-[#1a0a0a] border border-[#7f1919] text-[11px] font-bold text-[#ef5350]">
            {attackAgainError}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2.5">
          <button
            onClick={() => router.push("/targets")}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#1a0a2e] border border-[rgba(153,69,255,0.3)] rounded-lg text-[#9945FF] text-[11px] font-bold tracking-[2px]"
          >
            BACK TO TARGETS
          </button>
          <button
            onClick={() => router.push("/attack-logs")}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#111] border border-[#1e1e1e] rounded-lg text-[#888] text-[11px] font-bold tracking-[2px]"
          >
            VIEW LOGS
          </button>
        </div>

        {canAttackAgain && (
          <button
            onClick={attackAgain}
            disabled={attackingAgain}
            className="w-full py-2.5 rounded border border-[#7f1919] bg-[#1a0a0a] text-[#ef5350] text-[11px] font-black tracking-[2px] flex items-center justify-center disabled:opacity-50"
          >
            {attackingAgain ? (
              <LoadingSpinner size={14} color="#ef5350" />
            ) : (
              "ATTACK AGAIN"
            )}
          </button>
        )}

        <div className="h-16 md:hidden" />
      </div>
    </div>
  );
}
