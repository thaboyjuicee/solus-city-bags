"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { createTransferInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";
import {
  ArrowLeftRight,
  ArrowUpFromLine,
  CircleDollarSign,
  Clock3,
  HeartPulse,
  History,
  Send,
  ShoppingBag,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { StatusBars } from "@/components/ui/StatusBars";
import { HospitalOptionsCard } from "@/components/game/HospitalOptionsCard";
import { SLS_BALANCE_REFRESH_EVENT, useSLSBalance } from "@/hooks/useSLSBalance";
import { MeResponse } from "@/lib/gameApi";

type BlackMarketTab = "swap" | "sell" | "send" | "hospital" | "history";

type SlsQuote = {
  outAmount: string;
  priceImpactPct: string;
  routePlan: Array<{ outputMintDecimals: number }>;
  [key: string]: unknown;
};

type SwapBuildResponse = {
  transaction: string;
  lastValidBlockHeight: number;
};

type SellQuote = {
  slsAmount: number;
  cashToReceive: number;
  transaction: string;
  blockhash: string;
  lastValidBlockHeight: number;
};

type SlsTransactionItem = {
  id: string;
  type: string;
  amount: number;
  usdValue: number;
  description: string;
  createdAt: string;
};

function decodeBase64(value: string) {
  const raw = atob(value);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

function extractErrMsg(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
    (err as { message?: string })?.message ??
    fallback
  );
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(price: number | null) {
  if (price === null) return "-";
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toPrecision(3)}`;
}

function SLSOverview({
  cash,
  slsBalance,
  slsPrice,
  slsSpent,
}: {
  cash: number;
  slsBalance: number | null;
  slsPrice: number | null;
  slsSpent: number;
}) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-3 text-center">
        <p className="text-[9px] font-bold tracking-[2px] text-[#555] mb-1">CASH</p>
        <p className="text-sm font-black text-[#66bb6a]">${Math.floor(cash).toLocaleString()}</p>
      </div>
      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-3 text-center">
        <p className="text-[9px] font-bold tracking-[2px] text-[#555] mb-1">$SLS</p>
        <p className="text-sm font-black text-[#9945FF]">{slsBalance !== null ? slsBalance.toFixed(2) : "-"}</p>
      </div>
      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-3 text-center">
        <p className="text-[9px] font-bold tracking-[2px] text-[#555] mb-1">PRICE</p>
        <p className="text-sm font-black text-[#eee]">{formatPrice(slsPrice)}</p>
      </div>
      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-3 text-center">
        <p className="text-[9px] font-bold tracking-[2px] text-[#555] mb-1">SPENT</p>
        <p className="text-sm font-black text-[#fdd835]">{slsSpent.toFixed(2)}</p>
      </div>
    </div>
  );
}

function ConnectPrompt({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <Wallet size={28} className="text-[#555]" />
      <p className="text-[#555] text-[11px] font-bold tracking-[2px]">{label}</p>
    </div>
  );
}

const SLS_MINT = new PublicKey("ELTXCFp1tmtfu39CPw6afnMSjW1BBxjinorJQsKmBAGS");
const SLS_DECIMALS = 9;

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
    if (!recipient.trim() || isNaN(parsed) || parsed <= 0) {
      setError("Enter a valid recipient and amount.");
      return;
    }
    if (slsBalance !== null && parsed > slsBalance) {
      setError("You do not have enough $SLS.");
      return;
    }
    if (!publicKey || !signTransaction) return;

    let recipientPubkey: PublicKey;
    try {
      recipientPubkey = new PublicKey(recipient.trim());
    } catch {
      setError("Invalid Solana wallet address.");
      return;
    }

    setPhase("sending");
    setError(null);

    try {
      const senderATA = getAssociatedTokenAddressSync(SLS_MINT, publicKey);
      const recipientATA = getAssociatedTokenAddressSync(SLS_MINT, recipientPubkey);
      const lamports = BigInt(Math.floor(parsed * Math.pow(10, SLS_DECIMALS)));

      const transferIx = createTransferInstruction(
        senderATA,
        recipientATA,
        publicKey,
        lamports
      );

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      const transaction = new Transaction({ recentBlockhash: blockhash, feePayer: publicKey }).add(transferIx);

      const signed = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
      });
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight });

      window.dispatchEvent(new Event(SLS_BALANCE_REFRESH_EVENT));
      onSendComplete({
        id: signature,
        type: "send",
        amount: -parsed,
        usdValue: 0,
        description: `Sent ${parsed.toFixed(2)} $SLS to ${recipient.trim().slice(0, 8)}...`,
        createdAt: new Date().toISOString(),
      });

      setPhase("done");
      setRecipient("");
      setAmount("");
    } catch (err) {
      setError(extractErrMsg(err, "Transfer failed."));
      setPhase("idle");
    }
  };

  if (!connected || !publicKey || !signTransaction) {
    return <ConnectPrompt label="CONNECT WALLET TO SEND" />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-3 text-center">
        <p className="text-[9px] font-bold tracking-[2px] text-[#555] mb-1">YOUR $SLS</p>
        <p className="text-sm font-black text-[#9945FF]">{slsBalance !== null ? slsBalance.toFixed(2) : "-"}</p>
      </div>

      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-3">
        <p className="text-[9px] font-bold tracking-[2px] text-[#555] mb-2">RECIPIENT WALLET</p>
        <input
          type="text"
          placeholder="Solana wallet address"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          className="w-full bg-black/20 border border-white/10 rounded-md px-3 py-2 text-sm font-black text-[#eee] outline-none placeholder:text-[#333]"
        />
      </div>

      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-3">
        <p className="text-[9px] font-bold tracking-[2px] text-[#555] mb-2">AMOUNT ($SLS)</p>
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full bg-black/20 border border-white/10 rounded-md px-3 py-2 text-sm font-black text-[#eee] outline-none"
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
    if (!publicKey) {
      setSolBalance(null);
      return;
    }

    let cancelled = false;
    connection.getBalance(publicKey)
      .then((lamports) => {
        if (!cancelled) setSolBalance(lamports / 1e9);
      })
      .catch(() => {
        if (!cancelled) setSolBalance(null);
      });

    return () => {
      cancelled = true;
    };
  }, [connection, publicKey, phase]);

  const getQuote = async () => {
    const sol = parseFloat(solInput);
    if (isNaN(sol) || sol <= 0) {
      setError("Enter a valid SOL amount.");
      return;
    }

    setPhase("quoting");
    setError(null);

    try {
      const res = await api.get<{ quote: SlsQuote }>("/bags/quote", {
        params: {
          inputMint: "So11111111111111111111111111111111111111112",
          outputMint: "ELTXCFp1tmtfu39CPw6afnMSjW1BBxjinorJQsKmBAGS",
          amount: Math.floor(sol * 1e9),
        },
      });

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
      const res = await api.post<SwapBuildResponse>("/bags/swap", {
        quoteResponse: quote,
        userPublicKey: publicKey.toBase58(),
      });

      const transaction = VersionedTransaction.deserialize(decodeBase64(res.data.transaction));
      const signed = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
      });

      await connection.confirmTransaction({
        signature,
        blockhash: transaction.message.recentBlockhash,
        lastValidBlockHeight: res.data.lastValidBlockHeight,
      });

      setPhase("done");
    } catch (err) {
      setError(extractErrMsg(err, "Swap failed."));
      setPhase("quoted");
    }
  };

  if (!connected || !publicKey || !signTransaction) {
    return <ConnectPrompt label="CONNECT WALLET TO SWAP" />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-1.5">
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-3 text-center">
          <p className="text-[9px] font-bold tracking-[2px] text-[#555] mb-1">YOUR SOL</p>
          <p className="text-sm font-black text-[#eee]">{solBalance !== null ? solBalance.toFixed(4) : "-"}</p>
        </div>
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-3 text-center">
          <p className="text-[9px] font-bold tracking-[2px] text-[#555] mb-1">YOUR $SLS</p>
          <p className="text-sm font-black text-[#9945FF]">{slsBalance !== null ? slsBalance.toFixed(2) : "-"}</p>
        </div>
      </div>

      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-3">
        <p className="text-[9px] font-bold tracking-[2px] text-[#555] mb-2">SOL TO SWAP</p>
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={solInput}
          onChange={(e) => setSolInput(e.target.value)}
          className="w-full bg-black/20 border border-white/10 rounded-md px-3 py-2 text-sm font-black text-[#eee] outline-none"
        />
      </div>

      {slsOut !== null && (
        <div className="bg-[#0a0a1a] border border-[rgba(153,69,255,0.3)] rounded-md p-3">
          <p className="text-[9px] font-bold tracking-[2px] text-[#555] mb-1">ESTIMATED OUT</p>
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
    if (isNaN(slsAmount) || slsAmount <= 0) {
      setError("Enter a valid $SLS amount.");
      return;
    }
    if (slsBalance !== null && slsAmount > slsBalance) {
      setError("You do not have enough $SLS.");
      return;
    }

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
      const signature = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
      });

      await connection.confirmTransaction({
        signature,
        blockhash: quote.blockhash,
        lastValidBlockHeight: quote.lastValidBlockHeight,
      });

      await api.post("/sls/sell/confirm", { signature });
      setPhase("done");
      onSold();
    } catch (err) {
      setError(extractErrMsg(err, "Sell failed."));
      setPhase("quoted");
    }
  };

  if (!connected || !publicKey || !signTransaction) {
    return <ConnectPrompt label="CONNECT WALLET TO SELL" />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-1.5">
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-3 text-center">
          <p className="text-[9px] font-bold tracking-[2px] text-[#555] mb-1">YOUR $SLS</p>
          <p className="text-sm font-black text-[#9945FF]">{slsBalance !== null ? slsBalance.toFixed(2) : "-"}</p>
        </div>
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-3 text-center">
          <p className="text-[9px] font-bold tracking-[2px] text-[#555] mb-1">RATE</p>
          <p className="text-sm font-black text-[#eee]">50 $SLS / 1 CASH</p>
        </div>
      </div>

      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-3">
        <p className="text-[9px] font-bold tracking-[2px] text-[#555] mb-2">SELL $SLS</p>
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full bg-black/20 border border-white/10 rounded-md px-3 py-2 text-sm font-black text-[#eee] outline-none"
        />
      </div>

      {quote && (
        <div className="bg-[#0a0a1a] border border-[rgba(153,69,255,0.3)] rounded-md p-3">
          <p className="text-[9px] font-bold tracking-[2px] text-[#555] mb-1">YOU RECEIVE</p>
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
    </div>
  );
}

function HospitalPanel({
  profile,
  onRefresh,
}: {
  profile: MeResponse;
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black tracking-[2px] text-[#eee]">BLACK MARKET CLINIC</p>
          <span className={`text-[10px] font-bold ${profile.inHospital ? "text-[#ef5350]" : "text-[#66bb6a]"}`}>
            {profile.inHospital ? "HOSPITALIZED" : "CLEAR"}
          </span>
        </div>
        <p className="text-[10px] text-[#888] mt-2">
          Full release runs through the old $0.15-in-$SLS clinic flow again. Same-day full releases get more expensive, and recovery items or penalties still sit below as fallback options.
        </p>
        {profile.hospitalExitPenalty && (
          <p className="text-[10px] text-[#ff9800] mt-2">
            Active penalty: {profile.hospitalExitPenalty.type}
          </p>
        )}
      </div>
      <HospitalOptionsCard active={profile.inHospital} onUpdated={onRefresh} />
    </div>
  );
}

function getTxIcon(type: string) {
  if (type.includes("send")) return Send;
  if (type.includes("sell")) return ArrowUpFromLine;
  if (type.includes("hospital")) return HeartPulse;
  if (type.includes("swap") || type.includes("buy")) return ShoppingCart;
  return Clock3;
}

function HistoryPanel({ localEntries }: { localEntries: SlsTransactionItem[] }) {
  const [transactions, setTransactions] = useState<SlsTransactionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ transactions: SlsTransactionItem[] }>("/sls/transactions")
      .then((res) => setTransactions(res.data.transactions))
      .catch(() => setTransactions([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex justify-center py-12"><LoadingSpinner size={24} /></div>;
  }

  const all = [...localEntries, ...transactions];

  if (all.length === 0) {
    return <p className="text-[11px] text-[#555] text-center py-8">No transaction history yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {all.map((tx) => {
        const Icon = getTxIcon(tx.type);
        return (
          <div key={tx.id} className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-3 flex items-center gap-3">
            <div className="shrink-0 w-8 h-8 rounded-full bg-black/30 border border-white/10 flex items-center justify-center">
              <Icon size={14} className="text-[#9945FF]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-[#eee] truncate">{tx.description}</p>
              <p className="text-[9px] text-[#555]">{formatDate(tx.createdAt)}</p>
            </div>
            <div className="text-right shrink-0">
              <p className={`text-[11px] font-black ${tx.amount < 0 ? "text-[#ef5350]" : "text-[#fdd835]"}`}>
                {tx.amount < 0 ? "-" : "+"}{Math.abs(tx.amount).toFixed(2)} $SLS
              </p>
              <p className="text-[9px] text-[#888]">{tx.usdValue.toFixed(2)}</p>
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
  const [tab, setTab] = useState<BlackMarketTab>("swap");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localSendHistory, setLocalSendHistory] = useState<SlsTransactionItem[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const meRes = await api.get<MeResponse>("/me");
      setProfile(meRes.data);
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

  if (loading) {
    return <div className="flex min-h-dvh items-center justify-center"><LoadingSpinner size={32} /></div>;
  }

  if (!profile) {
    return <div className="flex min-h-dvh items-center justify-center text-[#ef5350]">{error ?? "Failed to load profile."}</div>;
  }

  const tabs: Array<{ id: BlackMarketTab; label: string; icon: typeof ShoppingBag }> = [
    { id: "swap", label: "Get $SLS", icon: ArrowLeftRight },
    { id: "sell", label: "Sell $SLS", icon: CircleDollarSign },
    { id: "send", label: "Send $SLS", icon: Send },
    { id: "hospital", label: "Hospital", icon: Clock3 },
    { id: "history", label: "History", icon: History },
  ];

  return (
    <div className="flex flex-col gap-3">
      <StatusBars profile={profile} />

      <div className="h-28 rounded-lg overflow-hidden border border-white/10 bg-black/20 backdrop-blur-sm flex items-end relative">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a0a2e] via-[#0a0a1a] to-black" />
        <div className="relative z-10 px-3 pb-3 flex items-end gap-2">
          <ShoppingBag size={18} className="text-[#9945FF] mb-0.5" />
          <div>
            <p className="text-[10px] font-black text-[#9945FF] tracking-[3px] uppercase">Black Market</p>
            <p className="text-[11px] font-semibold text-[#888]">$SLS utility — swap, sell, send, and more</p>
          </div>
        </div>
      </div>

      <SLSOverview cash={profile.cash} slsBalance={slsBalance} slsPrice={slsPrice} slsSpent={profile.slsSpent} />

      <div className="grid grid-cols-5">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-1 py-2 border text-[9px] font-black tracking-[1px] uppercase flex flex-col items-center gap-1 ${
              tab === id
                ? "bg-[#1a0a2e] border-[rgba(153,69,255,0.3)] text-[#9945FF]"
                : "bg-black/20 border-white/10 text-[#555]"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {error && <p className="text-[10px] font-bold text-[#ef5350]">{error}</p>}

      {tab === "swap" && <GetSLSPanel />}
      {tab === "sell" && <SellSLSPanel onSold={fetchData} />}
      {tab === "send" && <SendSLSPanel onSendComplete={(entry) => setLocalSendHistory((prev) => [entry, ...prev])} />}
      {tab === "hospital" && <HospitalPanel profile={profile} onRefresh={fetchData} />}
      {tab === "history" && <HistoryPanel localEntries={localSendHistory} />}

      <div className="h-16 md:hidden" />
    </div>
  );
}
