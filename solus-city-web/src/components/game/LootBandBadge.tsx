const LOOT_BAND_STYLES: Record<string, string> = {
  low: "bg-[#66bb6a20] text-[#66bb6a]",
  medium: "bg-[#42a5f520] text-[#42a5f5]",
  high: "bg-[#ff980020] text-[#ff9800]",
  jackpot: "bg-[#fdd83520] text-[#fdd835]",
};

export function LootBandBadge({ band }: { band: string }) {
  return (
    <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-[2px] ${LOOT_BAND_STYLES[band] ?? LOOT_BAND_STYLES.low}`}>
      {band.toUpperCase()}
    </span>
  );
}
