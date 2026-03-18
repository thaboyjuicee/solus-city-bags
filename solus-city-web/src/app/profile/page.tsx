"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api/client";
import { StatusBars, type ProfileStats } from "@/components/ui/StatusBars";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StatBreakdown {
  itemBonuses?: { atk: number; def: number; speed: number; dex: number };
}

interface SyndicateInfo {
  id: string;
  name: string;
  role: string;
  buffType: string;
  buffValue: number;
}

type PageProfile = ProfileStats & {
  wallet: string;
  strength: number;
  speed: number;
  defense: number;
  dexterity: number;
  inHospital: boolean;
  hospitalUntil: string | null;
  shieldUntil: string | null;
  nextEnergyAt: string | null;
  nextNerveAt: string | null;
  nextHappinessAt: string | null;
  incomePerHour: number;
  statBreakdown: StatBreakdown | null;
  syndicate: SyndicateInfo | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timerValue(ts?: string | null): string {
  if (!ts) return "Full";
  const t = new Date(ts);
  if (Number.isNaN(t.getTime()) || t.getTime() <= Date.now()) return "Full";
  return t.toLocaleTimeString();
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-black tracking-[3px] uppercase text-text-dim mb-2.5">
      {children}
    </p>
  );
}

function StatRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[12px] text-text-dim">{label}</span>
      <span className="text-[13px] font-bold" style={{ color: color ?? "#eee" }}>
        {value}
      </span>
    </div>
  );
}

function AnimatedBar({
  current,
  max,
  color,
}: {
  current: number;
  max: number;
  color: string;
}) {
  const fillRef = useRef<HTMLDivElement>(null);
  const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0;

  useEffect(() => {
    const el = fillRef.current;
    if (!el) return;
    el.style.transition = "none";
    el.style.width = "0%";
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        el.style.transition = "width 600ms ease";
        el.style.width = `${pct}%`;
      })
    );
    return () => cancelAnimationFrame(id);
  }, [pct]);

  return (
    <div className="h-1.5 bg-[#1e1e1e] rounded-full overflow-hidden">
      <div
        ref={fillRef}
        className="h-full rounded-full"
        style={{ backgroundColor: color, width: "0%" }}
      />
    </div>
  );
}

