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

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const totals = useMemo(() => {
    if (!inventory) return { items: 0, protection: 0, consumables: 0, crew: 0 };
    const crewRows = inventory.general.filter(
      (row) => row.item.category?.toLowerCase() === "unit" || row.item.subCategory?.toLowerCase() === "crew",
    );
    return {
      items: [...inventory.equipped, ...inventory.consumables, ...inventory.utilities, ...inventory.contraband, ...inventory.protection, ...inventory.general].reduce((sum, row) => sum + row.qty, 0),
      protection: inventory.protection.length,
      consumables: inventory.consumables.length,
      crew: crewRows.reduce((sum, row) => sum + row.qty, 0),
    };
  }, [inventory]);

  if (!inventory) {
    return <div className="flex min-h-[60vh] items-center justify-center"><LoadingSpinner size={32} /></div>;
  }

  return (
    <div className="space-y-6 pb-12">
      <section className="sc-panel-strong overflow-hidden p-6 md:p-7">
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="sc-kicker">INVENTORY</span>
              <span className="sc-chip sc-chip-purple">organized storage</span>
            </div>
            <div>
              <h1 className="sc-page-title">Know what you own and what is active</h1>
              <p className="sc-subtitle max-w-3xl">
                Crew, equipment, consumables, protection, and contraband are now separated so each group reads like its own gameplay system instead of a generic pile.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <div className="sc-stat"><div className="sc-label">Wallet</div><div className="sc-value">${Math.floor(me?.cash ?? 0).toLocaleString()}</div></div>
              <div className="sc-stat"><div className="sc-label">Vault</div><div className="sc-value">${Math.floor(me?.vaultCash ?? 0).toLocaleString()}</div></div>
              <div className="sc-stat"><div className="sc-label">$SLS</div><div className="sc-value">{slsBalance !== null ? slsBalance.toFixed(2) : "-"}</div></div>
              <div className="sc-stat"><div className="sc-label">Total items</div><div className="sc-value">{totals.items}</div></div>
            </div>
          </div>

          <div className="sc-panel p-5">
            <div className="sc-kicker">INVENTORY NOTES</div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4"><div className="sc-label">Crew</div><div className="mt-2 text-lg font-black text-[#7ea8ff]">{totals.crew}</div></div>
              <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4"><div className="sc-label">Consumables</div><div className="mt-2 text-lg font-black text-[#ffd36b]">{totals.consumables}</div></div>
              <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4"><div className="sc-label">Protection</div><div className="mt-2 text-lg font-black text-[#ff9d6b]">{totals.protection}</div></div>
              <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4"><div className="sc-label">Rule</div><div className="mt-2 text-sm leading-6 text-white/60">Crew lives in its own section. Slotted equipment affects combat only when equipped.</div></div>
            </div>
          </div>
        </div>
      </section>

      <InventoryGrid inventory={inventory} onRefresh={fetchInventory} />
    </div>
  );
}
