"use client";

const COLORS: Record<string, string> = {
  common: "bg-white/10 text-white/70",
  uncommon: "bg-[#66bb6a20] text-[#66bb6a]",
  rare: "bg-[#42a5f520] text-[#42a5f5]",
  epic: "bg-[#ff980020] text-[#ff9800]",
  legendary: "bg-[#fdd83520] text-[#fdd835]",
};

export function RarityBadge({ rarity }: { rarity?: string | null }) {
  if (!rarity) return null;
  return (
    <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-[2px] uppercase ${COLORS[rarity] ?? "bg-white/10 text-white/70"}`}>
      {rarity}
    </span>
  );
}
