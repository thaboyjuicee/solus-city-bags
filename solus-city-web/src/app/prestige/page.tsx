"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api/client";

function normalizeList(value: any, fallback: string[]) {
  if (Array.isArray(value) && value.length) {
    return value.map((entry) => (typeof entry === "string" ? entry : entry?.label ?? entry?.name ?? JSON.stringify(entry)));
  }
  return fallback;
}

export default function PrestigePage() {
  const [preview, setPreview] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const next = (await api.get<any>("/prestige/preview")).data;
      setPreview(next);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? "Could not load prestige preview.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resets = useMemo(
    () => normalizeList(preview?.resets ?? preview?.preview?.resets, ["Wallet cash", "Vault cash", "Heat / wanted state", "Current season score"]),
    [preview],
  );
  const keeps = useMemo(
    () => normalizeList(preview?.keeps ?? preview?.preview?.keeps, ["Prestige level", "Permanent prestige bonuses", "Season history", "Hall of fame records"]),
    [preview],
  );
  const bonuses = useMemo(
    () => normalizeList(preview?.permanentBonuses ?? preview?.preview?.permanentBonuses, ["Permanent prestige bonus", "Veteran status marker"]),
    [preview],
  );
  const requirements = useMemo(
    () => normalizeList(preview?.requirements ?? preview?.preview?.requirements, ["Reach the minimum prestige level gate", "Meet the veteran stat threshold"]),
    [preview],
  );

  const handleExecute = async () => {
    try {
      setSubmitting(true);
      const next = (await api.post<any>("/prestige/execute", { confirmation: true })).data;
      setResult(next);
      await load();
    } catch (err: any) {
      setError(err?.message ?? "Prestige execution failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <section className="sc-panel-strong overflow-hidden p-6 md:p-7">
        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="sc-kicker">PRESTIGE CHAMBER</span>
              {preview?.eligible ? <span className="sc-chip sc-chip-green">eligible</span> : <span className="sc-chip sc-chip-orange">not ready</span>}
            </div>
            <div>
              <h1 className="sc-page-title">Burn the old empire, keep the legend</h1>
              <p className="sc-subtitle max-w-3xl">
                Prestige is the veteran chase loop. You can inspect the reset scope before committing, keep your permanent history, and climb the long-term ladder without hidden consequences.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="sc-stat">
                <div className="sc-label">Current prestige</div>
                <div className="sc-value">{preview?.currentPrestigeLevel ?? preview?.prestigeLevel ?? 0}</div>
                <div className="mt-2 text-xs text-white/45">Your permanent tier across the life of the account.</div>
              </div>
              <div className="sc-stat">
                <div className="sc-label">Next prestige</div>
                <div className="sc-value">{preview?.nextPrestigeLevel ?? (Number(preview?.currentPrestigeLevel ?? preview?.prestigeLevel ?? 0) + 1)}</div>
                <div className="mt-2 text-xs text-white/45">The next veteran milestone if you reset now.</div>
              </div>
              <div className="sc-stat">
                <div className="sc-label">Permanent bonus</div>
                <div className="sc-value">{preview?.projectedPermanentBonus ?? preview?.bonusPercent ?? "+5%"}</div>
                <div className="mt-2 text-xs text-white/45">A moderate boost that stays with you after the reset.</div>
              </div>
            </div>
          </div>

          <div className="sc-panel p-5">
            <div className="sc-kicker">EXECUTION</div>
            <div className="mt-3 text-2xl font-black text-white">Are you ready to reset?</div>
            <p className="mt-3 text-sm leading-6 text-white/60">
              Prestige is intentionally explicit. What resets and what stays is listed below before you commit.
            </p>
            <button
              type="button"
              className="sc-button sc-button-primary mt-6 w-full justify-center"
              onClick={handleExecute}
              disabled={submitting || !preview?.eligible}
            >
              {submitting ? "Executing..." : "Execute prestige"}
            </button>
            <div className="mt-4 rounded-[22px] border border-white/10 bg-white/[0.04] p-4 text-sm text-white/55">
              {preview?.eligible
                ? "The reset keeps your history, prestige level, and permanent bonuses intact."
                : preview?.reason ?? "Your account has not met the prestige gate yet."}
            </div>
            {error ? <div className="mt-3 text-sm text-red-200">{error}</div> : null}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="sc-panel-strong p-6">
          <div className="sc-kicker">REQUIREMENTS</div>
          <h2 className="mt-2 text-2xl font-black text-white">Eligibility check</h2>
          <div className="mt-5 space-y-3">
            {loading
              ? Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded-[24px] border border-white/10 bg-white/5" />)
              : requirements.map((item, index) => (
                  <div key={`${item}-${index}`} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 text-sm text-white/70">
                    <div className="font-semibold text-white">{item}</div>
                  </div>
                ))}
          </div>
        </div>

        <div className="sc-panel-strong p-6">
          <div className="sc-kicker">PERMANENT BONUSES</div>
          <h2 className="mt-2 text-2xl font-black text-white">What stays with you</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {bonuses.map((item, index) => (
              <div key={`${item}-${index}`} className="rounded-[24px] border border-[#7c3aed]/30 bg-[#7c3aed]/10 p-4 text-sm text-white/80">
                <div className="font-semibold text-white">{item}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="sc-panel-strong p-6">
          <div className="sc-kicker">THIS RESETS</div>
          <h2 className="mt-2 text-2xl font-black text-white">You will lose</h2>
          <div className="mt-5 space-y-3">
            {resets.map((item, index) => (
              <div key={`${item}-${index}`} className="rounded-[24px] border border-[#ff8d8d]/25 bg-[#ff8d8d]/8 p-4 text-sm text-white/75">
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="sc-panel-strong p-6">
          <div className="sc-kicker">THIS REMAINS</div>
          <h2 className="mt-2 text-2xl font-black text-white">You will keep</h2>
          <div className="mt-5 space-y-3">
            {keeps.map((item, index) => (
              <div key={`${item}-${index}`} className="rounded-[24px] border border-[#7ef0c5]/25 bg-[#7ef0c5]/8 p-4 text-sm text-white/75">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {result ? (
        <section className="sc-panel-strong p-6">
          <div className="sc-kicker">LAST RESULT</div>
          <h2 className="mt-2 text-2xl font-black text-white">Prestige recorded</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="sc-stat">
              <div className="sc-label">From</div>
              <div className="sc-value">{result?.fromPrestige ?? preview?.currentPrestigeLevel ?? 0}</div>
            </div>
            <div className="sc-stat">
              <div className="sc-label">To</div>
              <div className="sc-value">{result?.toPrestige ?? preview?.nextPrestigeLevel ?? 1}</div>
            </div>
            <div className="sc-stat">
              <div className="sc-label">Granted</div>
              <div className="sc-value">{result?.grantedBonusLabel ?? result?.bonus ?? preview?.projectedPermanentBonus ?? "Veteran bonus"}</div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
