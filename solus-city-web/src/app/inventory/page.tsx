"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { InventoryGrid } from "@/components/game/InventoryGrid";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { StatusBars } from "@/components/ui/StatusBars";
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
    const [inventoryRes, meRes] = await Promise.all([
      api.get<InventoryResponse>("/inventory"),
      api.get<MeResponse>("/me"),
    ]);
    setInventory(inventoryRes.data);
    setMe(meRes.data);
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  if (!inventory) return <div className="flex min-h-dvh items-center justify-center"><LoadingSpinner size={32} /></div>;

  const crewCount = [...inventory.utilities, ...inventory.general].filter(isCrewRow).reduce((sum, row) => sum + row.qty, 0);
  const equippedCount = inventory.equipped.length;

  return (
    <div className="flex flex-col gap-3">
      {me ? <StatusBars profile={me} /> : null}
      <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
        <div className="min-w-0 rounded-md border border-white/10 bg-black/20 p-3 text-center backdrop-blur-sm">
          <p className="text-[9px] font-bold tracking-[2px] text-[#555] mb-1">CASH</p>
          <p className="break-all text-[11px] font-black text-[#66bb6a] sm:text-sm">${me ? Math.floor(me.cash).toLocaleString() : "-"}</p>
        </div>
        <div className="min-w-0 rounded-md border border-white/10 bg-black/20 p-3 text-center backdrop-blur-sm">
          <p className="text-[9px] font-bold tracking-[2px] text-[#555] mb-1">$SLS</p>
          <p className="break-all text-[11px] font-black text-[#9945FF] sm:text-sm">{slsBalance !== null ? slsBalance.toFixed(2) : "-"}</p>
        </div>
        <div className="min-w-0 rounded-md border border-white/10 bg-black/20 p-3 text-center backdrop-blur-sm">
          <p className="text-[9px] font-bold tracking-[2px] text-[#555] mb-1">CREW</p>
          <p className="break-all text-[11px] font-black text-[#42a5f5] sm:text-sm">{crewCount}</p>
        </div>
        <div className="min-w-0 rounded-md border border-white/10 bg-black/20 p-3 text-center backdrop-blur-sm">
          <p className="text-[9px] font-bold tracking-[2px] text-[#555] mb-1">EQUIPPED</p>
          <p className="break-all text-[11px] font-black text-[#fdd835] sm:text-sm">{equippedCount}</p>
        </div>
      </div>
      <div className="rounded-lg border border-white/10 bg-black/20 p-4">
        <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase">Inventory</p>
        <p className="text-[12px] text-[#888] mt-1">Manage equip, unequip, and consumable usage without mixing people and gear together.</p>
        <p className="text-[10px] text-[#666] mt-2">Crew is shown in its own section. Slotted equipment affects combat only when equipped. Activatable gadgets can be triggered directly from inventory.</p>
      </div>
      <InventoryGrid inventory={inventory} onRefresh={fetchInventory} />
    </div>
  );
}
