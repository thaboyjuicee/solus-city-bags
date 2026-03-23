"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import { api } from "@/lib/api/client";
import { HospitalOptions } from "@/lib/gameApi";
import { SLS_BALANCE_REFRESH_EVENT, useSLSBalance } from "@/hooks/useSLSBalance";

type SlsHospitalQuote = {
  slsAmount: number;
  transaction: string;
  blockhash: string;
  lastValidBlockHeight: number;
};

function decodeBase64(value: string) {
  const raw = atob(value);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

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
  const { connection } = useConnection();
  const { publicKey, signTransaction, connected } = useWallet();
  const slsBalance = useSLSBalance();

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

  const runSlsRelease = async () => {
    if (!connected || !publicKey || !signTransaction) {
      setError("Connect your wallet to use $SLS hospital release.");
      return;
    }

    setBusy("sls");
    setError(null);
    try {
      const quoteRes = await api.post<SlsHospitalQuote>("/sls/hospital/quote");
      const transaction = Transaction.from(decodeBase64(quoteRes.data.transaction));
      const signed = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
      });

      await connection.confirmTransaction({
        signature,
        blockhash: quoteRes.data.blockhash,
        lastValidBlockHeight: quoteRes.data.lastValidBlockHeight,
      });

      await api.post("/sls/hospital/confirm", { signature });
      window.dispatchEvent(new Event(SLS_BALANCE_REFRESH_EVENT));
      await load();
      onUpdated();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "SLS hospital release failed.");
    } finally {
      setBusy(null);
    }
  };

  if (!active || !options?.hospitalized) return null;

  return (
    <div className="bg-[#1a0a0a] border border-[#7f1919] rounded-md p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black tracking-[2px] text-[#ef5350]">HOSPITAL OPTIONS</p>
        <span className="text-[10px] font-bold text-[#888]">{options.remainingMinutes} min left</span>
      </div>
      <button
        onClick={runSlsRelease}
        disabled={
          !!busy ||
          !connected ||
          !publicKey ||
          !signTransaction ||
          options.slsReleaseCost === null ||
          (slsBalance !== null && options.slsReleaseCost !== null && slsBalance < options.slsReleaseCost)
        }
        className="w-full py-2 rounded border border-[rgba(153,69,255,0.35)] bg-[#1a0a2e] text-[#9945FF] text-[10px] font-black tracking-[2px] disabled:opacity-50"
      >
        {busy === "sls"
          ? "CONFIRMING..."
          : options.slsReleaseCost === null
            ? "LIVE $SLS PRICE UNAVAILABLE"
          : !connected || !publicKey || !signTransaction
            ? "CONNECT WALLET FOR FULL $SLS RELEASE"
            : `PAY ${options.slsReleaseCost.toFixed(4)} $SLS FOR FULL RELEASE`}
      </button>
      {options.itemOptions.map((item) => (
        <button
          key={item.itemId}
          onClick={() => run(item.itemId, api.post("/hospital/release-item", { itemId: item.itemId }))}
          disabled={!!busy}
          className="w-full py-2 rounded border border-white/10 bg-black/20 text-[#eee] text-[10px] font-black tracking-[2px] disabled:opacity-50"
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
      <div className="rounded border border-white/10 bg-black/20 p-2">
        <p className="text-[9px] font-black tracking-[2px] text-[#777] uppercase">Release rules</p>
        <div className="mt-1 flex flex-col gap-1 text-[10px] text-[#aaa]">
          <p>Full $SLS release is the premium option: instant, full health, and no penalty. Wallet connection required.</p>
          <p>Current full-release fee is ${options.slsReleaseUsd.toFixed(2)} worth of $SLS.</p>
          <p>Each extra full release on the same UTC day doubles the cost. Current multiplier: {options.slsReleaseMultiplier}x.</p>
          <p>Item release has no fixed usage cap either, but it is limited by your recovery item quantity and only works while you are still hospitalized.</p>
          <p>Penalty release is limited to one active penalty at a time. If a penalty is already active, you cannot take another one until it expires.</p>
          <p>Weakened is a brutal combat and training hit. Shaken crushes crime success and payouts. Exposed makes you weaker in fights and much easier to rob.</p>
        </div>
      </div>
      {error && <p className="text-[10px] font-bold text-[#ef5350]">{error}</p>}
    </div>
  );
}
