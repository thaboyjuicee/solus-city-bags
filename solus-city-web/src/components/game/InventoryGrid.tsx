"use client";

import { api } from "@/lib/api/client";
import { InventoryResponse, InventoryRow } from "@/lib/gameApi";
import { RarityBadge } from "./RarityBadge";

function ItemCard({
  row,
  onRefresh,
}: {
  row: InventoryRow;
  onRefresh: () => Promise<void> | void;
}) {
  const run = async (path: string) => {
    await api.post(path, { inventoryItemId: row.inventoryItemId });
    await onRefresh();
  };

  return (
    <div className="rounded-md border border-white/10 bg-black/20 p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[12px] font-bold text-[#eee]">{row.item.name}</p>
          <p className="text-[10px] text-[#888]">x{row.qty} {row.item.slot ? `• ${row.item.slot}` : ""}</p>
        </div>
        <RarityBadge rarity={row.item.rarity} />
      </div>
      <p className="text-[10px] text-[#666]">{row.item.description}</p>
      <div className="flex gap-2 flex-wrap">
        {row.item.slot && !row.equipped && (
          <button onClick={() => run("/inventory/equip")} className="px-2 py-1 rounded border border-white/10 text-[10px] text-[#42a5f5]">Equip</button>
        )}
        {row.equipped && (
          <button onClick={() => run("/inventory/unequip")} className="px-2 py-1 rounded border border-white/10 text-[10px] text-[#ff9800]">Unequip</button>
        )}
        {(row.item.consumable || row.item.effectType) && (
          <button onClick={() => run("/inventory/use")} className="px-2 py-1 rounded border border-white/10 text-[10px] text-[#66bb6a]">Use</button>
        )}
      </div>
    </div>
  );
}

export function InventoryGrid({
  inventory,
  onRefresh,
}: {
  inventory: InventoryResponse;
  onRefresh: () => Promise<void> | void;
}) {
  const groups: Array<{ title: string; rows: InventoryRow[] }> = [
    { title: "Equipped", rows: inventory.equipped },
    { title: "Consumables", rows: inventory.consumables },
    { title: "Utilities", rows: inventory.utilities },
    { title: "Contraband", rows: inventory.contraband },
    { title: "Protection", rows: inventory.protection },
    { title: "General", rows: inventory.general },
  ];

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <div key={group.title} className="flex flex-col gap-2">
          <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase">{group.title}</p>
          {group.rows.length === 0 ? (
            <div className="rounded-md border border-white/10 bg-black/20 p-3 text-[11px] text-[#666]">Nothing here yet.</div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {group.rows.map((row) => (
                <ItemCard key={row.inventoryItemId} row={row} onRefresh={onRefresh} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
