"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/api/client";
import { InventoryResponse, InventoryRow } from "@/lib/gameApi";
import { RarityBadge } from "./RarityBadge";

type GroupKey = "equipped" | "crew" | "consumables" | "utilities" | "contraband" | "protection" | "general";

const GROUP_META: Record<GroupKey, { title: string; description: string }> = {
  equipped: {
    title: "Equipped",
    description: "Combat-active slotted gear that is affecting your build now.",
  },
  crew: {
    title: "Crew",
    description: "People and unit assets you own. They are not utility gear and should read separately.",
  },
  consumables: {
    title: "Consumables",
    description: "Use-now recovery and support items with clear one-shot value.",
  },
  utilities: {
    title: "Utilities",
    description: "Non-weapon support pieces, intel tools, and passive tactical gear.",
  },
  contraband: {
    title: "Contraband",
    description: "Risky inventory that ties more directly into heat and black-market play.",
  },
  protection: {
    title: "Protection",
    description: "Items and effects that help reduce exposure, loot loss, or pressure.",
  },
  general: {
    title: "General",
    description: "Everything else that does not fit the more specialized inventory channels.",
  },
};

function buildGroups(inventory: InventoryResponse) {
  const crewRows = inventory.general.filter((row) => {
    const category = String(row.item.category ?? "").toLowerCase();
    const subCategory = String(row.item.subCategory ?? "").toLowerCase();
    return category === "unit" || subCategory === "crew";
  });
  const generalRows = inventory.general.filter((row) => {
    const category = String(row.item.category ?? "").toLowerCase();
    const subCategory = String(row.item.subCategory ?? "").toLowerCase();
    return !(category === "unit" || subCategory === "crew");
  });

  return [
    { key: "equipped" as const, rows: inventory.equipped },
    { key: "crew" as const, rows: crewRows },
    { key: "consumables" as const, rows: inventory.consumables },
    { key: "utilities" as const, rows: inventory.utilities },
    { key: "contraband" as const, rows: inventory.contraband },
    { key: "protection" as const, rows: inventory.protection },
    { key: "general" as const, rows: generalRows },
  ];
}

function summarizeRow(row: InventoryRow) {
  const parts = [
    row.item.slot ? `${row.item.slot} slot` : null,
    row.item.effectType ? row.item.effectType.replaceAll("_", " ") : null,
    row.durability != null ? `durability ${row.durability}` : null,
  ].filter(Boolean) as string[];
  return parts.length ? parts : [row.item.category ?? "item"];
}

function ItemCard({ row, onRefresh }: { row: InventoryRow; onRefresh: () => Promise<void> | void }) {
  const run = async (path: string) => {
    await api.post(path, { inventoryItemId: row.inventoryItemId });
    await onRefresh();
  };

  return (
    <div className="sc-panel-strong p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="sc-kicker">{row.item.subCategory ?? row.item.category ?? "item"}</div>
          <h3 className="mt-2 text-xl font-black text-white">{row.item.name}</h3>
          <p className="mt-1 text-xs text-white/45">Quantity {row.qty}{row.equipped ? " / equipped" : ""}</p>
        </div>
        <RarityBadge rarity={row.item.rarity} />
      </div>

      <p className="text-sm leading-6 text-white/60">{row.item.description}</p>

      <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.12em]">
        {summarizeRow(row).map((label) => (
          <span key={label} className="sc-chip">{label}</span>
        ))}
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

export function InventoryGrid({ inventory, onRefresh }: { inventory: InventoryResponse; onRefresh: () => Promise<void> | void }) {
  const groups = buildGroups(inventory);
  const [active, setActive] = useState<GroupKey>("equipped");
  const activeGroup = useMemo(() => groups.find((group) => group.key === active) ?? groups[0], [active, groups]);
  const activeLoadout = inventory.equipped.slice(0, 3);
  const crewCount = useMemo(
    () => groups.find((group) => group.key === "crew")?.rows.reduce((sum, row) => sum + row.qty, 0) ?? 0,
    [groups],
  );
  const totalStacks = useMemo(() => groups.reduce((sum, group) => sum + group.rows.length, 0), [groups]);

  return (
    <div className="space-y-5">
      <div className="sc-panel-strong p-5">
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="sc-kicker">ACTIVE LOADOUT</div>
            <h2 className="mt-2 text-2xl font-black text-white">Operational gear</h2>
            <p className="mt-2 text-sm leading-6 text-white/60">
              Equipped gear is separated from the rest of your storage so it is always obvious what is affecting combat right now.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sc-stat"><div className="sc-label">Equipped</div><div className="sc-value">{inventory.equipped.length}</div></div>
            <div className="sc-stat"><div className="sc-label">Crew</div><div className="sc-value">{crewCount}</div></div>
            <div className="sc-stat"><div className="sc-label">Stacks</div><div className="sc-value">{totalStacks}</div></div>
            <div className="sc-stat"><div className="sc-label">Timed items</div><div className="sc-value">{groups.reduce((sum, group) => sum + group.rows.filter((row) => !!row.expiresAt).length, 0)}</div></div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          {activeLoadout.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-white/12 bg-white/[0.03] px-4 py-3 text-sm text-white/50">No gear equipped.</div>
          ) : (
            activeLoadout.map((row) => (
              <div key={row.inventoryItemId} className="rounded-[24px] border border-[rgba(153,69,255,0.25)] bg-[rgba(153,69,255,0.08)] px-4 py-3">
                <p className="text-sm font-black text-white">{row.item.name}</p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/45">{row.item.slot ?? "utility"}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {groups.map((group) => (
          <button key={group.key} type="button" onClick={() => setActive(group.key)} className={active === group.key ? "sc-button sc-button-primary" : "sc-button"}>
            {GROUP_META[group.key].title} ({group.rows.length})
          </button>
        ))}
      </div>

      <section className="sc-panel p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="sc-kicker">{GROUP_META[activeGroup.key].title}</div>
            <h3 className="mt-2 text-xl font-black text-white">{activeGroup.rows.length} entries</h3>
          </div>
        </div>
        <p className="mt-3 text-sm leading-6 text-white/60">{GROUP_META[activeGroup.key].description}</p>
      </section>

      {activeGroup.rows.length === 0 ? (
        <div className="sc-panel p-5 text-sm text-white/55">Nothing here yet.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {activeGroup.rows.map((row) => (
            <ItemCard key={row.inventoryItemId} row={row} onRefresh={onRefresh} />
          ))}
        </div>
      )}
    </div>
  );
}
