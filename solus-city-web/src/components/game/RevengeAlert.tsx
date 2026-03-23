"use client";

export function RevengeAlert({
  targetName,
  expiresAt,
  bonusPercent,
}: {
  targetName: string;
  expiresAt?: string | null;
  bonusPercent?: number;
}) {
  return (
    <div className="rounded-md border border-[rgba(153,69,255,0.3)] bg-[#1a0a2e] p-3 flex flex-col gap-1">
      <p className="text-[10px] font-black tracking-[3px] text-[#9945FF] uppercase">Revenge Available</p>
      <p className="text-[12px] text-[#f2f4ec]">You can hit back against {targetName}.</p>
      <p className="text-[10px] text-[#bbb]">
        Bonus: {Math.round((bonusPercent ?? 0) * 100)}%{expiresAt ? ` • Expires ${new Date(expiresAt).toLocaleString()}` : ""}
      </p>
    </div>
  );
}

