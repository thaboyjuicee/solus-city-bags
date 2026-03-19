"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { BagsSDK, type TradeQuoteResponse } from "@bagsfm/bags-sdk";
import { api } from "@/lib/api/client";
import { StatusBars, type ProfileStats } from "@/components/ui/StatusBars";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useSLSBalance } from "@/hooks/useSLSBalance";
import {
  ArrowLeftRight,
  ArrowRight,
  CircleDollarSign,
  Clock3,
  Crosshair,
  Package,
  ShieldCheck,
  ShoppingCart,
  Swords,
  Trophy,
  Wallet,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
const SLS_MINT = new PublicKey("ELTXCFp1tmtfu39CPw6afnMSjW1BBxjinorJQsKmBAGS");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PowerPreview {
  apNow: number;
  apAfterOne: number;
  dpNow: number;
  dpAfterOne: number;
  projectedQty: number;
}

interface ShopItem {
  id: string;
  category: "unit" | "equipment";
  name: string;
  atk: number;
  def: number;
  speed: number;
  dex: number;
  price: number;
  levelRequirement: number;
  rarity: string;
  description?: string;
  stackable: boolean;
  isUnique: boolean;
  owned: number;
  locked: boolean;
  powerPreview: PowerPreview;
}

interface BuyResponse {
  success: boolean;
  newCash: number;
  item: { id: string; name: string; category: string; atk: number; def: number; speed: number; dex: number; price: number };
  qty: number;
  newCombat: { ap: number; dp: number };
}

type ItemResult =
  | { ok: true; data: BuyResponse }
  | { ok: false; msg: string };

type ShopTab = "unit" | "equipment" | "slx";
type SwapPhase = "idle" | "quoting" | "quoted" | "done" | "error";

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

// ---------------------------------------------------------------------------
// GetSLSPanel
// ---------------------------------------------------------------------------

function GetSLSPanel() {
  const { connection } = useConnection();
  const { publicKey, signTransaction, connected } = useWallet();
  const slxBalance = useSLSBalance();

  const sdk = useMemo(
    () => new BagsSDK(process.env.NEXT_PUBLIC_BAGS_API_KEY ?? "", connection, "confirmed"),
    [connection]
  );

  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [solInput, setSolInput] = useState("");
  const [phase, setPhase] = useState<SwapPhase>("idle");
  const [swapPending, setSwapPending] = useState(false);
  const [quote, setQuote] = useState<TradeQuoteResponse | null>(null);
  const [slxOut, setSlxOut] = useState<number | null>(null);
  const [priceImpact, setPriceImpact] = useState<string | null>(null);
  const [txSig, setTxSig] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch SOL balance whenever wallet changes
  useEffect(() => {
    if (!publicKey) { setSolBalance(null); return; }
    let cancelled = false;
    connection.getBalance(publicKey)
      .then((lamports) => { if (!cancelled) setSolBalance(lamports / 1e9); })
      .catch(() => { if (!cancelled) setSolBalance(null); });
    return () => { cancelled = true; };
  }, [connection, publicKey]);

  const resetQuote = () => {
    setQuote(null);
    setSlxOut(null);
    setPriceImpact(null);
    setError(null);
  };

  const getQuote = async () => {
    const sol = parseFloat(solInput);
    if (isNaN(sol) || sol <= 0) {
      setError("Enter a valid SOL amount.");
      return;
    }
    setPhase("quoting");
    setError(null);
    setQuote(null);
    setSlxOut(null);
    try {
      const q = await sdk.trade.getQuote({
        inputMint: SOL_MINT,
        outputMint: SLS_MINT,
        amount: Math.floor(sol * 1e9),
        slippageMode: "auto",
      });
      const lastLeg = q.routePlan[q.routePlan.length - 1];
      const decimals = lastLeg?.outputMintDecimals ?? 9;
      setSlxOut(parseInt(q.outAmount, 10) / Math.pow(10, decimals));
      setPriceImpact(q.priceImpactPct);
      setQuote(q);
      setPhase("quoted");
    } catch (e) {
      setError(extractErrMsg(e, "Failed to get quote. Check your API key or try again."));
      setPhase("error");
    }
  };

  const confirmSwap = async () => {
    if (!publicKey || !signTransaction || !quote) return;
    setSwapPending(true);
    setError(null);
    try {
      const { transaction, lastValidBlockHeight } = await sdk.trade.createSwapTransaction({
        quoteResponse: quote,
        userPublicKey: publicKey,
      });
      const signed = await signTransaction(transaction);
      const rawTx = signed.serialize();
      const sig = await connection.sendRawTransaction(rawTx, {
        skipPreflight: false,
        maxRetries: 3,
      });
      await connection.confirmTransaction({
        signature: sig,
        blockhash: transaction.message.recentBlockhash,
        lastValidBlockHeight,
      });
      setTxSig(sig);
      // Refresh SOL balance after swap
      connection.getBalance(publicKey)
        .then((lamports) => setSolBalance(lamports / 1e9))
        .catch(() => {});
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
      {/* Balances */}
      <div className="grid grid-cols-2 gap-1.5">
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-3 text-center">
          <p className="text-[9px] font-bold tracking-[2px] text-[#555] mb-1">YOUR SOL</p>
          <p className="text-sm font-bold text-[#eee]">
            {solBalance !== null ? solBalance.toFixed(4) : "—"} SOL
          </p>
        </div>
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-3 text-center">
          <p className="text-[9px] font-bold tracking-[2px] text-[#555] mb-1">YOUR $SLS</p>
          <p className="text-sm font-bold text-[#9945FF]">
            {slxBalance !== null ? slxBalance.toFixed(2) : "—"} $SLS
          </p>
        </div>
      </div>

      {/* SOL input */}
      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-3 flex flex-col gap-2">
        <p className="text-[9px] font-bold tracking-[2px] text-[#555]">SOL TO SWAP</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={solInput}
            onChange={(e) => {
              setSolInput(e.target.value);
              if (phase === "quoted" || phase === "done" || phase === "error") {
                setPhase("idle");
                resetQuote();
              }
            }}
            disabled={isLoading}
            className="flex-1 bg-black/20 text-[#eee] border border-white/10 rounded-md px-3 py-2 text-sm font-bold focus:outline-none focus:border-[rgba(153,69,255,0.5)] disabled:opacity-40"
          />
          <span className="text-[#888] text-sm font-bold flex-shrink-0">SOL</span>
        </div>
      </div>

      {/* Quote result */}
      {phase === "quoted" && slxOut !== null && (
        <div className="bg-[#0a0a1a] border border-[rgba(153,69,255,0.3)] rounded-md p-3 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold tracking-[2px] text-[#555]">YOU RECEIVE</span>
            <span className="text-[#9945FF] text-sm font-black">{slxOut.toFixed(2)} $SLS</span>
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

      {/* Error */}
      {error && (
        <div className="bg-[#1a0a0a] border border-[#7f1919] rounded-md px-3 py-2">
          <p className="text-[#ef5350] text-[11px] font-bold">{error}</p>
        </div>
      )}

      {/* Success */}
      {phase === "done" && txSig && (
        <div className="bg-[#0a1a0a] border border-[#1a4a1a] rounded-md px-3 py-2 flex flex-col gap-1">
          <p className="text-[#66bb6a] text-[11px] font-bold">Swap confirmed!</p>
          <p className="text-[#555] text-[9px] font-mono break-all">{txSig}</p>
        </div>
      )}

      {/* Action buttons */}
      {phase !== "done" ? (
        phase === "quoted" ? (
          <div className="flex gap-2">
            <button
              onClick={() => { setPhase("idle"); resetQuote(); }}
              disabled={isLoading}
              className="flex-1 py-2.5 rounded-md border border-white/10 bg-black/20 text-[#555] text-[11px] font-bold tracking-[2px] hover:text-[#888] disabled:opacity-40 transition-colors"
            >
              CANCEL
            </button>
            <button
              onClick={confirmSwap}
              disabled={isLoading}
              className="flex-1 py-2.5 rounded-md border border-[rgba(153,69,255,0.3)] bg-[#1a0a2e] text-[#9945FF] text-[11px] font-bold tracking-[2px] flex items-center justify-center gap-1.5 hover:bg-[#2a0a3e] disabled:opacity-40 transition-colors"
            >
              {swapPending ? (
                <LoadingSpinner size={16} color="#9945FF" />
              ) : (
                <>
                  <ArrowLeftRight size={14} />
                  CONFIRM SWAP
                </>
              )}
            </button>
          </div>
        ) : (
          <button
            onClick={getQuote}
            disabled={!canQuote}
            className="w-full py-2.5 rounded-md border border-[rgba(153,69,255,0.3)] bg-[#1a0a2e] text-[#9945FF] text-[11px] font-bold tracking-[2px] flex items-center justify-center gap-1.5 hover:bg-[#2a0a3e] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {phase === "quoting" ? (
              <LoadingSpinner size={16} color="#9945FF" />
            ) : (
              <>
                <ArrowLeftRight size={14} />
                GET QUOTE
              </>
            )}
          </button>
        )
      ) : (
        <button
          onClick={() => {
            setPhase("idle");
            setSolInput("");
            setTxSig(null);
            resetQuote();
          }}
          className="w-full py-2.5 rounded-md border border-[rgba(153,69,255,0.3)] bg-[#1a0a2e] text-[#9945FF] text-[11px] font-bold tracking-[2px] flex items-center justify-center gap-1.5 hover:bg-[#2a0a3e] transition-colors"
        >
          <ArrowLeftRight size={14} />
          SWAP AGAIN
        </button>
      )}

      <p className="text-[9px] text-[#333] text-center">Powered by Bags</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatChip
// ---------------------------------------------------------------------------

function StatChip({
  value,
  color,
  label,
  icon,
}: {
  value: number;
  color: string;
  label: string;
  icon: ReactNode;
}) {
  return (
    <span className="flex items-center gap-1 text-[12px] font-bold" style={{ color }}>
      {icon}
      <span>{label} +{value}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// ItemCard
// ---------------------------------------------------------------------------

function ItemCard({
  item,
  profile,
  qty,
  buying,
  result,
  onQtyChange,
  onBuy,
}: {
  item: ShopItem;
  profile: ProfileStats;
  qty: string;
  buying: boolean;
  result: ItemResult | undefined;
  onQtyChange: (id: string, v: string) => void;
  onBuy: (item: ShopItem) => void;
}) {
  const alreadyUnique = item.isUnique && item.owned > 0;
  const cannotBuy = item.locked || alreadyUnique;
  const insufficientCash = !cannotBuy && profile.cash < item.price * Math.max(1, parseInt(qty, 10) || 1);

  let buyLabel = "BUY";
  if (item.locked) buyLabel = "LOCKED";
  else if (alreadyUnique) buyLabel = "OWNED";

  const { apNow, apAfterOne, dpNow, dpAfterOne } = item.powerPreview;
  const showPreview = item.atk > 0 || item.def > 0;

  return (
    <div
      className={`bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-3.5 flex flex-col gap-2 ${item.locked ? "opacity-45" : ""}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {item.category === "unit" ? (
            <ShieldCheck className="w-4 h-4 text-[#eee] flex-shrink-0" />
          ) : (
            <Trophy className="w-4 h-4 text-[#eee] flex-shrink-0" />
          )}
          <span className="text-[#eee] text-[15px] font-bold truncate">{item.name}</span>
        </div>
        <span className="flex-shrink-0 bg-[#9945FF20] text-[#9945FF] text-[9px] font-bold px-2 py-0.5 rounded tracking-wide">
          {item.owned} OWNED
        </span>
      </div>

      {/* Stats chips */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {item.atk > 0 && (
          <StatChip value={item.atk} color="#ef5350" label="ATK" icon={<Swords className="w-3 h-3" />} />
        )}
        {item.def > 0 && (
          <StatChip value={item.def} color="#1e88e5" label="DEF" icon={<ShieldCheck className="w-3 h-3" />} />
        )}
        {item.speed > 0 && (
          <StatChip value={item.speed} color="#9945FF" label="SPD" icon={<Clock3 className="w-3 h-3" />} />
        )}
        {item.dex > 0 && (
          <StatChip value={item.dex} color="#fdd835" label="DEX" icon={<Crosshair className="w-3 h-3" />} />
        )}
        <span className="flex items-center gap-1 text-[12px] font-bold text-[#66bb6a]">
          <CircleDollarSign className="w-3 h-3" />
          ${item.price.toLocaleString()}
        </span>
      </div>

      {/* Power preview */}
      {showPreview && (
        <div className="flex items-center gap-3 text-[10px] font-bold text-text-dim">
          <span>
            AP <span className="text-[#ef5350]">{apNow}</span>{" "}
            <ArrowRight className="w-3 h-3 inline-block align-middle text-text-dim" />
            <span className="text-[#66bb6a]">{apAfterOne}</span>
          </span>
          <span>
            DP <span className="text-[#1e88e5]">{dpNow}</span>{" "}
            <ArrowRight className="w-3 h-3 inline-block align-middle text-text-dim" />
            <span className="text-[#66bb6a]">{dpAfterOne}</span>
          </span>
        </div>
      )}

      {/* Description */}
      {item.description && (
        <p className="text-text-dim text-[10px]">{item.description}</p>
      )}

      {/* Level requirement */}
      <p className="text-text-dim text-[9px] font-black tracking-[2px]">
        LV REQ {item.levelRequirement}
        {item.isUnique && <span className="ml-2 text-[#fdd835]">UNIQUE</span>}
      </p>

      {/* Buy row */}
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          max={100}
          value={qty}
          onChange={(e) => onQtyChange(item.id, e.target.value)}
          disabled={cannotBuy || buying}
          className="w-16 bg-black/20 backdrop-blur-sm text-[#eee] border border-white/10 rounded-lg px-2 py-2 text-center text-sm font-bold
                     focus:outline-none focus:border-accent disabled:opacity-40"
        />
        <button
          onClick={() => onBuy(item)}
          disabled={cannotBuy || buying}
          className={`flex-1 py-2.5 rounded-lg border flex items-center justify-center gap-1 text-[11px] font-bold tracking-[2px] transition-opacity ${
            cannotBuy
              ? "bg-black/20 border-white/10 text-text-dim opacity-40 cursor-not-allowed"
              : insufficientCash
              ? "bg-[#1a0a2e] border-[rgba(153,69,255,0.3)] text-[#9945FF] opacity-60"
              : "bg-[#1a0e2e] border-[rgba(153,69,255,0.3)] text-[#9945FF] hover:bg-[#2a0a3e]"
          } ${buying ? "opacity-40" : ""}`}
        >
          {buying ? (
            <LoadingSpinner size={16} color="#9945FF" />
          ) : insufficientCash && !cannotBuy ? (
            "LOW CASH"
          ) : (
            <>
              <ShoppingCart className="w-3.5 h-3.5" />
              {buyLabel}
            </>
          )}
        </button>
      </div>

      {/* Inline result */}
      {result && (
        <div
          className={`rounded px-3 py-2 border text-[11px] font-bold flex flex-col gap-0.5 ${
            result.ok
              ? "bg-[#0a1a0a] border-[#1a4a1a] text-[#66bb6a]"
              : "bg-[#1a0a0a] border-[#7f1919] text-[#ef5350]"
          }`}
        >
          {result.ok ? (
            <>
              <span>Bought {result.data.qty}x {result.data.item.name}</span>
              <span className="text-[#eee]">
                Cash: ${Math.floor(result.data.newCash).toLocaleString()} · AP {result.data.newCombat.ap} · DP {result.data.newCombat.dp}
              </span>
            </>
          ) : (
            <span>{result.msg}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ShopPage() {
  const [profile, setProfile] = useState<ProfileStats | null>(null);
  const [items, setItems] = useState<ShopItem[]>([]);
  const [tab, setTab] = useState<ShopTab>("unit");
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [buying, setBuying] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, ItemResult>>({});

  const fetchData = useCallback(async () => {
    setPageError(null);
    try {
      const [profileRes, itemsRes] = await Promise.all([
        api.get<ProfileStats>("/me"),
        api.get<{ all: ShopItem[] }>("/shop/items"),
      ]);
      setProfile(profileRes.data);
      const data = itemsRes.data.all;
      setItems(data);
      setQuantities((prev) => {
        const init: Record<string, string> = {};
        data.forEach((item) => { init[item.id] = "1"; });
        return { ...init, ...prev };
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to load shop.";
      setPageError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const buy = async (item: ShopItem) => {
    const qty = parseInt(quantities[item.id] ?? "1", 10);
    if (isNaN(qty) || qty < 1 || qty > 100) {
      setResults((prev) => ({ ...prev, [item.id]: { ok: false, msg: "Quantity must be between 1 and 100." } }));
      return;
    }
    setBuying((prev) => ({ ...prev, [item.id]: true }));
    setResults((prev) => { const next = { ...prev }; delete next[item.id]; return next; });
    try {
      const res = await api.post<BuyResponse>("/shop/buy", { itemId: item.id, qty });
      const data = res.data;
      setProfile((prev) =>
        prev ? { ...prev, cash: data.newCash, ap: data.newCombat.ap, dp: data.newCombat.dp } : prev
      );
      setItems((prev) =>
        prev.map((i) => i.id === item.id ? { ...i, owned: i.owned + qty } : i)
      );
      setResults((prev) => ({ ...prev, [item.id]: { ok: true, data } }));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Purchase failed. Please try again.";
      setResults((prev) => ({ ...prev, [item.id]: { ok: false, msg } }));
    } finally {
      setBuying((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh bg-transparent items-center justify-center">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="flex flex-col min-h-dvh bg-background items-center justify-center gap-4 px-6">
        <p className="text-danger text-sm text-center">{pageError}</p>
        <button
          onClick={() => { setLoading(true); fetchData(); }}
          className="px-5 py-2.5 bg-accent rounded-lg text-white font-semibold text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  const visibleItems = (tab === "unit" || tab === "equipment")
    ? items.filter((i) => i.category === tab)
    : [];

  return (
    <div className="flex flex-col bg-transparent min-h-dvh">
      {profile && <StatusBars profile={profile} />}

      <div className="flex flex-col gap-3">
        {/* Hero */}
        <div className="h-28 rounded-lg overflow-hidden border border-white/10 bg-black/20 backdrop-blur-sm flex items-end relative">
          <Image
            src="/assets/images/shop_banner.png"
            alt="Shop banner"
            fill
            className="object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          <div className="relative z-10 px-3 pb-3">
            <p className="text-[10px] font-black text-[#eee] tracking-[3px] uppercase mb-1">Item Shop</p>
            <p className="text-[11px] font-semibold text-text-dim">Buy equipment or get $SLS</p>
          </div>
        </div>

        {/* Cash balance — only shown on item tabs */}
        {tab !== "slx" && (
          <div className="flex items-center justify-between bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2">
            <span className="text-text-dim text-[11px] font-bold tracking-wide">Your Cash</span>
            <span className="text-[#66bb6a] text-[15px] font-black">
              ${Math.floor(profile?.cash ?? 0).toLocaleString()}
            </span>
          </div>
        )}

        {/* Tab bar */}
        <div className="flex gap-2">
          <button
            onClick={() => setTab("unit")}
            className={`flex-1 py-2 rounded-lg border text-[10px] font-black tracking-[2px] uppercase transition-colors ${
              tab === "unit"
                ? "bg-[#1a0a2e] border-[rgba(153,69,255,0.3)] text-[#9945FF]"
                : "bg-black/20 backdrop-blur-sm border border-white/10 text-text-dim hover:text-text-secondary"
            }`}
          >
            <span className="inline-flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Units
            </span>
          </button>
          <button
            onClick={() => setTab("equipment")}
            className={`flex-1 py-2 rounded-lg border text-[10px] font-black tracking-[2px] uppercase transition-colors ${
              tab === "equipment"
                ? "bg-[#1a0a2e] border-[rgba(153,69,255,0.3)] text-[#9945FF]"
                : "bg-black/20 backdrop-blur-sm border border-white/10 text-text-dim hover:text-text-secondary"
            }`}
          >
            <span className="inline-flex items-center justify-center gap-1">
              <Package className="w-3.5 h-3.5" />
              Equipment
            </span>
          </button>
          <button
            onClick={() => setTab("slx")}
            className={`flex-1 py-2 rounded-lg border text-[10px] font-black tracking-[2px] uppercase transition-colors ${
              tab === "slx"
                ? "bg-[#1a0a2e] border-[rgba(153,69,255,0.3)] text-[#9945FF]"
                : "bg-black/20 backdrop-blur-sm border border-white/10 text-text-dim hover:text-text-secondary"
            }`}
          >
            <span className="inline-flex items-center justify-center gap-1">
              <ArrowLeftRight className="w-3.5 h-3.5" />
              Get $SLS
            </span>
          </button>
        </div>

        {/* Tab content */}
        {tab === "slx" ? (
          <GetSLSPanel />
        ) : visibleItems.length === 0 ? (
          <p className="text-text-dim text-sm text-center py-8">
            No {tab === "unit" ? "units" : "equipment"} available.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {visibleItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                profile={profile!}
                qty={quantities[item.id] ?? "1"}
                buying={buying[item.id] ?? false}
                result={results[item.id]}
                onQtyChange={(id, v) => setQuantities((prev) => ({ ...prev, [id]: v }))}
                onBuy={buy}
              />
            ))}
          </div>
        )}

        <div className="h-16 md:hidden" />
      </div>
    </div>
  );
}
