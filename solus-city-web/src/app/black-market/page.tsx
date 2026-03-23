"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { createTransferInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { ArrowLeftRight, ArrowUpFromLine, CircleDollarSign, Clock3, History, Send, ShoppingBag, ShoppingCart, Wallet } from "lucide-react";
import { api } from "@/lib/api/client";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { HospitalOptionsCard } from "@/components/game/HospitalOptionsCard";
import { SLS_BALANCE_REFRESH_EVENT, useSLSBalance } from "@/hooks/useSLSBalance";
import { MeResponse } from "@/lib/gameApi";

type BlackMarketTab = "listings" | "swap" | "sell" | "send" | "hospital" | "history";
type SlsQuote = { outAmount: string; priceImpactPct: string; routePlan: Array<{ outputMintDecimals: number }>; [key: string]: unknown };
type SwapBuildResponse = { transaction: string; lastValidBlockHeight: number };
type SellQuote = { slsAmount: number; cashToReceive: number; transaction: string; blockhash: string; lastValidBlockHeight: number };
type SlsTransactionItem = { id: string; type: string; amount: number; usdValue: number; description: string; createdAt: string };
type Rotation = { id: string; theme?: string | null; status?: string; startsAt?: string; endsAt?: string; timeRemainingSeconds?: number };
type Listing = { id: string; finalPrice: number; basePrice?: number; stock?: number; remainingStock: number; riskPercent?: number; requiredHeatMin?: number; requiredLevelMin?: number; listingType?: string; item?: { name?: string; description?: string | null; rarity?: string | null; slot?: string | null; subCategory?: string | null; effectType?: string | null; effectValue?: number | null; consumable?: boolean } | null };

const SLS_MINT = new PublicKey("ELTXCFp1tmtfu39CPw6afnMSjW1BBxjinorJQsKmBAGS");
const SLS_DECIMALS = 9;
const OPERATION_COPY: Record<Exclude<BlackMarketTab, "listings">, { title: string; description: string }> = {
  swap: { title: "Get $SLS", description: "Swap SOL into the street currency used for legacy black-market utility flows." },
  sell: { title: "Sell $SLS", description: "Cash out $SLS into wallet cash using the legacy exchange flow." },
  send: { title: "Send $SLS", description: "Move $SLS to another Solana wallet without leaving the market room." },
  hospital: { title: "Hospital", description: "Handle release options without leaving the black-market utility surface." },
  history: { title: "History", description: "Review swaps, sends, sells, and related black-market transaction activity." },
};

