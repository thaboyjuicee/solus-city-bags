"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Swords } from "lucide-react";
import { api } from "@/lib/api/client";
import { BATTLE_RESULT_KEY, BattleResult, formatHospitalMessage } from "@/lib/battle";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { StatusBars } from "@/components/ui/StatusBars";
import { MeResponse, TargetPreview } from "@/lib/gameApi";

const BAND_CLASS: Record<string, string> = {
  safe: "bg-[#66bb6a20] text-[#66bb6a]",
  favorable: "bg-[#42a5f520] text-[#42a5f5]",
  even: "bg-[#fdd83520] text-[#fdd835]",
  risky: "bg-[#ff980020] text-[#ff9800]",
  dangerous: "bg-[#ef535020] text-[#ef5350]",
  low: "bg-[#66bb6a20] text-[#66bb6a]",
  medium: "bg-[#42a5f520] text-[#42a5f5]",
  high: "bg-[#ff980020] text-[#ff9800]",
  jackpot: "bg-[#fdd83520] text-[#fdd835]",
  watched: "bg-[#fdd83520] text-[#fdd835]",
  wanted: "bg-[#ff980020] text-[#ff9800]",
  most_wanted: "bg-[#ef535020] text-[#ef5350]",
};

function bandClass(value: string) {
  return BAND_CLASS[value] ?? "bg-[#1e1e1e] text-[#aaa]";
}

export default function TargetsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<MeResponse | null>(null);
  const [targets, setTargets] = useState<TargetPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [attackState, setAttackState] = useState<Record<string, { attacking: boolean; error: string | null }>>({});

  const fetchData = useCallback(async () => {
    try {
      const [profileRes, targetsRes] = await Promise.all([
        api.get<MeResponse>("/me"),
        api.get<TargetPreview[]>("/targets"),
      ]);
      setProfile(profileRes.data);
      setTargets(targetsRes.data);
      setPageError(null);
    } catch (err: unknown) {
      setPageError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to load targets.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const attack = async (target: TargetPreview) => {
    if (!profile) return;
    if (profile.inHospital) {
      setAttackState((prev) => ({ ...prev, [target.id]: { attacking: false, error: formatHospitalMessage(profile.hospitalUntil ?? undefined) } }));
      return;
    }

    setAttackState((prev) => ({ ...prev, [target.id]: { attacking: true, error: null } }));
    try {
      const res = await api.post<BattleResult>("/battle/attack", { targetId: target.id, targetType: target.type });
      sessionStorage.setItem(BATTLE_RESULT_KEY, JSON.stringify({ ...res.data, opponent: { ...res.data.opponent, name: target.displayName } }));
      router.push("/battle-result");
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { error?: string; code?: string; recoverAt?: string } } })?.response?.data;
      setAttackState((prev) => ({
        ...prev,
        [target.id]: {
          attacking: false,
          error: data?.code === "IN_HOSPITAL" ? formatHospitalMessage(data.recoverAt) : data?.error ?? "Attack failed.",
        },
      }));
    }
  };

  if (loading) return <div className="flex min-h-dvh items-center justify-center"><LoadingSpinner size={32} /></div>;
  if (pageError || !profile) return <div className="flex min-h-dvh items-center justify-center text-[#ef5350]">{pageError ?? "Profile missing"}</div>;

  return (
    <div className="flex flex-col gap-3">
      <StatusBars profile={profile} />
      <div className="h-28 rounded-lg overflow-hidden border border-white/10 bg-black/20 backdrop-blur-sm flex items-end relative">
        <Image src="/assets/images/arena_banner.png" alt="Battle banner" fill className="object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        <div className="relative z-10 px-3 pb-3">
          <p className="text-[10px] font-black text-[#eee] tracking-[3px] uppercase">Targets</p>
          <p className="text-[11px] font-semibold text-text-dim">Bands stay visible, but anti-whale penalties now hide weak targets’ value.</p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {targets.map((target) => {
          const state = attackState[target.id];
          return (
            <div key={`${target.type}:${target.id}`} className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[14px] font-bold text-[#eee]">{target.displayName}</p>
                  <p className="text-[10px] text-[#555]">LV {target.level} • {target.rp} RP</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-[2px] ${target.type === "npc" ? "bg-[#14F19520] text-[#14F195]" : "bg-[#9945FF20] text-[#9945FF]"}`}>
                  {target.type.toUpperCase()}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-[2px] ${bandClass(target.winChanceBand)}`}>WIN · {target.winChanceBand.toUpperCase()}</span>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-[2px] ${bandClass(target.lootBand)}`}>LOOT · {target.lootBand.toUpperCase()}</span>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-[2px] ${bandClass(target.heatBand)}`}>HEAT · {target.heatBand.toUpperCase()}</span>
              </div>
              {target.recentlyFarmedPenalty && <p className="text-[10px] text-[#ff9800] font-bold">Repeat-target penalty likely active.</p>}
              {target.mismatchPenaltyApplied && <p className="text-[10px] text-[#ef5350] font-bold">Very weak target. Rewards likely dampened.</p>}
              <button onClick={() => attack(target)} disabled={!!state?.attacking || profile.inHospital} className="w-full py-2.5 rounded border border-[#7f1919] bg-black/20 text-[#ef5350] text-[11px] font-bold tracking-[2px] flex items-center justify-center gap-1.5 disabled:opacity-40">
                {state?.attacking ? <LoadingSpinner size={16} color="#ef5350" /> : <><Swords size={14} /> ATTACK</>}
              </button>
              {state?.error && <p className="text-[10px] font-bold text-[#ef5350]">{state.error}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
