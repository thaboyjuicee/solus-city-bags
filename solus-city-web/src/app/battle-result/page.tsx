"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Skull, ShieldAlert, Trophy } from "lucide-react";
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
    <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-3.5 flex flex-col">
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
    if (!result?.opponent) return;
    setAttackingAgain(true);
    setAttackAgainError(null);

    const targetType =
      result.opponent.type === "npc" || result.opponent.type === "player"
        ? result.opponent.type
        : "npc";

    try {
      const res = await api.post<BattleResult>("/battle/attack", {
        targetId: result.opponent.id,
        targetType,
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
      <div className="flex min-h-dvh bg-transparent items-center justify-center">
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
  const canAttackAgain =
    result.opponent?.type === "npc" || result.opponent?.type === "player";

  const outcomeLabel = isEvade ? "EVADED" : win ? "VICTORY" : "DEFEAT";
  const outcomeColor = isEvade
    ? "text-[#f9a825]"
    : win
    ? "text-[#66bb6a]"
    : "text-[#ef5350]";
  const OutcomeIcon = isEvade ? ShieldAlert : win ? Trophy : Skull;

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
    <div className="flex flex-col bg-transparent min-h-dvh">
      <div className="flex flex-col gap-3">

        {/* Hero */}
        <div className="h-28 rounded-lg overflow-hidden border border-white/10 bg-black/20 backdrop-blur-sm flex items-end relative">
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
          <OutcomeIcon
            size={36}
            strokeWidth={1.75}
            className={`w-10 h-10 ${outcomeColor}`}
          />

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
            <div className="mt-2 flex items-center justify-center gap-2 rounded border border-[#2e7d32] bg-black/20 backdrop-blur-sm px-3 py-2">
              <span className="text-[#66bb6a] text-[11px] font-bold tracking-wide">
                Target sent to hospital!
              </span>
            </div>
          )}
          {selfHospitalized && (
            <div className="mt-2 flex items-center justify-center gap-2 rounded border border-[#7f1919] bg-black/20 backdrop-blur-sm px-3 py-2">
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
          <div className="rounded px-3 py-2 bg-black/20 backdrop-blur-sm border border-[#7f1919] text-[11px] font-bold text-[#ef5350]">
            {attackAgainError}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2.5">
          <button
            onClick={() => router.push("/targets")}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-black/20 backdrop-blur-sm border border-[rgba(153,69,255,0.3)] rounded-lg text-[#9945FF] text-[11px] font-bold tracking-[2px]"
          >
            BACK TO TARGETS
          </button>
          <button
            onClick={() => router.push("/attack-logs")}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg text-[#888] text-[11px] font-bold tracking-[2px]"
          >
            VIEW LOGS
          </button>
        </div>

        {canAttackAgain && (
          <button
            onClick={attackAgain}
            disabled={attackingAgain}
            className="w-full py-2.5 rounded border border-[#7f1919] bg-black/20 backdrop-blur-sm text-[#ef5350] text-[11px] font-black tracking-[2px] flex items-center justify-center disabled:opacity-50"
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

