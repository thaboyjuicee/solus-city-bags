"use client";

import Link from "next/link";
import { PrestigePreview } from "@/lib/gameApi";

export function PrestigePanel({
  prestigeLevel,
  prestigePoints,
  preview,
}: {
  prestigeLevel: number;
  prestigePoints: number;
  preview: PrestigePreview | null | undefined;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase">Prestige</p>
          <p className="break-words text-[18px] font-black text-[#eee]">Level {prestigeLevel}</p>
        </div>
        <Link href="/prestige" className="w-full rounded-md border border-[rgba(153,69,255,0.3)] bg-[#1a0a2e] px-3 py-2 text-center text-[10px] font-black tracking-[2px] text-[#9945FF] sm:w-auto">
          OPEN PRESTIGE
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-md border border-white/10 bg-black/20 p-3">
          <p className="text-[9px] font-bold tracking-[2px] text-[#555]">POINTS</p>
          <p className="text-[16px] font-black text-[#fdd835]">{prestigePoints}</p>
        </div>
        <div className="rounded-md border border-white/10 bg-black/20 p-3">
          <p className="text-[9px] font-bold tracking-[2px] text-[#555]">STATUS</p>
          <p className={`text-[16px] font-black ${preview?.eligible ? "text-[#66bb6a]" : "text-[#ff8a65]"}`}>{preview?.eligible ? "READY" : "LOCKED"}</p>
        </div>
      </div>
      <p className="text-[11px] text-[#888]">
        {preview?.eligible
          ? `You can advance to prestige ${preview.nextPrestigeLevel} now.`
          : preview?.reasons?.[0] ?? "Build further before attempting prestige."}
      </p>
    </div>
  );
}

