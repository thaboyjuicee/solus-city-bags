"use client";

import { useMemo, useState } from "react";
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
    <div className="sc-panel p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[16px] font-black text-[#f3f4fa]">{row.item.name}</p>
          <p className="mt-1 text-[11px] text-[#6f7386]">
            x{row.qty} {row.item.slot ? `· ${row.item.slot}` : ""} {row.equipped ? "· equipped" : ""}
          </p>
        </div>
        <RarityBadge rarity={row.item.rarity} />
      </div>
      <p className="text-[12px] text-[#7d8196]">{row.item.description}</p>
      <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.12em]">
        {row.item.effectType ? <span className="sc-chip sc-chip-green">{row.item.effectType.replaceAll("_", " ")}</span> : null}
        {row.item.slot ? <span className="sc-chip">{row.item.slot}</span> : null}
        {row.expiresAt ? <span className="sc-chip sc-chip-orange">Timed</span> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {row.item.slot && !row.equipped ? (
          <button onClick={() => run("/inventory/equip")} className="sc-button sc-button-primary px-3 py-2">Equip</button>
        ) : null}
        {row.equipped ? (
          <button onClick={() => run("/inventory/unequip")} className="sc-button sc-button-orange px-3 py-2">Unequip</button>
        ) : null}
        {row.item.consumable || row.item.effectType ? (
          <button onClick={() => run("/inventory/use")} className="sc-button sc-button-green px-3 py-2">Use</button>
        ) : null}
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

  const [active, setActive] = useState<string>("Equipped");
  const activeGroup = useMemo(() => groups.find((group) => group.title === active) ?? groups[0], [active, groups]);
  const activeLoadout = inventory.equipped.slice(0, 3);

  return (
    <div className="flex flex-col gap-4">
      <div className="sc-panel p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="sc-kicker">Active Loadout</p>
            <p className="mt-2 text-[22px] font-black text-[#f4f5fb]">Operational Gear</p>
          </div>
          <p className="text-[12px] font-black tracking-[0.18em] text-[#9f64ff] uppercase">{inventory.equipped.length}/3</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {activeLoadout.length === 0 ? (
            <span className="sc-chip">No gear equipped</span>
          ) : (
            activeLoadout.map((row) => (
              <div key={row.inventoryItemId} className="rounded-xl border border-[rgba(153,69,255,0.2)] bg-[rgba(153,69,255,0.08)] px-3 py-2">
                <p className="text-[12px] font-black text-[#f2f3fa]">{row.item.name}</p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#6f7386]">{row.item.slot ?? "utility"}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-white/8 pb-3">
        {groups.map((group) => (
          <button
            key={group.title}
            type="button"
            onClick={() => setActive(group.title)}
            className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] ${
              active === group.title ? "bg-[rgba(153,69,255,0.14)] text-[#9f64ff]" : "text-[#5f6377]"
            }`}
          >
            {group.title} ({group.rows.length})
          </button>
        ))}
      </div>

      {activeGroup.rows.length === 0 ? (
        <div className="sc-panel p-4 text-[12px] text-[#6b7086]">Nothing here yet.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {activeGroup.rows.map((row) => (
            <ItemCard key={row.inventoryItemId} row={row} onRefresh={onRefresh} />
          ))}
        </div>
      )}
    </div>
  );
}