export function HeatMeter({ heat }: { heat: number }) {
  const pct = Math.max(0, Math.min(100, heat));
  const color =
    pct >= 80 ? "#ef5350" : pct >= 60 ? "#ff9800" : pct >= 40 ? "#fdd835" : "#66bb6a";

  return (
    <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[9px] font-bold tracking-[2px] text-[#aab0a3]">HEAT</p>
        <span className="text-sm font-black" style={{ color }}>
          {pct}/100
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-[#1e1e1e] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

