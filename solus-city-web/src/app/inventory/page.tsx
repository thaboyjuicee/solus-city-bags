"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { InventoryGrid } from "@/components/game/InventoryGrid";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { InventoryResponse, MeResponse } from "@/lib/gameApi";
import { useSLSBalance } from "@/hooks/useSLSBalance";

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

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-1.5">
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-3 text-center">
          <p className="text-[9px] font-bold tracking-[2px] text-[#555] mb-1">CASH</p>
          <p className="text-sm font-black text-[#66bb6a]">${me ? Math.floor(me.cash).toLocaleString() : "-"}</p>
        </div>
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-3 text-center">
          <p className="text-[9px] font-bold tracking-[2px] text-[#555] mb-1">$SLS</p>
          <p className="text-sm font-black text-[#9945FF]">{slsBalance !== null ? slsBalance.toFixed(2) : "-"}</p>
        </div>
      </div>
      <div className="rounded-lg border border-white/10 bg-black/20 p-4">
        <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase">Inventory</p>
        <p className="text-[12px] text-[#888] mt-1">Manage equip, unequip, and consumable usage.</p>
        <p className="text-[10px] text-[#666] mt-2">Units stay passive. Slotted equipment now affects combat only when equipped.</p>
      </div>
      <InventoryGrid inventory={inventory} onRefresh={fetchInventory} />
    </div>
  );
}
