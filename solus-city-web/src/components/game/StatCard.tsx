interface StatCardProps {
  label: string;
  value: string | number;
  valueClassName?: string;
  color?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  valueClassName,
  color,
  className,
}: StatCardProps) {
  return (
    <div className={`bg-[#141414] border border-[#1e1e1e] rounded-md p-3 text-center ${className ?? ""}`}>
      <p className="text-[9px] font-bold tracking-[2px] text-[#555] mb-1">{label}</p>
      <p
        className={`text-sm font-bold ${valueClassName ?? ""}`}
        style={{ color: color ?? "#eee" }}
      >
        {value}
      </p>
    </div>
  );
}
