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
    <div className="rounded-md border border-white/10 bg-black/20 p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-black tracking-[2px] text-[#555] uppercase">{slot}</p>
        <RarityBadge rarity={rarity} />
      </div>
      <p className="text-[12px] font-bold text-[#eee]">{name ?? "Empty"}</p>
    </div>
  );
}