function decodeBase64(value: string) {
  const raw = atob(value);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

function extractErrMsg(err: unknown, fallback: string) {
  return (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? (err as { message?: string })?.message ?? fallback;
}

function formatTimeLeft(seconds: number) {
  if (seconds <= 0) return "Refreshing now";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) return `${hrs}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

function formatDate(iso?: string) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatPrice(price: number | null) {
  if (price === null) return "-";
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toPrecision(3)}`;
}

function remainingSeconds(rotation: Rotation | null) {
  return rotation?.timeRemainingSeconds ?? (rotation?.endsAt ? Math.max(0, Math.floor((new Date(rotation.endsAt).getTime() - Date.now()) / 1000)) : 0);
}

function classifyListing(listing: Listing) {
  const effect = String(listing.item?.effectType ?? "").toLowerCase();
  if (effect.includes("hospital")) return "recovery";
  if (effect.includes("loot_reduction") || effect.includes("decoy_wallet") || effect.includes("heat_mask")) return "defense";
  if (effect.includes("contraband")) return "contraband";
  return "tools";
}

function SLSOverview({ cash, slsBalance, slsPrice, slsSpent, heat }: { cash: number; slsBalance: number | null; slsPrice: number | null; slsSpent: number; heat: number }) {
  return (
<<<<<<< HEAD
    <div className="grid grid-cols-4 gap-1.5">
      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-3 text-center">
        <p className="text-[9px] font-bold tracking-[2px] text-[#aab0a3] mb-1">CASH</p>
        <p className="text-sm font-black text-[#66bb6a]">${Math.floor(cash).toLocaleString()}</p>
      </div>
      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-3 text-center">
        <p className="text-[9px] font-bold tracking-[2px] text-[#aab0a3] mb-1">$SLS</p>
        <p className="text-sm font-black text-[#9945FF]">{slsBalance !== null ? slsBalance.toFixed(2) : "-"}</p>
      </div>
      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-3 text-center">
        <p className="text-[9px] font-bold tracking-[2px] text-[#aab0a3] mb-1">PRICE</p>
        <p className="text-sm font-black text-[#f2f4ec]">{formatPrice(slsPrice)}</p>
      </div>
      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-3 text-center">
        <p className="text-[9px] font-bold tracking-[2px] text-[#aab0a3] mb-1">SPENT</p>
        <p className="text-sm font-black text-[#fdd835]">{slsSpent.toFixed(2)}</p>
      </div>
=======
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <div className="sc-stat"><p className="sc-label mb-1">Wallet cash</p><p className="text-xl font-black text-[#7ef0c5]">${Math.floor(cash).toLocaleString()}</p></div>
      <div className="sc-stat"><p className="sc-label mb-1">$SLS balance</p><p className="text-xl font-black text-[#d9a7ff]">{slsBalance !== null ? slsBalance.toFixed(2) : "-"}</p></div>
      <div className="sc-stat"><p className="sc-label mb-1">Spot price</p><p className="text-xl font-black text-white">{formatPrice(slsPrice)}</p></div>
      <div className="sc-stat"><p className="sc-label mb-1">$SLS spent</p><p className="text-xl font-black text-[#ffd36b]">{slsSpent.toFixed(2)}</p></div>
      <div className="sc-stat"><p className="sc-label mb-1">Heat</p><p className="text-xl font-black text-[#ff9d6b]">{heat}</p></div>
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
    </div>
  );
}

function ConnectPrompt({ label }: { label: string }) {
  return (
<<<<<<< HEAD
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <Wallet size={28} className="text-[#aab0a3]" />
      <p className="text-[#aab0a3] text-[11px] font-bold tracking-[2px]">{label}</p>
=======
    <div className="sc-panel flex flex-col items-center justify-center gap-3 py-12">
      <Wallet size={28} className="text-white/35" />
      <p className="text-[11px] font-bold tracking-[0.24em] text-white/50">{label}</p>
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
    </div>
  );
}

function SendSLSPanel({ onSendComplete }: { onSendComplete: (entry: SlsTransactionItem) => void }) {
  const { connection } = useConnection();
  const { publicKey, signTransaction, connected } = useWallet();
  const slsBalance = useSLSBalance();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [phase, setPhase] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    const parsed = parseFloat(amount);
    if (!recipient.trim() || Number.isNaN(parsed) || parsed <= 0) return setError("Enter a valid recipient and amount.");
    if (slsBalance !== null && parsed > slsBalance) return setError("You do not have enough $SLS.");
    if (!publicKey || !signTransaction) return;

    let recipientPubkey: PublicKey;
    try {
      recipientPubkey = new PublicKey(recipient.trim());
    } catch {
      return setError("Invalid Solana wallet address.");
    }

    setPhase("sending");
    setError(null);

    try {
      const senderATA = getAssociatedTokenAddressSync(SLS_MINT, publicKey);
      const recipientATA = getAssociatedTokenAddressSync(SLS_MINT, recipientPubkey);
      const lamports = BigInt(Math.floor(parsed * Math.pow(10, SLS_DECIMALS)));
      const transferIx = createTransferInstruction(senderATA, recipientATA, publicKey, lamports);
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      const transaction = new Transaction({ recentBlockhash: blockhash, feePayer: publicKey }).add(transferIx);
      const signed = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false, maxRetries: 3 });
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight });
      window.dispatchEvent(new Event(SLS_BALANCE_REFRESH_EVENT));
      onSendComplete({ id: signature, type: "send", amount: -parsed, usdValue: 0, description: `Sent ${parsed.toFixed(2)} $SLS to ${recipient.trim().slice(0, 8)}...`, createdAt: new Date().toISOString() });
      setPhase("done");
      setRecipient("");
      setAmount("");
    } catch (err) {
      setError(extractErrMsg(err, "Transfer failed."));
      setPhase("idle");
    }
  };

  if (!connected || !publicKey || !signTransaction) return <ConnectPrompt label="CONNECT WALLET TO SEND" />;

  return (
<<<<<<< HEAD
    <div className="flex flex-col gap-3">
      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-3 text-center">
        <p className="text-[9px] font-bold tracking-[2px] text-[#aab0a3] mb-1">YOUR $SLS</p>
        <p className="text-sm font-black text-[#9945FF]">{slsBalance !== null ? slsBalance.toFixed(2) : "-"}</p>
      </div>

      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-3">
        <p className="text-[9px] font-bold tracking-[2px] text-[#aab0a3] mb-2">RECIPIENT WALLET</p>
        <input
          type="text"
          placeholder="Solana wallet address"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          className="w-full bg-black/20 border border-white/10 rounded-md px-3 py-2 text-sm font-black text-[#f2f4ec] outline-none placeholder:text-[#333]"
        />
      </div>

      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-3">
        <p className="text-[9px] font-bold tracking-[2px] text-[#aab0a3] mb-2">AMOUNT ($SLS)</p>
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full bg-black/20 border border-white/10 rounded-md px-3 py-2 text-sm font-black text-[#f2f4ec] outline-none"
        />
      </div>

      {error && <p className="text-[10px] font-bold text-[#ef5350]">{error}</p>}
      {phase === "done" && <p className="text-[10px] font-bold text-[#66bb6a]">Transfer confirmed on-chain.</p>}

      <button
        onClick={send}
        disabled={phase === "sending"}
        className="w-full py-2.5 rounded-md border border-[rgba(153,69,255,0.3)] bg-[#1a0a2e] text-[#9945FF] text-[11px] font-bold tracking-[2px] disabled:opacity-40"
      >
        {phase === "sending" ? "SIGNING..." : "SEND $SLS"}
      </button>
=======
    <div className="space-y-4">
      <div className="sc-panel p-4"><p className="sc-label mb-2">Your $SLS</p><p className="text-lg font-black text-[#d9a7ff]">{slsBalance !== null ? slsBalance.toFixed(2) : "-"}</p></div>
      <div className="sc-panel p-4"><p className="sc-label mb-2">Recipient wallet</p><input type="text" placeholder="Solana wallet address" value={recipient} onChange={(e) => setRecipient(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm font-semibold text-white outline-none placeholder:text-white/25" /></div>
      <div className="sc-panel p-4"><p className="sc-label mb-2">Amount ($SLS)</p><input type="number" min="0" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm font-semibold text-white outline-none" /></div>
      {error ? <p className="text-xs font-semibold text-red-300">{error}</p> : null}
      {phase === "done" ? <p className="text-xs font-semibold text-[#7ef0c5]">Transfer confirmed on-chain.</p> : null}
      <button onClick={send} disabled={phase === "sending"} className="sc-button sc-button-primary w-full justify-center">{phase === "sending" ? "Signing..." : "Send $SLS"}</button>
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
    </div>
  );
}

function GetSLSPanel() {
  const { connection } = useConnection();
  const { publicKey, signTransaction, connected } = useWallet();
  const slsBalance = useSLSBalance();
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [solInput, setSolInput] = useState("");
  const [quote, setQuote] = useState<SlsQuote | null>(null);
  const [slsOut, setSlsOut] = useState<number | null>(null);
  const [phase, setPhase] = useState<"idle" | "quoting" | "quoted" | "signing" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!publicKey) return void setSolBalance(null);
    let cancelled = false;
    connection.getBalance(publicKey).then((lamports) => { if (!cancelled) setSolBalance(lamports / 1e9); }).catch(() => { if (!cancelled) setSolBalance(null); });
    return () => { cancelled = true; };
  }, [connection, publicKey, phase]);

  const getQuote = async () => {
    const sol = parseFloat(solInput);
    if (Number.isNaN(sol) || sol <= 0) return setError("Enter a valid SOL amount.");
    setPhase("quoting");
    setError(null);
    try {
      const res = await api.get<{ quote: SlsQuote }>("/bags/quote", { params: { inputMint: "So11111111111111111111111111111111111111112", outputMint: "ELTXCFp1tmtfu39CPw6afnMSjW1BBxjinorJQsKmBAGS", amount: Math.floor(sol * 1e9) } });
      const nextQuote = res.data.quote;
      const decimals = nextQuote.routePlan[nextQuote.routePlan.length - 1]?.outputMintDecimals ?? 9;
      setQuote(nextQuote);
      setSlsOut(parseInt(nextQuote.outAmount, 10) / Math.pow(10, decimals));
      setPhase("quoted");
    } catch (err) {
      setError(extractErrMsg(err, "Failed to get quote."));
      setPhase("idle");
    }
  };

  const confirmSwap = async () => {
    if (!publicKey || !signTransaction || !quote) return;
    setPhase("signing");
    setError(null);
    try {
      const res = await api.post<SwapBuildResponse>("/bags/swap", { quoteResponse: quote, userPublicKey: publicKey.toBase58() });
      const transaction = VersionedTransaction.deserialize(decodeBase64(res.data.transaction));
      const signed = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false, maxRetries: 3 });
      await connection.confirmTransaction({ signature, blockhash: transaction.message.recentBlockhash, lastValidBlockHeight: res.data.lastValidBlockHeight });
      setPhase("done");
    } catch (err) {
      setError(extractErrMsg(err, "Swap failed."));
      setPhase("quoted");
    }
  };

  if (!connected || !publicKey || !signTransaction) return <ConnectPrompt label="CONNECT WALLET TO SWAP" />;

  return (
<<<<<<< HEAD
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-1.5">
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-3 text-center">
          <p className="text-[9px] font-bold tracking-[2px] text-[#aab0a3] mb-1">YOUR SOL</p>
          <p className="text-sm font-black text-[#f2f4ec]">{solBalance !== null ? solBalance.toFixed(4) : "-"}</p>
        </div>
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-3 text-center">
          <p className="text-[9px] font-bold tracking-[2px] text-[#aab0a3] mb-1">YOUR $SLS</p>
          <p className="text-sm font-black text-[#9945FF]">{slsBalance !== null ? slsBalance.toFixed(2) : "-"}</p>
        </div>
      </div>

      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-3">
        <p className="text-[9px] font-bold tracking-[2px] text-[#aab0a3] mb-2">SOL TO SWAP</p>
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={solInput}
          onChange={(e) => setSolInput(e.target.value)}
          className="w-full bg-black/20 border border-white/10 rounded-md px-3 py-2 text-sm font-black text-[#f2f4ec] outline-none"
        />
      </div>

      {slsOut !== null && (
        <div className="bg-[#0a0a1a] border border-[rgba(153,69,255,0.3)] rounded-md p-3">
          <p className="text-[9px] font-bold tracking-[2px] text-[#aab0a3] mb-1">ESTIMATED OUT</p>
          <p className="text-sm font-black text-[#9945FF]">{slsOut.toFixed(2)} $SLS</p>
        </div>
      )}

      {error && <p className="text-[10px] font-bold text-[#ef5350]">{error}</p>}

      {phase === "quoted" ? (
        <button onClick={confirmSwap} className="w-full py-2.5 rounded-md border border-[rgba(153,69,255,0.3)] bg-[#1a0a2e] text-[#9945FF] text-[11px] font-bold tracking-[2px]">
          CONFIRM SWAP
        </button>
      ) : (
        <button onClick={getQuote} disabled={phase === "quoting" || phase === "signing"} className="w-full py-2.5 rounded-md border border-[rgba(153,69,255,0.3)] bg-[#1a0a2e] text-[#9945FF] text-[11px] font-bold tracking-[2px] disabled:opacity-40">
          {phase === "quoting" ? "QUOTING..." : phase === "done" ? "SWAPPED" : "GET QUOTE"}
        </button>
      )}
=======
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="sc-panel p-4"><p className="sc-label mb-2">Your SOL</p><p className="text-lg font-black text-white">{solBalance !== null ? solBalance.toFixed(4) : "-"}</p></div>
        <div className="sc-panel p-4"><p className="sc-label mb-2">Your $SLS</p><p className="text-lg font-black text-[#d9a7ff]">{slsBalance !== null ? slsBalance.toFixed(2) : "-"}</p></div>
      </div>
      <div className="sc-panel p-4"><p className="sc-label mb-2">SOL to swap</p><input type="number" min="0" step="0.01" placeholder="0.00" value={solInput} onChange={(e) => setSolInput(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm font-semibold text-white outline-none" /></div>
      {slsOut !== null ? <div className="sc-panel-strong p-4"><p className="sc-label mb-2">Estimated out</p><p className="text-lg font-black text-[#d9a7ff]">{slsOut.toFixed(2)} $SLS</p></div> : null}
      {error ? <p className="text-xs font-semibold text-red-300">{error}</p> : null}
      {phase === "quoted" ? <button onClick={confirmSwap} className="sc-button sc-button-primary w-full justify-center">Confirm swap</button> : <button onClick={getQuote} disabled={phase === "quoting" || phase === "signing"} className="sc-button sc-button-primary w-full justify-center">{phase === "quoting" ? "Quoting..." : phase === "done" ? "Swapped" : "Get quote"}</button>}
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
    </div>
  );
}

function SellSLSPanel({ onSold }: { onSold: () => void }) {
  const { connection } = useConnection();
  const { publicKey, signTransaction, connected } = useWallet();
  const slsBalance = useSLSBalance();
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<SellQuote | null>(null);
  const [phase, setPhase] = useState<"idle" | "quoting" | "quoted" | "signing" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const getQuote = async () => {
    const slsAmount = parseFloat(amount);
    if (Number.isNaN(slsAmount) || slsAmount <= 0) return setError("Enter a valid $SLS amount.");
    if (slsBalance !== null && slsAmount > slsBalance) return setError("You do not have enough $SLS.");
    setPhase("quoting");
    setError(null);
    try {
      const res = await api.post<SellQuote>("/sls/sell/quote", { slsAmount });
      setQuote(res.data);
      setPhase("quoted");
    } catch (err) {
      setError(extractErrMsg(err, "Failed to create sell quote."));
      setPhase("idle");
    }
  };

  const confirmSell = async () => {
    if (!quote || !signTransaction || !publicKey) return;
    setPhase("signing");
    setError(null);
    try {
      const transaction = Transaction.from(decodeBase64(quote.transaction));
      const signed = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false, maxRetries: 3 });
      await connection.confirmTransaction({ signature, blockhash: quote.blockhash, lastValidBlockHeight: quote.lastValidBlockHeight });
      await api.post("/sls/sell/confirm", { signature });
      setPhase("done");
      onSold();
    } catch (err) {
      setError(extractErrMsg(err, "Sell failed."));
      setPhase("quoted");
    }
  };

  if (!connected || !publicKey || !signTransaction) return <ConnectPrompt label="CONNECT WALLET TO SELL" />;

  return (
<<<<<<< HEAD
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-1.5">
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-3 text-center">
          <p className="text-[9px] font-bold tracking-[2px] text-[#aab0a3] mb-1">YOUR $SLS</p>
          <p className="text-sm font-black text-[#9945FF]">{slsBalance !== null ? slsBalance.toFixed(2) : "-"}</p>
        </div>
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-3 text-center">
          <p className="text-[9px] font-bold tracking-[2px] text-[#aab0a3] mb-1">RATE</p>
          <p className="text-sm font-black text-[#f2f4ec]">50 $SLS / 1 CASH</p>
        </div>
      </div>

      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-3">
        <p className="text-[9px] font-bold tracking-[2px] text-[#aab0a3] mb-2">SELL $SLS</p>
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full bg-black/20 border border-white/10 rounded-md px-3 py-2 text-sm font-black text-[#f2f4ec] outline-none"
        />
      </div>

      {quote && (
        <div className="bg-[#0a0a1a] border border-[rgba(153,69,255,0.3)] rounded-md p-3">
          <p className="text-[9px] font-bold tracking-[2px] text-[#aab0a3] mb-1">YOU RECEIVE</p>
          <p className="text-sm font-black text-[#66bb6a]">{quote.cashToReceive.toFixed(2)} CASH</p>
        </div>
      )}

      {error && <p className="text-[10px] font-bold text-[#ef5350]">{error}</p>}

      {phase === "quoted" ? (
        <button onClick={confirmSell} className="w-full py-2.5 rounded-md border border-[rgba(153,69,255,0.3)] bg-[#1a0a2e] text-[#9945FF] text-[11px] font-bold tracking-[2px]">
          CONFIRM SELL
        </button>
      ) : (
        <button onClick={getQuote} disabled={phase === "quoting" || phase === "signing"} className="w-full py-2.5 rounded-md border border-[rgba(153,69,255,0.3)] bg-[#1a0a2e] text-[#9945FF] text-[11px] font-bold tracking-[2px] disabled:opacity-40">
          {phase === "quoting" ? "QUOTING..." : phase === "done" ? "SOLD" : "SELL FOR CASH"}
        </button>
      )}
=======
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="sc-panel p-4"><p className="sc-label mb-2">Your $SLS</p><p className="text-lg font-black text-[#d9a7ff]">{slsBalance !== null ? slsBalance.toFixed(2) : "-"}</p></div>
        <div className="sc-panel p-4"><p className="sc-label mb-2">Rate</p><p className="text-lg font-black text-white">50 $SLS / 1 cash</p></div>
      </div>
      <div className="sc-panel p-4"><p className="sc-label mb-2">Sell $SLS</p><input type="number" min="0" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm font-semibold text-white outline-none" /></div>
      {quote ? <div className="sc-panel-strong p-4"><p className="sc-label mb-2">You receive</p><p className="text-lg font-black text-[#7ef0c5]">{quote.cashToReceive.toFixed(2)} cash</p></div> : null}
      {error ? <p className="text-xs font-semibold text-red-300">{error}</p> : null}
      {phase === "quoted" ? <button onClick={confirmSell} className="sc-button sc-button-primary w-full justify-center">Confirm sell</button> : <button onClick={getQuote} disabled={phase === "quoting" || phase === "signing"} className="sc-button sc-button-primary w-full justify-center">{phase === "quoting" ? "Quoting..." : phase === "done" ? "Sold" : "Sell for cash"}</button>}
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
    </div>
  );
}

