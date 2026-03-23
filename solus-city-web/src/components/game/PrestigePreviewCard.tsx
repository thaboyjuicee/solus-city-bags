"use client";

import { PrestigePreview } from "@/lib/gameApi";

export function PrestigePreviewCard({
  preview,
  busy,
  onExecute,
}: {
  preview: PrestigePreview;
  busy?: boolean;
  onExecute?: () => Promise<void> | void;
}) {
  return (
<<<<<<< HEAD
    <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black tracking-[3px] text-[#aab0a3] uppercase">Prestige Preview</p>
          <p className="text-[18px] font-black text-[#f2f4ec]">Level {preview.currentPrestigeLevel} to {preview.nextPrestigeLevel}</p>
=======
    <div className="flex flex-col gap-5">
      <div className="sc-panel-strong p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="sc-kicker text-[#9f64ff]">Prestige</p>
            <p className="mt-3 text-[32px] font-black text-[#f4f5fb]">Reset and rise stronger</p>
          </div>
          <button type="button" disabled={!preview.eligible || busy} onClick={() => onExecute?.()} className={`sc-button ${preview.eligible ? "sc-button-primary" : ""}`}>
            {busy ? "EXECUTING..." : preview.eligible ? "EXECUTE PRESTIGE" : "NOT READY"}
          </button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="sc-stat">
            <p className="sc-label">Current</p>
            <p className="mt-3 text-[30px] font-black text-[#9f64ff]">P{preview.currentPrestigeLevel}</p>
          </div>
          <div className="sc-stat">
            <p className="sc-label">Next</p>
            <p className="mt-3 text-[30px] font-black text-[#f7bf35]">P{preview.nextPrestigeLevel}</p>
          </div>
          <div className="sc-stat">
            <p className="sc-label">Points Gained</p>
            <p className="mt-3 text-[30px] font-black text-[#36d47f]">+{preview.prestigePointsGain}</p>
          </div>
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
        </div>
      </div>

      <div className="sc-panel p-5 flex flex-col gap-3">
        <p className="text-[24px] font-black text-[#f4f5fb]">Requirements</p>
        {preview.requirements.map((requirement) => (
<<<<<<< HEAD
          <div key={requirement.key} className="rounded-md border border-white/10 bg-black/20 p-3">
            <p className="text-[9px] font-black tracking-[2px] text-[#aab0a3] uppercase">{requirement.label}</p>
            <p className={`mt-2 text-[14px] font-black ${requirement.met ? "text-[#66bb6a]" : "text-[#ff8a65]"}`}>
              {requirement.current ?? "-"}
              {requirement.required !== null ? ` / ${requirement.required}` : ""}
=======
          <div key={requirement.key} className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-3 ${requirement.met ? "border-[rgba(54,212,127,0.22)] bg-[rgba(12,31,22,0.9)]" : "border-[rgba(255,93,93,0.18)] bg-[rgba(27,13,15,0.9)]"}`}>
            <p className="text-[13px] font-black text-[#f4f5fb]">{requirement.label}</p>
            <p className={`text-[12px] font-black ${requirement.met ? "text-[#36d47f]" : "text-[#ff5d5d]"}`}>
              {requirement.current ?? "-"}{requirement.required !== null ? ` / ${requirement.required}` : ""}
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
            </p>
          </div>
        ))}
      </div>

<<<<<<< HEAD
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-md border border-white/10 bg-black/20 p-3">
          <p className="text-[10px] font-black tracking-[2px] text-[#aab0a3] uppercase">Resets</p>
          <div className="mt-2 flex flex-col gap-2 text-[11px] text-[#aaa]">
=======
      <div className="grid gap-5 md:grid-cols-2">
        <div className="sc-panel p-5">
          <p className="text-[24px] font-black text-[#f4f5fb]">You Will Lose</p>
          <div className="mt-4 flex flex-col gap-3 text-[12px] text-[#d4d6e2]">
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
            {preview.resets.map((entry) => (
              <p key={entry}>• {entry}</p>
            ))}
          </div>
        </div>
<<<<<<< HEAD
        <div className="rounded-md border border-white/10 bg-black/20 p-3">
          <p className="text-[10px] font-black tracking-[2px] text-[#aab0a3] uppercase">Keeps</p>
          <div className="mt-2 flex flex-col gap-2 text-[11px] text-[#aaa]">
=======
        <div className="sc-panel p-5">
          <p className="text-[24px] font-black text-[#f4f5fb]">You Will Keep</p>
          <div className="mt-4 flex flex-col gap-3 text-[12px] text-[#d4d6e2]">
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
            {preview.keeps.map((entry) => (
              <p key={entry}>• {entry}</p>
            ))}
          </div>
        </div>
      </div>

<<<<<<< HEAD
      <div className="rounded-md border border-white/10 bg-black/20 p-3">
        <p className="text-[10px] font-black tracking-[2px] text-[#aab0a3] uppercase">Permanent Bonuses</p>
        <div className="mt-2 grid gap-2 md:grid-cols-3">
=======
      <div className="sc-panel p-5">
        <p className="text-[24px] font-black text-[#f4f5fb]">Permanent Bonuses at P{preview.nextPrestigeLevel}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
          {preview.permanentBonuses.map((bonus) => (
            <div key={bonus.key} className="rounded-xl border border-[rgba(247,191,53,0.18)] bg-[rgba(38,28,12,0.92)] p-4 text-center">
              <p className="text-[11px] font-black text-[#c7cad8]">{bonus.label}</p>
              <p className="mt-2 text-[24px] font-black text-[#f7bf35]">+{bonus.amount}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
<<<<<<< HEAD
}


=======
}
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
