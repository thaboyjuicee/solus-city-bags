"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction, VersionedTransaction } from "@solana/web3.js";
import {
  ArrowLeftRight,
  CircleDollarSign,
  Clock3,
  Coins,
  History,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { StatusBars } from "@/components/ui/StatusBars";
import { HospitalOptionsCard } from "@/components/game/HospitalOptionsCard";
import { RarityBadge } from "@/components/game/RarityBadge";
import { useSLSBalance } from "@/hooks/useSLSBalance";
import {
  BlackMarketListing,
  BlackMarketRotation,
  MeResponse,
} from "@/lib/gameApi";

type BlackMarketTab = "listings" | "swap" | "sell" | "hospital" | "history";

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

function ListingsPanel({
  profile,
  rotation,
  listings,
  buyingId,
  onBuy,
}: {
  profile: MeResponse;
  rotation: BlackMarketRotation | null;
  listings: BlackMarketListing[];
  buyingId: string | null;
  onBuy: (listing: BlackMarketListing) => void;
}) {
  const grouped = useMemo(() => {
    return listings.reduce<Record<string, BlackMarketListing[]>>((acc, listing) => {
      acc[listing.listingType] = [...(acc[listing.listingType] ?? []), listing];
      return acc;
    }, {});
  }, [listings]);

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-white/10 bg-black/20 backdrop-blur-sm p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black tracking-[3px] text-[#9945FF] uppercase">Active Rotation</p>
            <p className="text-lg font-black text-[#eee]">{rotation?.theme?.toUpperCase() ?? "BLACK MARKET"}</p>
            <p className="text-[11px] text-[#555]">Heat {profile.heat} • Wanted {profile.wantedTier}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold tracking-[2px] text-[#555]">ENDS IN</p>
            <p className="text-sm font-black text-[#fdd835]">{formatTimeLeft(rotation?.secondsRemaining ?? 0)}</p>
          </div>
        </div>
      </div>

      {Object.entries(grouped).map(([group, entries]) => (
        <div key={group} className="flex flex-col gap-2">
          <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase">{group}</p>
          {entries.map((listing) => {
            const blockedByLevel = profile.level < listing.requiredLevelMin;
            const blockedByHeat = profile.heat < listing.requiredHeatMin;
            const blockedByCash = profile.cash < listing.finalPrice;
            const soldOut = listing.remainingStock <= 0;
            const disabled = blockedByLevel || blockedByHeat || blockedByCash || soldOut || buyingId === listing.id;

            return (
              <div key={listing.id} className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[13px] font-bold text-[#eee]">{listing.item.name}</p>
                    <p className="text-[10px] text-[#555]">{listing.item.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <RarityBadge rarity={listing.item.rarity} />
                    <span className="text-[10px] font-black text-[#66bb6a]">${Math.floor(listing.finalPrice).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                  <span className="text-[#42a5f5]">Stock {listing.remainingStock}/{listing.stock}</span>
                  <span className="text-[#fdd835]">Heat {listing.requiredHeatMin}+</span>
                  <span className="text-[#ff9800]">Level {listing.requiredLevelMin}+</span>
                  <span className="text-[#ef5350]">Risk {listing.riskPercent}%</span>
                  {listing.item.slot && <span className="text-[#9945FF]">Slot {listing.item.slot}</span>}
                  {listing.item.effectType && <span className="text-[#14F195]">{listing.item.effectType.replaceAll("_", " ")}</span>}
                </div>
                <button
                  onClick={() => onBuy(listing)}
                  disabled={disabled}
                  className="w-full py-2 rounded border border-[rgba(153,69,255,0.3)] bg-[#1a0a2e] text-[#9945FF] text-[10px] font-black tracking-[2px] disabled:opacity-40"
                >
                  {buyingId === listing.id ? "BUYING..." : soldOut ? "SOLD OUT" : "BUY"}
                </button>
              </div>
            );
          })}
        </div>
      ))}
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
          <p className="text-[10px] font-black tracking-[2px] text-[#eee]">HOSPITAL STATUS</p>
          <span className={`text-[10px] font-bold ${profile.inHospital ? "text-[#ef5350]" : "text-[#66bb6a]"}`}>
            {profile.inHospital ? "HOSPITALIZED" : "CLEAR"}
          </span>
        </div>
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

function HistoryPanel() {
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

  if (transactions.length === 0) {
    return <p className="text-[11px] text-[#555] text-center py-8">No transaction history yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {transactions.map((tx) => (
        <div key={tx.id} className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold text-[#eee]">{tx.description}</p>
            <p className="text-[9px] text-[#555]">{formatDate(tx.createdAt)}</p>
          </div>
          <div className="text-right">
            <p className={`text-[11px] font-black ${tx.amount < 0 ? "text-[#ef5350]" : "text-[#fdd835]"}`}>
              {tx.amount < 0 ? "-" : "+"}{Math.abs(tx.amount).toFixed(2)} $SLS
            </p>
            <p className="text-[9px] text-[#888]">{tx.usdValue.toFixed(2)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function BlackMarketPage() {
  const slsBalance = useSLSBalance();
  const [profile, setProfile] = useState<MeResponse | null>(null);
  const [rotation, setRotation] = useState<BlackMarketRotation | null>(null);
  const [listings, setListings] = useState<BlackMarketListing[]>([]);
  const [slsPrice, setSlsPrice] = useState<number | null>(null);
  const [tab, setTab] = useState<BlackMarketTab>("listings");
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [meRes, listingsRes] = await Promise.all([
        api.get<MeResponse>("/me"),
        api.get<{ rotation: BlackMarketRotation; listings: BlackMarketListing[] }>("/black-market/listings"),
      ]);

      setProfile(meRes.data);
      setRotation(listingsRes.data.rotation);
      setListings(listingsRes.data.listings);
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

  const buy = async (listing: BlackMarketListing) => {
    setBuyingId(listing.id);
    try {
      await api.post("/black-market/buy", { listingId: listing.id, qty: 1 });
      await fetchData();
    } catch (err) {
      setError(extractErrMsg(err, "Purchase failed."));
    } finally {
      setBuyingId(null);
    }
  };

  if (loading) {
    return <div className="flex min-h-dvh items-center justify-center"><LoadingSpinner size={32} /></div>;
  }

  if (!profile) {
    return <div className="flex min-h-dvh items-center justify-center text-[#ef5350]">{error ?? "Failed to load profile."}</div>;
  }

  const tabs: Array<{ id: BlackMarketTab; label: string; icon: typeof ShoppingBag }> = [
    { id: "listings", label: "Listings", icon: ShoppingBag },
    { id: "swap", label: "Get $SLS", icon: ArrowLeftRight },
    { id: "sell", label: "Sell $SLS", icon: CircleDollarSign },
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
            <p className="text-[11px] font-semibold text-[#888]">Listings plus the classic $SLS utility flows</p>
          </div>
        </div>
      </div>

      <SLSOverview cash={profile.cash} slsBalance={slsBalance} slsPrice={slsPrice} slsSpent={profile.slsSpent} />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-shrink-0 px-3 py-2 rounded-md border text-[10px] font-black tracking-[2px] uppercase flex items-center gap-1.5 ${
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

      {tab === "listings" && (
        <ListingsPanel profile={profile} rotation={rotation} listings={listings} buyingId={buyingId} onBuy={buy} />
      )}
      {tab === "swap" && <GetSLSPanel />}
      {tab === "sell" && <SellSLSPanel onSold={fetchData} />}
      {tab === "hospital" && <HospitalPanel profile={profile} onRefresh={fetchData} />}
      {tab === "history" && <HistoryPanel />}

      <div className="h-16 md:hidden" />
    </div>
  );
}
