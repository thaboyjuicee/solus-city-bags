"use client";

import { RarityBadge } from "./RarityBadge";

export function EquippedSlotCard({
  slot,
  name,
  rarity,
}: {
  slot: string;
  name?: string;
  rarity?: string | null;
}) {
  return (
    <div className="sc-panel p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="sc-label">{slot}</p>
        <RarityBadge rarity={rarity} />
      </div>
      <p className="text-[16px] font-black text-[#f4f5fb]">{name ?? "Empty"}</p>
    </div>
  );
}