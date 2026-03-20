"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { api } from "@/lib/api/client";
import { StatusBars, type ProfileStats } from "@/components/ui/StatusBars";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useSLSBalance } from "@/hooks/useSLSBalance";
import {
  ArrowLeftRight,
  Clock,
  DollarSign,
  History,
  ShoppingBag,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SOL_MINT_STR = "So11111111111111111111111111111111111111112";
const SLS_MINT_STR = "ELTXCFp1tmtfu39CPw6afnMSjW1BBxjinorJQsKmBAGS";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BlackMarketTab = "swap" | "hospital" | "history";

interface MeData extends ProfileStats {
  wallet: string;
  hospitalUntil: string;
  inHospital: boolean;
  slsSpent: number;
}

interface SlsQuote {
  outAmount: string;
  priceImpactPct: string;
  routePlan: Array<{ outputMintDecimals: number }>;
  [key: string]: unknown;
}

interface SlsTransaction {
  id: string;
  type: string;
  amount: number;
  usdValue: number;
  description: string;
  createdAt: string;
}

type SwapPhase = "idle" | "quoting" | "quoted" | "done" | "error";
type ReleasePhase = "idle" | "requesting" | "quoted" | "signing" | "confirming" | "done" | "error";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractErrMsg(e: unknown, fallback: string): string {
  if (typeof e === "object" && e !== null) {
    const o = e as Record<string, unknown>;
    if (typeof o.message === "string") return o.message;
    const resp = o.response as Record<string, unknown> | undefined;
    const data = resp?.data as Record<string, unknown> | undefined;
    if (typeof data?.error === "string") return data.error;
  }
  return fallback;
}

function formatDuration(ms: number): string {
  if (ms <= 0) return "0s";
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const SUBSCRIPT_DIGITS: Record<string, string> = {
  "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄",
  "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
};

function formatSmallPrice(price: number): string {
  if (price <= 0) return "$0";
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;

  // Count leading zeros in the decimal expansion
  const frac = price.toFixed(20).split(".")[1]!;
  let zeros = 0;
  for (const ch of frac) {
    if (ch === "0") zeros++;
    else break;
  }

  // 4 significant digits after the leading zeros
  const sig = frac.slice(zeros, zeros + 4);
  const sub = String(zeros).split("").map((d) => SUBSCRIPT_DIGITS[d] ?? d).join("");
  return `$0.0${sub}${sig}`;
}

// ---------------------------------------------------------------------------
// SLS Overview strip (always shown)
// ---------------------------------------------------------------------------

function SLSOverview({
  slsBalance,
  slsPrice,
  slsSpent,
}: {
  slsBalance: number | null;
  slsPrice: number | null;
  slsSpent: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-3 text-center">
        <p className="text-[9px] font-bold tracking-[2px] text-[#555] mb-1">YOUR $SLS</p>
        <p className="text-sm font-black text-[#9945FF]">
          {slsBalance !== null ? slsBalance.toFixed(2) : "—"}
        </p>
      </div>
      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-3 text-center">
        <p className="text-[9px] font-bold tracking-[2px] text-[#555] mb-1">PRICE</p>
        <p className="text-sm font-black text-[#eee]">
          {slsPrice !== null ? formatSmallPrice(slsPrice) : "—"}
        </p>
      </div>
      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-3 text-center">
        <p className="text-[9px] font-bold tracking-[2px] text-[#555] mb-1">SPENT</p>
        <p className="text-sm font-black text-[#fdd835]">{slsSpent.toFixed(2)}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Get $SLS swap panel (moved from shop)
// ---------------------------------------------------------------------------

function GetSLSPanel() {
  const { connection } = useConnection();
  const { publicKey, signTransaction, connected } = useWallet();
  const slsBalance = useSLSBalance();

  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [solInput, setSolInput] = useState("");
  const [phase, setPhase] = useState<SwapPhase>("idle");
  const [swapPending, setSwapPending] = useState(false);
  const [quote, setQuote] = useState<SlsQuote | null>(null);
  const [slsOut, setSlsOut] = useState<number | null>(null);
  const [priceImpact, setPriceImpact] = useState<string | null>(null);
  const [txSig, setTxSig] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!publicKey) { setSolBalance(null); return; }
    let cancelled = false;
    connection.getBalance(publicKey)
      .then((lamps) => { if (!cancelled) setSolBalance(lamps / 1e9); })
      .catch(() => { if (!cancelled) setSolBalance(null); });
    return () => { cancelled = true; };
  }, [connection, publicKey]);

  const resetQuote = () => { setQuote(null); setSlsOut(null); setPriceImpact(null); setError(null); };

  const getQuote = async () => {
    const sol = parseFloat(solInput);
    if (isNaN(sol) || sol <= 0) { setError("Enter a valid SOL amount."); return; }
    setPhase("quoting"); setError(null); setQuote(null); setSlsOut(null);
    try {
      const res = await api.get<{ quote: SlsQuote }>("/bags/quote", {
        params: { inputMint: SOL_MINT_STR, outputMint: SLS_MINT_STR, amount: Math.floor(sol * 1e9) },
      });
      const q = res.data.quote;
      const lastLeg = q.routePlan[q.routePlan.length - 1];
      const decimals = lastLeg?.outputMintDecimals ?? 9;
      setSlsOut(parseInt(q.outAmount, 10) / Math.pow(10, decimals));
      setPriceImpact(q.priceImpactPct);
      setQuote(q);
      setPhase("quoted");
    } catch (e) {
      setError(extractErrMsg(e, "Failed to get quote. Please try again."));
      setPhase("error");
    }
  };

  const confirmSwap = async () => {
    if (!publicKey || !signTransaction || !quote) return;
    setSwapPending(true); setError(null);
    try {
      const res = await api.post<{ transaction: string; lastValidBlockHeight: number }>(
        "/bags/swap",
        { quoteResponse: quote, userPublicKey: publicKey.toBase58() }
      );
      const { transaction: txBase64, lastValidBlockHeight } = res.data;
      const txBytes = Uint8Array.from(Buffer.from(txBase64, "base64"));
      const transaction = VersionedTransaction.deserialize(txBytes);
      const signed = await signTransaction(transaction);
      const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false, maxRetries: 3 });
      await connection.confirmTransaction({ signature: sig, blockhash: transaction.message.recentBlockhash, lastValidBlockHeight });
      setTxSig(sig);
      connection.getBalance(publicKey).then((lamps) => setSolBalance(lamps / 1e9)).catch(() => {});
      setPhase("done");
    } catch (e) {
      setError(extractErrMsg(e, "Swap failed. Please try again."));
      setPhase("error");
    } finally {
      setSwapPending(false);
    }
  };

  if (!connected || !publicKey) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12">
        <Wallet size={32} className="text-[#555]" />
        <p className="text-[#555] text-[11px] font-bold tracking-[2px]">CONNECT WALLET TO SWAP</p>
      </div>
    );
  }

  const isLoading = phase === "quoting" || swapPending;
  const solAmt = parseFloat(solInput);
  const canQuote = !isNaN(solAmt) && solAmt > 0 && !isLoading;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-1.5">
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-3 text-center">
          <p className="text-[9px] font-bold tracking-[2px] text-[#555] mb-1">YOUR SOL</p>
          <p className="text-sm font-bold text-[#eee]">{solBalance !== null ? solBalance.toFixed(4) : "—"} SOL</p>
        </div>
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-3 text-center">
          <p className="text-[9px] font-bold tracking-[2px] text-[#555] mb-1">YOUR $SLS</p>
          <p className="text-sm font-bold text-[#9945FF]">{slsBalance !== null ? slsBalance.toFixed(2) : "—"} $SLS</p>
        </div>
      </div>

      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-3 flex flex-col gap-2">
        <p className="text-[9px] font-bold tracking-[2px] text-[#555]">SOL TO SWAP</p>
        <div className="flex items-center gap-2">
          <input
            type="number" min="0" step="0.01" placeholder="0.00" value={solInput}
            onChange={(e) => {
              setSolInput(e.target.value);
              if (phase === "quoted" || phase === "done" || phase === "error") { setPhase("idle"); resetQuote(); }
            }}
            disabled={isLoading}
            className="flex-1 bg-black/20 text-[#eee] border border-white/10 rounded-md px-3 py-2 text-sm font-bold focus:outline-none focus:border-[rgba(153,69,255,0.5)] disabled:opacity-40"
          />
          <span className="text-[#888] text-sm font-bold flex-shrink-0">SOL</span>
        </div>
      </div>

      {phase === "quoted" && slsOut !== null && (
        <div className="bg-[#0a0a1a] border border-[rgba(153,69,255,0.3)] rounded-md p-3 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold tracking-[2px] text-[#555]">YOU RECEIVE</span>
            <span className="text-[#9945FF] text-sm font-black">{slsOut.toFixed(2)} $SLS</span>
          </div>
          {priceImpact !== null && (
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold tracking-[2px] text-[#555]">PRICE IMPACT</span>
              <span className={`text-[10px] font-bold ${parseFloat(priceImpact) > 5 ? "text-[#ef5350]" : parseFloat(priceImpact) > 1 ? "text-[#fdd835]" : "text-[#66bb6a]"}`}>
                {parseFloat(priceImpact).toFixed(4)}%
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold tracking-[2px] text-[#555]">SLIPPAGE</span>
            <span className="text-[10px] font-bold text-[#888]">auto</span>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-[#1a0a0a] border border-[#7f1919] rounded-md px-3 py-2">
          <p className="text-[#ef5350] text-[11px] font-bold">{error}</p>
        </div>
      )}

      {phase === "done" && txSig && (
        <div className="bg-[#0a1a0a] border border-[#1a4a1a] rounded-md px-3 py-2 flex flex-col gap-1">
          <p className="text-[#66bb6a] text-[11px] font-bold">Swap confirmed!</p>
          <p className="text-[#555] text-[9px] font-mono break-all">{txSig}</p>
        </div>
      )}

      {phase !== "done" ? (
        phase === "quoted" ? (
          <div className="flex gap-2">
            <button onClick={() => { setPhase("idle"); resetQuote(); }} disabled={isLoading}
              className="flex-1 py-2.5 rounded-md border border-white/10 bg-black/20 text-[#555] text-[11px] font-bold tracking-[2px] hover:text-[#888] disabled:opacity-40 transition-colors">
              CANCEL
            </button>
            <button onClick={confirmSwap} disabled={isLoading}
              className="flex-1 py-2.5 rounded-md border border-[rgba(153,69,255,0.3)] bg-[#1a0a2e] text-[#9945FF] text-[11px] font-bold tracking-[2px] flex items-center justify-center gap-1.5 hover:bg-[#2a0a3e] disabled:opacity-40 transition-colors">
              {swapPending ? <LoadingSpinner size={16} color="#9945FF" /> : <><ArrowLeftRight size={14} /> CONFIRM SWAP</>}
            </button>
          </div>
        ) : (
          <button onClick={getQuote} disabled={!canQuote}
            className="w-full py-2.5 rounded-md border border-[rgba(153,69,255,0.3)] bg-[#1a0a2e] text-[#9945FF] text-[11px] font-bold tracking-[2px] flex items-center justify-center gap-1.5 hover:bg-[#2a0a3e] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {phase === "quoting" ? <LoadingSpinner size={16} color="#9945FF" /> : <><ArrowLeftRight size={14} /> GET QUOTE</>}
          </button>
        )
      ) : (
        <button onClick={() => { setPhase("idle"); setSolInput(""); setTxSig(null); resetQuote(); }}
          className="w-full py-2.5 rounded-md border border-[rgba(153,69,255,0.3)] bg-[#1a0a2e] text-[#9945FF] text-[11px] font-bold tracking-[2px] flex items-center justify-center gap-1.5 hover:bg-[#2a0a3e] transition-colors">
          <ArrowLeftRight size={14} /> SWAP AGAIN
        </button>
      )}

      <p className="text-[9px] text-[#333] text-center">Powered by Bags</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hospital release panel
// ---------------------------------------------------------------------------

interface ReleaseQuote {
  costSls: number;
  costUsd: number;
  minutesRemaining: number;
  multiplier: number;
  slsPrice: number;
  transaction: string;
  lastValidBlockHeight: number;
  blockhash: string;
}

function HospitalPanel({
  profile,
  onReleased,
}: {
  profile: MeData;
  onReleased: () => void;
}) {
  const { connection } = useConnection();
  const { publicKey, signTransaction, connected } = useWallet();

  const [phase, setPhase] = useState<ReleasePhase>("idle");
  const [releaseQuote, setReleaseQuote] = useState<ReleaseQuote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const hospitalUntilMs = new Date(profile.hospitalUntil).getTime();

  // Live countdown
  useEffect(() => {
    if (!profile.inHospital) return;
    const tick = () => setTimeLeft(Math.max(0, hospitalUntilMs - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [profile.inHospital, hospitalUntilMs]);

  if (!profile.inHospital) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12">
        <div className="w-12 h-12 rounded-full bg-[#0a1a0a] border border-[#1a4a1a] flex items-center justify-center">
          <Zap size={20} className="text-[#66bb6a]" />
        </div>
        <p className="text-[#66bb6a] text-[11px] font-bold tracking-[2px]">YOU ARE NOT HOSPITALIZED</p>
        <p className="text-[#555] text-[10px]">You are free to roam Solus City</p>
      </div>
    );
  }

  const requestRelease = async () => {
    setPhase("requesting"); setError(null);
    try {
      const res = await api.post<ReleaseQuote>("/hospital/release");
      setReleaseQuote(res.data);
      setPhase("quoted");
    } catch (e) {
      setError(extractErrMsg(e, "Failed to calculate release cost."));
      setPhase("error");
    }
  };

  const confirmRelease = async () => {
    if (!releaseQuote || !publicKey || !signTransaction) return;
    setPhase("signing"); setError(null);
    try {
      const txBytes = Buffer.from(releaseQuote.transaction, "base64");
      const tx = Transaction.from(txBytes);

      const signed = await signTransaction(tx as Transaction & VersionedTransaction);
      setPhase("confirming");

      const sig = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
      });
      await connection.confirmTransaction({
        signature: sig,
        blockhash: releaseQuote.blockhash,
        lastValidBlockHeight: releaseQuote.lastValidBlockHeight,
      });

      await api.post("/hospital/confirm", { signature: sig });
      setPhase("done");
      onReleased();
    } catch (e) {
      setError(extractErrMsg(e, "Release failed. Please try again."));
      setPhase("error");
    }
  };

  const isLoading = phase === "requesting" || phase === "signing" || phase === "confirming";

  if (phase === "done") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12">
        <div className="w-12 h-12 rounded-full bg-[#0a1a0a] border border-[#1a4a1a] flex items-center justify-center">
          <Zap size={20} className="text-[#66bb6a]" />
        </div>
        <p className="text-[#66bb6a] text-[11px] font-bold tracking-[2px]">RELEASED FROM HOSPITAL</p>
        <p className="text-[#555] text-[10px]">You are free to roam Solus City</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Status card */}
      <div className="bg-[#1a0a0a] border border-[#7f1919] rounded-lg p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#2a0a0a] border border-[#7f1919] flex items-center justify-center">
            <Clock size={14} className="text-[#ef5350]" />
          </div>
          <div>
            <p className="text-[#ef5350] text-[11px] font-bold tracking-[2px]">HOSPITALIZED</p>
            <p className="text-[#555] text-[9px]">Time remaining</p>
          </div>
          <span className="ml-auto font-mono text-[#ef5350] font-bold text-sm">
            {formatDuration(timeLeft)}
          </span>
        </div>
      </div>

      {/* Quote breakdown */}
      {phase === "quoted" && releaseQuote && (
        <div className="bg-[#0a0a1a] border border-[rgba(153,69,255,0.3)] rounded-lg p-4 flex flex-col gap-2">
          <p className="text-[9px] font-bold tracking-[2px] text-[#555] mb-1">RELEASE COST</p>
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-[#888]">{releaseQuote.minutesRemaining}min remaining</span>
            <span className="text-[#9945FF] font-bold text-sm">{releaseQuote.costSls.toFixed(4)} $SLS</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-[#888]">USD equivalent</span>
            <span className="text-[#eee] text-[11px] font-bold">${releaseQuote.costUsd.toFixed(2)}</span>
          </div>
          {releaseQuote.multiplier > 1 && (
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-[#888]">Daily multiplier</span>
              <span className="text-[#fdd835] text-[11px] font-bold">{releaseQuote.multiplier}×</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-[#888]">$SLS price</span>
            <span className="text-[#555] text-[10px]">{formatSmallPrice(releaseQuote.slsPrice)}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-[#1a0a0a] border border-[#7f1919] rounded-md px-3 py-2">
          <p className="text-[#ef5350] text-[11px] font-bold">{error}</p>
        </div>
      )}

      {!connected || !publicKey ? (
        <div className="flex flex-col items-center gap-2 py-4">
          <Wallet size={24} className="text-[#555]" />
          <p className="text-[#555] text-[11px] font-bold tracking-[2px]">CONNECT WALLET TO PAY</p>
        </div>
      ) : phase === "idle" || phase === "error" ? (
        <button onClick={requestRelease} disabled={isLoading}
          className="w-full py-2.5 rounded-md border border-[rgba(153,69,255,0.3)] bg-[#1a0a2e] text-[#9945FF] text-[11px] font-bold tracking-[2px] flex items-center justify-center gap-1.5 hover:bg-[#2a0a3e] disabled:opacity-40 transition-colors">
          <DollarSign size={14} /> PAY $SLS TO LEAVE NOW
        </button>
      ) : phase === "quoted" ? (
        <div className="flex gap-2">
          <button onClick={() => { setPhase("idle"); setReleaseQuote(null); setError(null); }} disabled={isLoading}
            className="flex-1 py-2.5 rounded-md border border-white/10 bg-black/20 text-[#555] text-[11px] font-bold tracking-[2px] hover:text-[#888] disabled:opacity-40 transition-colors">
            CANCEL
          </button>
          <button onClick={confirmRelease} disabled={isLoading}
            className="flex-1 py-2.5 rounded-md border border-[rgba(153,69,255,0.3)] bg-[#1a0a2e] text-[#9945FF] text-[11px] font-bold tracking-[2px] flex items-center justify-center gap-1.5 hover:bg-[#2a0a3e] disabled:opacity-40 transition-colors">
            <DollarSign size={14} /> CONFIRM PAYMENT
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 py-2.5">
          <LoadingSpinner size={16} color="#9945FF" />
          <span className="text-[#9945FF] text-[11px] font-bold tracking-[2px]">
            {phase === "requesting" ? "CALCULATING COST..." : phase === "signing" ? "SIGN IN WALLET..." : "CONFIRMING ON-CHAIN..."}
          </span>
        </div>
      )}

      <p className="text-[9px] text-[#333] text-center">
        Cost: $0.25 per 10min · doubles each release per day
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Transaction history panel
// ---------------------------------------------------------------------------

function HistoryPanel() {
  const [transactions, setTransactions] = useState<SlsTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ transactions: SlsTransaction[] }>("/sls/transactions")
      .then((res) => setTransactions(res.data.transactions))
      .catch(() => setTransactions([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size={24} />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12">
        <History size={28} className="text-[#555]" />
        <p className="text-[#555] text-[11px] font-bold tracking-[2px]">NO TRANSACTIONS YET</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {transactions.map((tx) => (
        <div key={tx.id} className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-3 flex items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5 min-w-0">
            <p className="text-[#eee] text-[11px] font-bold truncate">{tx.description}</p>
            <p className="text-[#555] text-[9px]">{formatDate(tx.createdAt)}</p>
          </div>
          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
            <span className="text-[#ef5350] text-[12px] font-black">-{tx.amount.toFixed(2)} $SLS</span>
            <span className="text-[#555] text-[9px]">${tx.usdValue.toFixed(2)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BlackMarketPage() {
  const [profile, setProfile] = useState<MeData | null>(null);
  const [slsPrice, setSlsPrice] = useState<number | null>(null);
  const [tab, setTab] = useState<BlackMarketTab>("swap");
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const slsBalance = useSLSBalance();

  const fetchProfile = useCallback(async () => {
    try {
      const res = await api.get<MeData>("/me");
      setProfile(res.data);
    } catch {
      setPageError("Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPrice = useCallback(async () => {
    try {
      const res = await api.get<{ price: number }>("/sls/price");
      setSlsPrice(res.data.price);
    } catch {
      /* price unavailable — non-fatal */
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    fetchPrice();
  }, [fetchProfile, fetchPrice]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="flex flex-col min-h-dvh items-center justify-center gap-4 px-6">
        <p className="text-[#ef5350] text-sm text-center">{pageError}</p>
        <button onClick={() => { setLoading(true); setPageError(null); fetchProfile(); }}
          className="px-5 py-2.5 bg-[#9945FF] rounded-lg text-white font-semibold text-sm">
          Retry
        </button>
      </div>
    );
  }

  const TABS: { id: BlackMarketTab; label: string; icon: typeof ArrowLeftRight }[] = [
    { id: "swap", label: "GET $SLS", icon: ArrowLeftRight },
    { id: "hospital", label: "HOSPITAL", icon: Clock },
    { id: "history", label: "HISTORY", icon: History },
  ];

  return (
    <div className="flex flex-col bg-transparent min-h-dvh">
      {profile && <StatusBars profile={profile} />}

      <div className="flex flex-col gap-3">
        {/* Hero banner */}
        <div className="h-28 rounded-lg overflow-hidden border border-white/10 bg-black/20 backdrop-blur-sm flex items-end relative">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a0a2e] via-[#0a0a1a] to-black" />
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 24px,rgba(153,69,255,0.3) 25px),repeating-linear-gradient(90deg,transparent,transparent 24px,rgba(153,69,255,0.3) 25px)" }} />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          <div className="relative z-10 px-3 pb-3 flex items-end gap-2">
            <ShoppingBag size={18} className="text-[#9945FF] mb-0.5" />
            <div>
              <p className="text-[10px] font-black text-[#9945FF] tracking-[3px] uppercase">Black Market</p>
              <p className="text-[11px] font-semibold text-text-dim">$SLS hub — swap, spend &amp; escape</p>
            </div>
          </div>
        </div>

        {/* SLS overview strip */}
        <SLSOverview
          slsBalance={slsBalance}
          slsPrice={slsPrice}
          slsSpent={profile?.slsSpent ?? 0}
        />

        {/* Tab bar */}
        <div className="flex gap-2">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 py-2 rounded-lg border text-[10px] font-black tracking-[2px] uppercase transition-colors ${
                tab === id
                  ? "bg-[#1a0a2e] border-[rgba(153,69,255,0.3)] text-[#9945FF]"
                  : "bg-black/20 backdrop-blur-sm border-white/10 text-text-dim hover:text-text-secondary"
              }`}>
              <span className="inline-flex items-center justify-center gap-1">
                <Icon className="w-3.5 h-3.5" />
                {label}
              </span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="pb-4">
          {tab === "swap" && <GetSLSPanel />}
          {tab === "hospital" && profile && (
            <HospitalPanel
              profile={profile}
              onReleased={() => fetchProfile()}
            />
          )}
          {tab === "history" && <HistoryPanel />}
        </div>

        <div className="h-16 md:hidden" />
      </div>
    </div>
  );
}
