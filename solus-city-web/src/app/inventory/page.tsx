"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { InventoryGrid } from "@/components/game/InventoryGrid";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { InventoryResponse } from "@/lib/gameApi";

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryResponse | null>(null);

  const fetchInventory = useCallback(async () => {
    const res = await api.get<InventoryResponse>("/inventory");
    setInventory(res.data);
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  if (!inventory) return <div className="flex min-h-dvh items-center justify-center"><LoadingSpinner size={32} /></div>;

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-white/10 bg-black/20 p-4">
        <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase">Inventory</p>
        <p className="text-[12px] text-[#888] mt-1">Manage equip, unequip, and consumable usage.</p>
        <p className="text-[10px] text-[#666] mt-2">Units stay passive. Slotted equipment now affects combat only when equipped.</p>
      </div>
      <InventoryGrid inventory={inventory} onRefresh={fetchInventory} />
    </div>
  );
}