function StatBar({
  label,
  current,
  max,
  color,
}: {
  label: string;
  current: number;
  max: number;
  color: string;
}) {
  return (
    <div className="mb-2.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-text-dim">{label}</span>
        <span className="text-[11px] font-bold" style={{ color }}>
          {current} / {max}
        </span>
      </div>
      <AnimatedBar current={current} max={max} color={color} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProfilePage() {
  const [profile, setProfile] = useState<PageProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState("");

  const fetchData = useCallback(async () => {
    setPageError(null);
    try {
      const res = await api.get<PageProfile>("/me");
      setProfile(res.data);
      setNameDraft((prev) => (editingName ? prev : res.data.name));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to load profile.";
      setPageError(msg);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveName = async () => {
    const next = nameDraft.trim();
    if (next.length < 3) {
      setNameError("Name must be at least 3 characters");
      return;
    }
    if (next.length > 20) {
      setNameError("Name cannot be longer than 20 characters");
      return;
    }
    if (next === profile?.name) {
      setEditingName(false);
      return;
    }

    setSavingName(true);
    setNameError("");
    try {
      const res = await api.patch<{ name: string }>("/me", { name: next });
      setProfile((prev) => (prev ? { ...prev, name: res.data.name } : prev));
      setEditingName(false);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Could not update name.";
      setNameError(msg);
    } finally {
      setSavingName(false);
    }
  };

  const cancelEdit = () => {
    setEditingName(false);
    setNameDraft(profile?.name ?? "");
    setNameError("");
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
  // Error
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

  if (!profile) return null;

  const xpNeeded = profile.level * 100;
  const xpPct = Math.round((profile.xp / xpNeeded) * 100);
  const shortWallet = profile.wallet.slice(0, 6) + "..." + profile.wallet.slice(-4);

  const nerveStatus = profile.nerve >= profile.maxNerve ? "Full" : timerValue(profile.nextNerveAt);
  const energyStatus = profile.energy >= profile.maxEnergy ? "Full" : timerValue(profile.nextEnergyAt);
  const hospitalStatus = timerValue(profile.hospitalUntil);
  const shieldActive = !!(profile.shieldUntil && new Date(profile.shieldUntil).getTime() > Date.now());
  const shieldStatus = shieldActive ? timerValue(profile.shieldUntil) : "None";

  const nerveStatusColor = profile.nerve >= profile.maxNerve ? "#14F195" : "#1e88e5";
  const energyStatusColor = profile.energy >= profile.maxEnergy ? "#14F195" : "#66bb6a";

  const canSave = nameDraft.trim().length >= 3 && nameDraft.trim().length <= 20;

  return (
    <div className="flex flex-col bg-background min-h-dvh">
      <StatusBars profile={profile} />

      <div className="max-w-2xl w-full mx-auto px-3 py-3 flex flex-col gap-3">

        {/* Identity */}
        <div className="bg-[#141414] border border-[#1e1e1e] rounded-lg p-3.5">
          <SectionTitle>Identity</SectionTitle>

          {/* Name row */}
          <div className="flex items-center justify-between py-1.5">
            <span className="text-[12px] text-text-dim">Name</span>
            {!editingName ? (
              <span className="text-[13px] font-bold text-[#eee]">{profile.name}</span>
            ) : (
              <input
                type="text"
                value={nameDraft}
                onChange={(e) => { setNameDraft(e.target.value); setNameError(""); }}
                maxLength={20}
                placeholder="Enter new name"
                className="bg-[#111] border border-[#1e1e1e] rounded text-[#eee] text-[13px] font-bold px-2 py-1 text-right focus:outline-none focus:border-accent"
                style={{ width: 150 }}
              />
            )}
          </div>

          {nameError && (
            <p className="text-[#ef5350] text-[11px] mb-1">{nameError}</p>
          )}

          <StatRow label="Level" value={profile.level} color="#9945FF" />
          <StatRow
            label="XP"
            value={`${profile.xp} / ${xpNeeded}  (${xpPct}%)`}
            color="#fdd835"
          />
          <StatRow label="Wallet" value={shortWallet} color="#555" />
          <StatRow label="Rank Points" value={profile.rp.toLocaleString()} color="#14F195" />

          {/* Name edit actions */}
          <div className="flex justify-center mt-2 gap-2">
            {!editingName ? (
              <button
                onClick={() => { setNameDraft(profile.name); setNameError(""); setEditingName(true); }}
                className="border border-[rgba(20,241,149,0.35)] rounded px-3 py-1.5 bg-[#111] text-[#14F195] text-[10px] font-black tracking-[1px]"
              >
                EDIT
              </button>
            ) : (
              <>
                <button
                  onClick={saveName}
                  disabled={savingName || !canSave}
                  className="border border-[rgba(102,187,106,0.45)] rounded px-3 py-1.5 bg-[#1a241a] text-[#66bb6a] text-[10px] font-black tracking-[1px] disabled:opacity-40"
                >
                  {savingName ? "SAVING…" : "SAVE"}
                </button>
                <button
                  onClick={cancelEdit}
                  disabled={savingName}
                  className="border border-[#2d2d2d] rounded px-3 py-1.5 bg-[#111] text-[#555] text-[10px] font-black tracking-[1px]"
                >
                  CANCEL
                </button>
              </>
            )}
          </div>
        </div>

        {/* Status bars */}
        <div className="bg-[#141414] border border-[#1e1e1e] rounded-lg p-3.5">
          <SectionTitle>Status</SectionTitle>
          <StatBar label="Health"    current={profile.health}    max={profile.maxHealth}    color="#e53935" />
          <StatBar label="Energy"    current={profile.energy}    max={profile.maxEnergy}    color="#43a047" />
          <StatBar label="Nerve"     current={profile.nerve}     max={profile.maxNerve}     color="#1e88e5" />
          <StatBar label="Happiness" current={profile.happiness} max={profile.maxHappiness} color="#fdd835" />
        </div>

        {/* Economy */}
        <div className="bg-[#141414] border border-[#1e1e1e] rounded-lg p-3.5">
          <SectionTitle>Economy</SectionTitle>
          <StatRow label="Cash"       value={`$${Math.floor(profile.cash).toLocaleString()}`} color="#66bb6a" />
          <StatRow label="Income/hr"  value={`$${profile.incomePerHour.toLocaleString()}`}    color="#66bb6a" />
        </div>

        {/* Combat */}
        <div className="bg-[#141414] border border-[#1e1e1e] rounded-lg p-3.5">
          <SectionTitle>Combat</SectionTitle>
          <StatRow label="Attack Power"   value={profile.ap} color="#ef5350" />
          <StatRow label="Defense Power"  value={profile.dp} color="#1e88e5" />
          {profile.statBreakdown?.itemBonuses && (
            <>
              <StatRow label="Item ATK Bonus" value={profile.statBreakdown.itemBonuses.atk}   color="#ef5350" />
              <StatRow label="Item DEF Bonus" value={profile.statBreakdown.itemBonuses.def}   color="#1e88e5" />
              <StatRow label="Item SPD Bonus" value={profile.statBreakdown.itemBonuses.speed} color="#9945FF" />
              <StatRow label="Item DEX Bonus" value={profile.statBreakdown.itemBonuses.dex}   color="#fdd835" />
            </>
          )}
          <div className="border-t border-[#1e1e1e] my-1.5" />
          <StatRow label="Strength"  value={profile.strength}  color="#ff9800" />
          <StatRow label="Speed"     value={profile.speed}     color="#ab47bc" />
          <StatRow label="Defense"   value={profile.defense}   color="#26c6da" />
          <StatRow label="Dexterity" value={profile.dexterity} color="#fdd835" />
        </div>

        {/* Syndicate */}
        <div className="bg-[#141414] border border-[#1e1e1e] rounded-lg p-3.5">
          <SectionTitle>Syndicate</SectionTitle>
          {profile.syndicate ? (
            <>
              <StatRow label="Name" value={profile.syndicate.name}                                                             color="#14F195" />
              <StatRow label="Role" value={profile.syndicate.role.toUpperCase()}                                               color="#9945FF" />
              <StatRow label="Buff" value={`+${Math.round(profile.syndicate.buffValue * 100)}% ${profile.syndicate.buffType.toUpperCase()}`} color="#66bb6a" />
            </>
          ) : (
            <p className="text-[12px] text-[#555]">Not in a syndicate yet.</p>
          )}
        </div>

        {/* Timers */}
        <div className="bg-[#141414] border border-[#1e1e1e] rounded-lg p-3.5">
          <SectionTitle>Timers</SectionTitle>
          {hospitalStatus !== "Full" && (
            <StatRow label="Hospital Until" value={hospitalStatus} color="#ef5350" />
          )}
          <StatRow label="Shield Until" value={shieldStatus}   color={shieldActive ? "#1e88e5" : "#14F195"} />
          <StatRow label="Next Energy"   value={energyStatus}  color={energyStatusColor} />
          <StatRow label="Next Nerve"    value={nerveStatus}   color={nerveStatusColor} />
        </div>

        <div className="h-16 md:hidden" />
      </div>
    </div>
  );
}
