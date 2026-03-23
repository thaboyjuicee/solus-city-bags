"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api/client";
import { InventoryGrid } from "@/components/game/InventoryGrid";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { InventoryResponse, InventoryRow, MeResponse } from "@/lib/gameApi";
import { useSLSBalance } from "@/hooks/useSLSBalance";

function isCrewRow(row: InventoryRow) {
  const category = row.item.category?.toLowerCase() ?? "";
  const subCategory = row.item.subCategory?.toLowerCase() ?? "";
  return category === "unit" || subCategory === "crew";
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryResponse | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const slsBalance = useSLSBalance();

  const fetchInventory = useCallback(async () => {
    const [inventoryRes, meRes] = await Promise.all([api.get<InventoryResponse>("/inventory"), api.get<MeResponse>("/me")]);
    setInventory(inventoryRes.data);
    setMe(meRes.data);
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const crewCount = useMemo(() => (!inventory ? 0 : [...inventory.utilities, ...inventory.general].filter(isCrewRow).reduce((sum, row) => sum + row.qty, 0)), [inventory]);
  const equippedCount = inventory?.equipped.length ?? 0;

  if (!inventory) return <div className="flex min-h-dvh items-center justify-center"><LoadingSpinner size={32} /></div>;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-3 text-center">
          <p className="text-[9px] font-bold tracking-[2px] text-[#aab0a3] mb-1">CASH</p>
          <p className="text-sm font-black text-[#66bb6a]">${me ? Math.floor(me.cash).toLocaleString() : "-"}</p>
        </div>
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-3 text-center">
          <p className="text-[9px] font-bold tracking-[2px] text-[#aab0a3] mb-1">$SLS</p>
          <p className="text-sm font-black text-[#9945FF]">{slsBalance !== null ? slsBalance.toFixed(2) : "-"}</p>
        </div>
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-3 text-center">
          <p className="text-[9px] font-bold tracking-[2px] text-[#aab0a3] mb-1">CREW</p>
          <p className="text-sm font-black text-[#f2f4ec]">{crewCount}</p>
        </div>
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-3 text-center">
          <p className="text-[9px] font-bold tracking-[2px] text-[#aab0a3] mb-1">EQUIPPED</p>
          <p className="text-sm font-black text-[#42a5f5]">{equippedCount}</p>
        </div>
      </div>
      <div className="rounded-lg border border-white/10 bg-black/20 p-4">
        <p className="text-[10px] font-black tracking-[3px] text-[#aab0a3] uppercase">Inventory</p>
        <p className="text-[12px] text-[#d0d5ca] mt-1">Manage crew, equipable gear, and consumable usage without mixing people and tools together.</p>
        <p className="text-[10px] text-[#aab0a3] mt-2">Crew lives in its own section. Slotted equipment affects combat only when equipped.</p>
      </div>
      <InventoryGrid inventory={inventory} onRefresh={fetchInventory} />
    </div>
  );
}
