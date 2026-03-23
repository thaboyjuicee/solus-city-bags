"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { HospitalOptions } from "@/lib/gameApi";

export function HospitalOptionsCard({
  active,
  onUpdated,
}: {
  active: boolean;
  onUpdated: () => void;
}) {
  const [options, setOptions] = useState<HospitalOptions | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!active) return;
    try {
      const res = await api.get<HospitalOptions>("/hospital/options");
      setOptions(res.data);
      setError(null);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Could not load hospital options.");
    }
  }, [active]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (key: string, request: Promise<unknown>) => {
    setBusy(key);
    setError(null);
    try {
      await request;
      await load();
      onUpdated();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Hospital action failed.");
    } finally {
      setBusy(null);
    }
  };

  if (!active || !options?.hospitalized) return null;

  return (
    <div className="bg-[#1a0a0a] border border-[#7f1919] rounded-md p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black tracking-[2px] text-[#ef5350]">HOSPITAL OPTIONS</p>
        <span className="text-[10px] font-bold text-[#d0d5ca]">{options.remainingMinutes} min left</span>
      </div>
      <button
        onClick={() => run("cash", api.post("/hospital/release-cash"))}
        disabled={!!busy}
        className="w-full py-2 rounded border border-[rgba(239,83,80,0.4)] bg-black/20 text-[#ef5350] text-[10px] font-black tracking-[2px] disabled:opacity-50"
      >
        {busy === "cash" ? "PROCESSING..." : `PAY $${Math.floor(options.cashReleaseCost).toLocaleString()} CASH`}
      </button>
      {options.itemOptions.map((item) => (
        <button
          key={item.itemId}
          onClick={() => run(item.itemId, api.post("/hospital/release-item", { itemId: item.itemId }))}
          disabled={!!busy}
          className="w-full py-2 rounded border border-white/10 bg-black/20 text-[#f2f4ec] text-[10px] font-black tracking-[2px] disabled:opacity-50"
        >
          {busy === item.itemId ? "USING..." : `USE ${item.name.toUpperCase()} (${item.qty})`}
        </button>
      ))}
      <div className="grid grid-cols-3 gap-2">
        {options.penaltyReleaseOptions.map((penalty) => (
          <button
            key={penalty.type}
            onClick={() => run(penalty.type, api.post("/hospital/accept-penalty-release", { type: penalty.type }))}
            disabled={!!busy}
            className="py-2 rounded border border-white/10 bg-black/20 text-[#fdd835] text-[9px] font-black tracking-[1px] uppercase disabled:opacity-50"
          >
            {penalty.type}
          </button>
        ))}
      </div>
      {error && <p className="text-[10px] font-bold text-[#ef5350]">{error}</p>}
    </div>
  );
}

