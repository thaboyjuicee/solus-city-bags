const WANTED_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  low: { label: "LOW", bg: "bg-[#66bb6a20]", text: "text-[#66bb6a]" },
  watched: { label: "WATCHED", bg: "bg-[#fdd83520]", text: "text-[#fdd835]" },
  wanted: { label: "WANTED", bg: "bg-[#ff980020]", text: "text-[#ff9800]" },
  dangerous: { label: "DANGEROUS", bg: "bg-[#ef535020]", text: "text-[#ef5350]" },
  most_wanted: { label: "MOST WANTED", bg: "bg-[#7f191920]", text: "text-[#ff6b6b]" },
};

export function WantedBadge({ tier }: { tier: string }) {
  const style = WANTED_STYLES[tier] ?? WANTED_STYLES.low;
  return (
    <div className={`rounded-md border border-white/10 px-3 py-3 ${style.bg}`}>
      <p className="text-[9px] font-bold tracking-[2px] text-[#aab0a3] mb-1">WANTED</p>
      <p className={`text-sm font-black ${style.text}`}>{style.label}</p>
    </div>
  );
}

