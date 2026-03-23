"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import { api } from "@/lib/api/client";
import { EquippedSlotCard } from "@/components/game/EquippedSlotCard";
import { HallOfFameList } from "@/components/game/HallOfFameList";
import { PerkTree } from "@/components/game/PerkTree";
import { PrestigePanel } from "@/components/game/PrestigePanel";
import { SeasonHistoryCard } from "@/components/game/SeasonHistoryCard";
import { SeasonRankCard } from "@/components/game/SeasonRankCard";
import { StatusBars } from "@/components/ui/StatusBars";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { HallOfFameEntry, InventoryResponse, MeResponse, PerksResponse } from "@/lib/gameApi";

function StatBox({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="min-w-0 rounded-md border border-white/10 bg-black/20 p-2 text-center">
      <p className="text-[8px] text-[#555] font-bold tracking-[2px] uppercase">{label}</p>
      <p className={`mt-0.5 break-words text-[13px] font-black leading-tight ${color ?? "text-[#eee]"}`}>{value}</p>
    </div>
  );
}

export default function ProfilePage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [perks, setPerks] = useState<PerksResponse | null>(null);
  const [hallOfFame, setHallOfFame] = useState<HallOfFameEntry[]>([]);
  const [inventory, setInventory] = useState<InventoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nameEdit, setNameEdit] = useState<string | null>(null);
  const [nameBusy, setNameBusy] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [meRes, perksRes, historyRes, inventoryRes] = await Promise.all([
        api.get<MeResponse>("/me"),
        api.get<PerksResponse>("/perks"),
        api.get<{ hallOfFameHighlights: HallOfFameEntry[] }>("/seasons/history"),
        api.get<InventoryResponse>("/inventory"),
      ]);
      setMe(meRes.data);
      setPerks(perksRes.data);
      setHallOfFame(historyRes.data.hallOfFameHighlights ?? []);
      setInventory(inventoryRes.data);
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

  const saveName = async () => {
    if (nameEdit === null || nameEdit.trim().length < 2) return;
    setNameBusy(true);
    try {
      await api.patch("/me", { name: nameEdit.trim() });
      await fetchData();
      setNameEdit(null);
    } catch {
      // keep editing open on failure
    } finally {
      setNameBusy(false);
    }
  };

  if (loading) return <div className="flex min-h-dvh items-center justify-center"><LoadingSpinner size={32} /></div>;
  if (!me || !perks) return <div className="flex min-h-dvh items-center justify-center text-[#ef5350]">{error ?? "Profile unavailable"}</div>;

  const equipmentBySlot = new Map(me.equipmentSummary.map((item) => [item.slot ?? "utility", item]));
  const shieldActive = me.shieldUntil && new Date(me.shieldUntil) > new Date();
  const crewRows = inventory ? [...inventory.utilities, ...inventory.general].filter((row) => {
    const category = row.item.category?.toLowerCase() ?? "";
    const subCategory = row.item.subCategory?.toLowerCase() ?? "";
    return category === "unit" || subCategory === "crew";
  }) : [];
  const crewCount = crewRows.reduce((sum, row) => sum + row.qty, 0);

  return (
    <div className="flex flex-col gap-4">
      <StatusBars profile={me} />

      <div className="rounded-lg border border-white/10 bg-black/20 p-4">
        <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase">Profile</p>
        <div className="flex items-center gap-2 mt-1">
          {nameEdit !== null ? (
            <>
              <input
                autoFocus
                value={nameEdit}
                onChange={(e) => setNameEdit(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveName()}
                className="flex-1 rounded border border-white/10 bg-black/20 px-2 py-1 text-[16px] font-black text-[#eee] outline-none"
              />
              <button onClick={saveName} disabled={nameBusy} className="text-[#66bb6a] disabled:opacity-40">
                <Check size={16} />
              </button>
              <button onClick={() => setNameEdit(null)} className="text-[#555]">
                <X size={16} />
              </button>
            </>
          ) : (
            <>
              <p className="text-[20px] font-black text-[#eee]">{me.name || "Unnamed Operator"}</p>
              <button onClick={() => setNameEdit(me.name ?? "")} className="text-[#555] hover:text-[#aaa]">
                <Pencil size={13} />
              </button>
            </>
          )}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 text-center sm:grid-cols-3">
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

      <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
        <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase">Stats</p>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          <StatBox label="ATK" value={me.ap} color="text-[#ef5350]" />
          <StatBox label="DEF" value={me.dp} color="text-[#42a5f5]" />
          <StatBox label="STR" value={me.strength} color="text-[#ff8a65]" />
          <StatBox label="SPD" value={me.speed} color="text-[#66bb6a]" />
          <StatBox label="DEF" value={me.defense} color="text-[#42a5f5]" />
          <StatBox label="DEX" value={me.dexterity} color="text-[#fdd835]" />
          <StatBox label="CASH" value={`$${Math.floor(me.cash).toLocaleString()}`} color="text-[#66bb6a]" />
          <StatBox label="$/HR" value={`$${Math.floor(me.incomePerHour).toLocaleString()}`} color="text-[#aaa]" />
        </div>
        <div className="flex flex-col gap-1 mt-2">
          {me.syndicate && (
            <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2">
              <span className="w-auto shrink-0 text-[9px] font-bold tracking-[2px] text-[#444] uppercase sm:w-[72px]">Syndicate</span>
              <span className="text-[10px] font-bold text-[#9945FF]">{me.syndicate.name}</span>
            </div>
          )}
          {shieldActive && (
            <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2">
              <span className="w-auto shrink-0 text-[9px] font-bold tracking-[2px] text-[#444] uppercase sm:w-[72px]">Shield</span>
              <span className="text-[10px] font-bold text-[#42a5f5]">Active</span>
            </div>
          )}
          {me.inHospital && (
            <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2">
              <span className="w-auto shrink-0 text-[9px] font-bold tracking-[2px] text-[#444] uppercase sm:w-[72px]">Status</span>
              <span className="text-[10px] font-bold text-[#ef5350]">Hospitalized</span>
            </div>
          )}
          {me.activeProtectionEffects.map((effect) => (
            <div key={effect.id} className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2">
              <span className="w-auto shrink-0 text-[9px] font-bold tracking-[2px] text-[#444] uppercase sm:w-[72px]">Active Effect</span>
              <span className="break-words text-[10px] font-bold text-[#fdd835]">{effect.type.replaceAll("_", " ")}</span>
            </div>
          ))}
        </div>
      </div>

      <SeasonRankCard season={me.currentSeason} />

      <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase">Force Readiness</p>
            <p className="text-[11px] text-[#888]">Crew sits in its own layer so assets and support gear stop reading like the same thing.</p>
          </div>
          <p className="text-[12px] font-black text-[#42a5f5]">{crewCount} crew</p>
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          <StatBox label="CREW" value={crewCount} color="text-[#42a5f5]" />
          <StatBox label="EQUIPPED" value={me.equipmentSummary.length} color="text-[#fdd835]" />
          <StatBox label="VAULT" value={`$${Math.floor(me.vaultCash).toLocaleString()}`} color="text-[#66bb6a]" />
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          {crewRows.length > 0 ? (
            crewRows.slice(0, 3).map((row) => (
              <div key={row.inventoryItemId} className="rounded-md border border-white/10 bg-black/20 p-3">
                <p className="text-[9px] text-[#555] font-bold tracking-[2px] uppercase">{row.item.subCategory ?? row.item.category ?? "crew"}</p>
                <p className="mt-1 text-[12px] font-bold text-[#eee]">{row.item.name}</p>
                <p className="mt-1 text-[10px] text-[#888]">Owned {row.qty}</p>
              </div>
            ))
          ) : (
            <div className="rounded-md border border-white/10 bg-black/20 p-3 text-[11px] text-[#666] md:col-span-3">No crew assets stored yet.</div>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <PrestigePanel prestigeLevel={me.prestigeLevel} prestigePoints={me.prestigePoints} preview={me.prestigeSummary} />
        <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
          <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase">Projected Rewards</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-md border border-white/10 bg-black/20 p-3">
              <p className="text-[9px] text-[#555] font-bold tracking-[2px]">OVERALL</p>
              <p className="text-[14px] font-black text-[#66bb6a]">{me.projectedSeasonRewards?.overall?.label ?? "-"}</p>
            </div>
            <div className="rounded-md border border-white/10 bg-black/20 p-3">
              <p className="text-[9px] text-[#555] font-bold tracking-[2px]">PVP</p>
              <p className="text-[14px] font-black text-[#42a5f5]">{me.projectedSeasonRewards?.pvp?.label ?? "-"}</p>
            </div>
            <div className="rounded-md border border-white/10 bg-black/20 p-3">
              <p className="text-[9px] text-[#555] font-bold tracking-[2px]">CRIME</p>
              <p className="text-[14px] font-black text-[#ff8a65]">{me.projectedSeasonRewards?.crime?.label ?? "-"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
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

      {me.seasonHistoryPreview && me.seasonHistoryPreview.length > 0 && (
        <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
          <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase">Recent Seasons</p>
          {me.seasonHistoryPreview.map((entry) => (
            <SeasonHistoryCard key={entry.season.id} entry={entry} />
          ))}
        </div>
      )}

      <HallOfFameList entries={hallOfFame} />

      <PerkTree data={{ ...perks, availablePoints: me.availablePerkPoints }} onUpdated={fetchData} />
    </div>
  );
}