function ListingsPanel({ profile, rotation, listings, buyingId, onBuy }: { profile: MeResponse; rotation: Rotation | null; listings: Listing[]; buyingId: string | null; onBuy: (listingId: string) => void }) {
  const groups = [
    { key: "tools", title: "Operational tools", description: "Intel, burner, and general illegal utility pieces." },
    { key: "defense", title: "Protection and cover", description: "Heat masking and loot mitigation gear." },
    { key: "recovery", title: "Recovery stock", description: "Hospital and recovery items for fast resets." },
    { key: "contraband", title: "Contraband", description: "Risky stock with the most obvious heat profile." },
  ] as const;

  if (!listings.length) {
    return <div className="sc-panel p-6 text-sm text-white/60">No active listings are live right now. The next rotation will refill the market.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="sc-stat"><div className="sc-label">Theme</div><div className="sc-value">{rotation?.theme ?? "street cache"}</div></div>
        <div className="sc-stat"><div className="sc-label">Status</div><div className="sc-value">{String(rotation?.status ?? "active").replaceAll("_", " ")}</div></div>
        <div className="sc-stat"><div className="sc-label">Ends in</div><div className="sc-value">{formatTimeLeft(remainingSeconds(rotation))}</div></div>
      </div>

      {groups.map((group) => {
        const rows = listings.filter((listing) => classifyListing(listing) === group.key);
        if (!rows.length) return null;

        return (
          <section key={group.key} className="space-y-4">
            <div>
              <div className="sc-kicker">{group.title}</div>
              <p className="mt-2 text-sm leading-6 text-white/60">{group.description}</p>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              {rows.map((listing) => {
                const item = listing.item ?? {};
                const canAfford = Number(profile.cash ?? 0) >= Number(listing.finalPrice ?? 0);
                const levelGate = Number(profile.level ?? 1) >= Number(listing.requiredLevelMin ?? 1);
                const heatGate = Number(profile.heat ?? 0) >= Number(listing.requiredHeatMin ?? 0);
                const canBuy = listing.remainingStock > 0 && canAfford && levelGate && heatGate;
                const effect = item.effectType ? `${item.effectType.replaceAll("_", " ")} ${item.effectValue ?? ""}`.trim() : null;

                return (
                  <div key={listing.id} className="sc-panel-strong p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="sc-kicker">{String(listing.listingType ?? group.key).replaceAll("_", " ")}</div>
                        <h3 className="mt-2 text-2xl font-black text-white">{item.name ?? "Black market item"}</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {item.rarity ? <span className="sc-chip sc-chip-purple">{item.rarity}</span> : null}
                        {item.slot ? <span className="sc-chip">{item.slot}</span> : null}
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-white/60">{item.description ?? "An under-the-table item with utility, risk, and a limited stock count."}</p>
                    <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.12em]">
                      <span className="sc-chip sc-chip-green">${Math.floor(listing.finalPrice ?? 0).toLocaleString()}</span>
                      <span className="sc-chip">Stock {listing.remainingStock}/{listing.stock ?? listing.remainingStock}</span>
                      <span className="sc-chip sc-chip-orange">Risk {Number(listing.riskPercent ?? 0)}%</span>
                      {effect ? <span className="sc-chip sc-chip-purple">{effect}</span> : null}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/55">
                      <span className={levelGate ? "sc-chip sc-chip-green" : "sc-chip sc-chip-orange"}>lvl {listing.requiredLevelMin ?? 1}</span>
                      <span className={heatGate ? "sc-chip sc-chip-green" : "sc-chip sc-chip-red"}>heat {listing.requiredHeatMin ?? 0}+</span>
                    </div>
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs text-white/55">{!canAfford ? "Need more wallet cash." : !levelGate ? "Level too low." : !heatGate ? "Heat too low." : listing.remainingStock <= 0 ? "Sold out." : "Ready to buy."}</div>
                      <button type="button" className="sc-button sc-button-primary" disabled={!canBuy || buyingId === listing.id} onClick={() => onBuy(listing.id)}>
                        {buyingId === listing.id ? "Buying..." : "Buy item"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function HospitalPanel({ profile, onRefresh }: { profile: MeResponse; onRefresh: () => void }) {
  return (
    <div className="space-y-4">
      <div className="sc-panel p-4">
        <div className="flex items-center justify-between">
<<<<<<< HEAD
          <p className="text-[10px] font-black tracking-[2px] text-[#f2f4ec]">HOSPITAL STATUS</p>
          <span className={`text-[10px] font-bold ${profile.inHospital ? "text-[#ef5350]" : "text-[#66bb6a]"}`}>
=======
          <p className="sc-label">Hospital status</p>
          <span className={`text-xs font-bold tracking-[0.18em] ${profile.inHospital ? "text-[#ff8d8d]" : "text-[#7ef0c5]"}`}>
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
            {profile.inHospital ? "HOSPITALIZED" : "CLEAR"}
          </span>
        </div>
        {profile.hospitalExitPenalty ? <p className="mt-3 text-sm text-[#ffd36b]">Active penalty: {profile.hospitalExitPenalty.type}</p> : null}
      </div>
      <HospitalOptionsCard active={profile.inHospital} onUpdated={onRefresh} />
    </div>
  );
}

function getTxIcon(type: string) {
  if (type.includes("send")) return Send;
  if (type.includes("sell")) return ArrowUpFromLine;
  if (type.includes("buy") || type.includes("swap")) return ShoppingCart;
  return Clock3;
}

function HistoryPanel({ localEntries }: { localEntries: SlsTransactionItem[] }) {
  const [transactions, setTransactions] = useState<SlsTransactionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ transactions: SlsTransactionItem[] }>("/sls/transactions").then((res) => setTransactions(res.data.transactions)).catch(() => setTransactions([])).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-12"><LoadingSpinner size={24} /></div>;
  const all = [...localEntries, ...transactions];
<<<<<<< HEAD

  if (all.length === 0) {
    return <p className="text-[11px] text-[#aab0a3] text-center py-8">No transaction history yet.</p>;
  }
=======
  if (!all.length) return <div className="sc-panel p-6 text-sm text-white/55">No transaction history yet.</div>;
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39

  return (
    <div className="space-y-3">
      {all.map((tx) => {
        const Icon = getTxIcon(tx.type);
        return (
          <div key={tx.id} className="sc-panel p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/30"><Icon size={14} className="text-[#d9a7ff]" /></div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{tx.description}</p>
              <p className="text-xs text-white/35">{formatDate(tx.createdAt)}</p>
            </div>
<<<<<<< HEAD
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-[#f2f4ec] truncate">{tx.description}</p>
              <p className="text-[9px] text-[#aab0a3]">{formatDate(tx.createdAt)}</p>
            </div>
            <div className="text-right shrink-0">
              <p className={`text-[11px] font-black ${tx.amount < 0 ? "text-[#ef5350]" : "text-[#fdd835]"}`}>
                {tx.amount < 0 ? "-" : "+"}{Math.abs(tx.amount).toFixed(2)} $SLS
              </p>
              <p className="text-[9px] text-[#d0d5ca]">{tx.usdValue.toFixed(2)}</p>
=======
            <div className="text-right">
              <p className={`text-sm font-black ${tx.amount < 0 ? "text-[#ff8d8d]" : "text-[#ffd36b]"}`}>{tx.amount < 0 ? "-" : "+"}{Math.abs(tx.amount).toFixed(2)} $SLS</p>
              <p className="text-xs text-white/35">{tx.usdValue.toFixed(2)}</p>
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function BlackMarketPage() {
  const slsBalance = useSLSBalance();
  const [profile, setProfile] = useState<MeResponse | null>(null);
  const [slsPrice, setSlsPrice] = useState<number | null>(null);
  const [rotation, setRotation] = useState<Rotation | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [tab, setTab] = useState<BlackMarketTab>("listings");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localSendHistory, setLocalSendHistory] = useState<SlsTransactionItem[]>([]);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [buyMessage, setBuyMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [meRes, rotationRes, listingsRes] = await Promise.all([
        api.get<MeResponse>("/me"),
        api.get<Rotation | { rotation: Rotation }>("/black-market/rotation").catch(() => null),
        api.get<Listing[] | { listings: Listing[] }>("/black-market/listings").catch(() => null),
      ]);
      setProfile(meRes.data);
      setRotation(rotationRes ? ("rotation" in rotationRes.data ? rotationRes.data.rotation : rotationRes.data) : null);
      setListings(listingsRes ? ((Array.isArray(listingsRes.data) ? listingsRes.data : listingsRes.data.listings) ?? []) : []);
      setError(null);
    } catch (err) {
      setError(extractErrMsg(err, "Failed to load black market."));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPrice = useCallback(async () => {
    try {
      const res = await api.get<{ price: number }>("/sls/price");
      setSlsPrice(res.data.price);
    } catch {
      setSlsPrice(null);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchPrice();
  }, [fetchData, fetchPrice]);

  const buyListing = async (listingId: string) => {
    try {
      setBuyingId(listingId);
      setBuyMessage(null);
      await api.post("/black-market/buy", { listingId, qty: 1 });
      setBuyMessage("Purchase recorded. Wallet cash, stock, and inventory have been updated.");
      await fetchData();
    } catch (err) {
      setError(extractErrMsg(err, "Purchase failed."));
    } finally {
      setBuyingId(null);
    }
  };

  const tabs: Array<{ id: BlackMarketTab; label: string; icon: typeof ShoppingBag }> = [
    { id: "listings", label: "Listings", icon: ShoppingBag },
    { id: "swap", label: "Get $SLS", icon: ArrowLeftRight },
    { id: "sell", label: "Sell $SLS", icon: CircleDollarSign },
    { id: "send", label: "Send $SLS", icon: Send },
    { id: "hospital", label: "Hospital", icon: Clock3 },
    { id: "history", label: "History", icon: History },
  ];

  const activeOperation = tab === "listings" ? null : OPERATION_COPY[tab];

<<<<<<< HEAD
      <div className="h-28 rounded-lg overflow-hidden border border-white/10 bg-black/20 backdrop-blur-sm flex items-end relative">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a0a2e] via-[#0a0a1a] to-black" />
        <div className="relative z-10 px-3 pb-3 flex items-end gap-2">
          <ShoppingBag size={18} className="text-[#9945FF] mb-0.5" />
          <div>
            <p className="text-[10px] font-black text-[#9945FF] tracking-[3px] uppercase">Black Market</p>
            <p className="text-[11px] font-semibold text-[#d0d5ca]">$SLS utility — swap, sell, send, and more</p>
=======
  if (loading) return <div className="flex min-h-dvh items-center justify-center"><LoadingSpinner size={32} /></div>;
  if (!profile) return <div className="flex min-h-dvh items-center justify-center text-red-300">{error ?? "Failed to load profile."}</div>;

  return (
    <div className="space-y-6 pb-12">
      <section className="sc-panel-strong overflow-hidden p-6 md:p-7">
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="sc-kicker">BLACK MARKET</span>
              {rotation?.theme ? <span className="sc-chip sc-chip-purple">{rotation.theme}</span> : null}
            </div>
            <div>
              <h1 className="sc-page-title">Organized illicit inventory and utility</h1>
              <p className="sc-subtitle max-w-3xl">
                The live illegal item rotation now sits in front, while swap, sell, send, hospital, and history remain accessible as clearly separated operations instead of feeling mixed together.
              </p>
            </div>
            <SLSOverview cash={profile.cash} slsBalance={slsBalance} slsPrice={slsPrice} slsSpent={profile.slsSpent} heat={profile.heat ?? 0} />
          </div>
          <div className="sc-panel p-5">
            <div className="sc-kicker">MARKET BRIEF</div>
            <div className="mt-3 text-2xl font-black text-white">{rotation?.theme ?? "street cache"}</div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4"><div className="sc-label">Status</div><div className="mt-2 text-lg font-semibold text-white">{String(rotation?.status ?? "active").replaceAll("_", " ")}</div></div>
              <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4"><div className="sc-label">Ends</div><div className="mt-2 text-lg font-semibold text-white">{formatDate(rotation?.endsAt)}</div></div>
            </div>
            {buyMessage ? <div className="mt-4 rounded-[20px] border border-[#7ef0c5]/20 bg-[#7ef0c5]/10 px-4 py-3 text-sm text-[#d8fff1]">{buyMessage}</div> : null}
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
          </div>
        </div>
      </section>

      <section className="flex flex-wrap gap-2">
        {tabs.map(({ id, label, icon: Icon }) => (
<<<<<<< HEAD
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-1 py-2 border text-[9px] font-black tracking-[1px] uppercase flex flex-col items-center gap-1 ${
              tab === id
                ? "bg-[#1a0a2e] border-[rgba(153,69,255,0.3)] text-[#9945FF]"
                : "bg-black/20 border-white/10 text-[#aab0a3]"
            }`}
          >
=======
          <button key={id} onClick={() => setTab(id)} className={tab === id ? "sc-button sc-button-primary" : "sc-button"}>
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
            <Icon size={14} />
            {label}
          </button>
        ))}
      </section>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      {tab === "listings" ? <ListingsPanel profile={profile} rotation={rotation} listings={listings} buyingId={buyingId} onBuy={buyListing} /> : null}

      {activeOperation ? (
        <section className="space-y-4">
          <div className="sc-panel p-5">
            <div className="sc-kicker">{activeOperation.title}</div>
            <p className="mt-2 text-sm leading-6 text-white/60">{activeOperation.description}</p>
          </div>
          {tab === "swap" ? <GetSLSPanel /> : null}
          {tab === "sell" ? <SellSLSPanel onSold={fetchData} /> : null}
          {tab === "send" ? <SendSLSPanel onSendComplete={(entry) => setLocalSendHistory((prev) => [entry, ...prev])} /> : null}
          {tab === "hospital" ? <HospitalPanel profile={profile} onRefresh={fetchData} /> : null}
          {tab === "history" ? <HistoryPanel localEntries={localSendHistory} /> : null}
        </section>
      ) : null}
    </div>
  );
<<<<<<< HEAD
}

=======
}
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
