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
    <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-4">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase">Prestige Preview</p>
          <p className="break-words text-[18px] font-black text-[#eee]">Level {preview.currentPrestigeLevel} to {preview.nextPrestigeLevel}</p>
        </div>
        <button
          type="button"
          disabled={!preview.eligible || busy}
          onClick={() => onExecute?.()}
          className="w-full rounded-md border border-[rgba(153,69,255,0.3)] bg-[#1a0a2e] px-3 py-2 text-[10px] font-black tracking-[2px] text-[#9945FF] disabled:opacity-40 sm:w-auto"
        >
          {busy ? "EXECUTING..." : preview.eligible ? "EXECUTE PRESTIGE" : "NOT READY"}
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {preview.requirements.map((requirement) => (
          <div key={requirement.key} className="rounded-md border border-white/10 bg-black/20 p-3">
            <p className="text-[9px] font-black tracking-[2px] text-[#555] uppercase">{requirement.label}</p>
            <p className={`mt-2 text-[14px] font-black ${requirement.met ? "text-[#66bb6a]" : "text-[#ff8a65]"}`}>
              {requirement.current ?? "-"}
              {requirement.required !== null ? ` / ${requirement.required}` : ""}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-md border border-white/10 bg-black/20 p-3">
          <p className="text-[10px] font-black tracking-[2px] text-[#555] uppercase">Resets</p>
          <div className="mt-2 flex flex-col gap-2 text-[11px] text-[#aaa]">
            {preview.resets.map((entry) => (
              <p key={entry}>{entry}</p>
            ))}
          </div>
        </div>
        <div className="rounded-md border border-white/10 bg-black/20 p-3">
          <p className="text-[10px] font-black tracking-[2px] text-[#555] uppercase">Keeps</p>
          <div className="mt-2 flex flex-col gap-2 text-[11px] text-[#aaa]">
            {preview.keeps.map((entry) => (
              <p key={entry}>{entry}</p>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-md border border-white/10 bg-black/20 p-3">
        <p className="text-[10px] font-black tracking-[2px] text-[#555] uppercase">Permanent Bonuses</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {preview.permanentBonuses.map((bonus) => (
            <div key={bonus.key} className="rounded-md border border-white/10 bg-black/20 p-3 text-center">
              <p className="text-[10px] text-[#777]">{bonus.label}</p>
              <p className="text-[16px] font-black text-[#fdd835]">+{bonus.amount}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

