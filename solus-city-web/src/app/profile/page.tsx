"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { EquippedSlotCard } from "@/components/game/EquippedSlotCard";
import { PerkTree } from "@/components/game/PerkTree";
import { SeasonRankCard } from "@/components/game/SeasonRankCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { MeResponse, PerksResponse } from "@/lib/gameApi";

export default function ProfilePage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [perks, setPerks] = useState<PerksResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [meRes, perksRes] = await Promise.all([
        api.get<MeResponse>("/me"),
        api.get<PerksResponse>("/perks"),
      ]);
      setMe(meRes.data);
      setPerks(perksRes.data);
      setError(null);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <div className="flex min-h-dvh items-center justify-center"><LoadingSpinner size={32} /></div>;
  if (!me || !perks) return <div className="flex min-h-dvh items-center justify-center text-[#ef5350]">{error ?? "Profile unavailable"}</div>;

  const equipmentBySlot = new Map(me.equipmentSummary.map((item) => [item.slot ?? "utility", item]));

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-white/10 bg-black/20 p-4">
        <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase">Profile Progression</p>
        <p className="text-[20px] font-black text-[#eee] mt-1">{me.name || "Unnamed Operator"}</p>
        <div className="grid grid-cols-3 gap-2 mt-3 text-center">
          <div className="rounded-md border border-white/10 bg-black/20 p-3">
            <p className="text-[9px] text-[#555] font-bold tracking-[2px]">LEVEL</p>
            <p className="text-[16px] font-black text-[#42a5f5]">{me.level}</p>
          </div>
          <div className="rounded-md border border-white/10 bg-black/20 p-3">
            <p className="text-[9px] text-[#555] font-bold tracking-[2px]">SEASON</p>
            <p className="text-[16px] font-black text-[#66bb6a]">{me.seasonScore}</p>
          </div>
          <div className="rounded-md border border-white/10 bg-black/20 p-3">
            <p className="text-[9px] text-[#555] font-bold tracking-[2px]">PRESTIGE</p>
            <p className="text-[16px] font-black text-[#fdd835]">{me.prestigeLevel}</p>
          </div>
        </div>
      </div>

      <SeasonRankCard season={me.currentSeason} />

      <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase">Equipment</p>
            <p className="text-[11px] text-[#888]">Current visible loadout summary.</p>
          </div>
          <p className="text-[12px] font-black text-[#9945FF]">{me.equipmentSummary.length} equipped</p>
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          <EquippedSlotCard slot="weapon" name={equipmentBySlot.get("weapon")?.name} rarity={equipmentBySlot.get("weapon")?.rarity} />
          <EquippedSlotCard slot="armor" name={equipmentBySlot.get("armor")?.name} rarity={equipmentBySlot.get("armor")?.rarity} />
          <EquippedSlotCard slot="utility" name={equipmentBySlot.get("utility")?.name} rarity={equipmentBySlot.get("utility")?.rarity} />
        </div>
      </div>

      <PerkTree data={{ ...perks, availablePoints: me.availablePerkPoints }} onUpdated={fetchData} />
    </div>
  );
}
