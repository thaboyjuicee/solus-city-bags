"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
    const [inventoryRes, meRes] = await Promise.all([api.get<InventoryResponse>("/inventory"), api.get<MeResponse>("/me")]);
    setInventory(inventoryRes.data);
    setMe(meRes.data);
  }, []);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);

  const totalItems = useMemo(() => {
    if (!inventory) return 0;
    return [...inventory.equipped, ...inventory.consumables, ...inventory.utilities, ...inventory.contraband, ...inventory.protection, ...inventory.general].reduce((sum, row) => sum + row.qty, 0);
  }, [inventory]);

  if (!inventory) return <div className="flex min-h-[60vh] items-center justify-center"><LoadingSpinner size={32} /></div>;

  return <div className="space-y-4"><div className="flex items-start justify-between gap-4"><div><p className="sc-page-title">Inventory</p><p className="sc-subtitle mt-2">Your gear and consumables</p></div><div className="text-right"><p className="sc-kicker">Equipped</p><p className="mt-2 text-[24px] font-black text-[#9f64ff]">{inventory.equipped.length}/3</p></div></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div className="sc-stat"><p className="sc-label">Wallet</p><p className="mt-3 text-[24px] font-black text-[#36d47f]">${Math.floor(me?.cash ?? 0).toLocaleString()}</p></div><div className="sc-stat"><p className="sc-label">SLS</p><p className="mt-3 text-[24px] font-black text-[#9f64ff]">{slsBalance !== null ? slsBalance.toFixed(2) : "-"}</p></div><div className="sc-stat"><p className="sc-label">Items</p><p className="mt-3 text-[24px] font-black text-[#f4f5fb]">{totalItems}</p></div><div className="sc-stat"><p className="sc-label">Protection</p><p className="mt-3 text-[24px] font-black text-[#ff9d32]">{inventory.protection.length}</p></div></div><div className="sc-panel p-4 text-[12px] text-[#7a7f95]">Units stay passive. Slotted equipment affects combat only when equipped.</div><InventoryGrid inventory={inventory} onRefresh={fetchInventory} /></div>;
}