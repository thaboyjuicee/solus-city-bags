"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { api } from "@/lib/api/client";
import { StatusBars, type ProfileStats } from "@/components/ui/StatusBars";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

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

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatChip({ value, color, label }: { value: number; color: string; label: string }) {
  return (
    <span className="flex items-center gap-1 text-[12px] font-bold" style={{ color }}>
      {label} +{value}
    </span>
  );
}

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
    <div className={`bg-[#141414] border border-[#1e1e1e] rounded-lg p-3.5 flex flex-col gap-2 ${item.locked ? "opacity-45" : ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <svg className="w-3.5 h-3.5 text-[#eee] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
          <span className="text-[#eee] text-[15px] font-bold truncate">{item.name}</span>
        </div>
        <span className="flex-shrink-0 bg-[#9945FF20] text-[#9945FF] text-[9px] font-bold px-2 py-0.5 rounded tracking-wide">
          {item.owned} OWNED
        </span>
      </div>

      {/* Stats chips */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {item.atk   > 0 && <StatChip value={item.atk}   color="#ef5350" label="ATK" />}
        {item.def   > 0 && <StatChip value={item.def}   color="#1e88e5" label="DEF" />}
        {item.speed > 0 && <StatChip value={item.speed} color="#9945FF" label="SPD" />}
        {item.dex   > 0 && <StatChip value={item.dex}   color="#fdd835" label="DEX" />}
        <span className="text-[12px] font-bold text-[#66bb6a]">
          ${item.price.toLocaleString()}
        </span>
      </div>

      {/* Power preview (AP/DP delta for buying one more) */}
      {showPreview && (
        <div className="flex items-center gap-3 text-[10px] font-bold text-text-dim">
          <span>
            AP{" "}
            <span className="text-[#ef5350]">{apNow}</span>
            {" → "}
            <span className="text-[#66bb6a]">{apAfterOne}</span>
          </span>
          <span>
            DP{" "}
            <span className="text-[#1e88e5]">{dpNow}</span>
            {" → "}
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
        {item.isUnique && (
          <span className="ml-2 text-[#fdd835]">UNIQUE</span>
        )}
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
          className="w-16 bg-[#1e1e1e] text-[#eee] border border-[#333] rounded-lg px-2 py-2 text-center text-sm font-bold
                     focus:outline-none focus:border-accent disabled:opacity-40"
        />
        <button
          onClick={() => onBuy(item)}
          disabled={cannotBuy || buying}
          className={`flex-1 py-2.5 rounded-lg border flex items-center justify-center text-[11px] font-bold tracking-[2px] transition-opacity ${
            cannotBuy
              ? "bg-[#111] border-[#222] text-text-dim opacity-40 cursor-not-allowed"
              : insufficientCash
              ? "bg-[#1a0a2e] border-[rgba(153,69,255,0.3)] text-[#9945FF] opacity-60"
              : "bg-[#1a0a2e] border-[rgba(153,69,255,0.3)] text-[#9945FF] hover:bg-[#2a0a3e]"
          } ${buying ? "opacity-40" : ""}`}
        >
          {buying ? (
            <LoadingSpinner size={16} color="#9945FF" />
          ) : insufficientCash && !cannotBuy ? (
            "LOW CASH"
          ) : (
            buyLabel
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
              <span>
                Bought {result.data.qty}× {result.data.item.name}
              </span>
              <span className="text-[#eee]">
                Cash: ${Math.floor(result.data.newCash).toLocaleString()}
                {" · "}AP {result.data.newCombat.ap}
                {" · "}DP {result.data.newCombat.dp}
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
  const [category, setCategory] = useState<"unit" | "equipment">("unit");
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  // qty is stored as a string (matches TextInput behaviour from mobile)
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
      // Initialise qty to "1" for new items, preserve any existing user input
      setQuantities((prev) => {
        const init: Record<string, string> = {};
        data.forEach((item) => { init[item.id] = "1"; });
        return { ...init, ...prev };
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to load shop.";
      setPageError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const buy = async (item: ShopItem) => {
    const qty = parseInt(quantities[item.id] ?? "1", 10);
    if (isNaN(qty) || qty < 1 || qty > 100) {
      setResults((prev) => ({
        ...prev,
        [item.id]: { ok: false, msg: "Quantity must be between 1 and 100." },
      }));
      return;
    }

    setBuying((prev) => ({ ...prev, [item.id]: true }));
    setResults((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });

    try {
      const res = await api.post<BuyResponse>("/shop/buy", {
        itemId: item.id,
        qty,
      });
      const data = res.data;

      // Patch profile cash + combat stats
      setProfile((prev) =>
        prev
          ? { ...prev, cash: data.newCash, ap: data.newCombat.ap, dp: data.newCombat.dp }
          : prev
      );

      // Increment owned count in the item list
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, owned: i.owned + qty } : i
        )
      );

      setResults((prev) => ({ ...prev, [item.id]: { ok: true, data } }));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Purchase failed. Please try again.";
      setResults((prev) => ({ ...prev, [item.id]: { ok: false, msg } }));
    } finally {
      setBuying((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  // ------------------------------------------------------------------
  // Loading
  // ------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex min-h-dvh bg-background items-center justify-center">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Fatal error
  // ------------------------------------------------------------------
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

  const visibleItems = items.filter((i) => i.category === category);

  return (
    <div className="flex flex-col bg-background min-h-dvh">
      {profile && <StatusBars profile={profile} />}

      <div className="flex flex-col gap-3">

        {/* Hero */}
        <div className="h-28 rounded-lg overflow-hidden border border-[#1e1e1e] bg-[#0d0d0d] flex items-end relative">
          <Image
            src="/assets/images/shop_banner.png"
            alt="Shop banner"
            fill
            className="object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          <div className="relative z-10 px-3 pb-3">
            <p className="text-[10px] font-black text-[#eee] tracking-[3px] uppercase mb-1">
              Item Shop
            </p>
            <p className="text-[11px] font-semibold text-text-dim">
              Buy equipment to boost AP and DP
            </p>
          </div>
        </div>

        {/* Cash balance */}
        <div className="flex items-center justify-between bg-[#141414] border border-[#1e1e1e] rounded-lg px-3 py-2">
          <span className="text-text-dim text-[11px] font-bold tracking-wide">
            Your Cash
          </span>
          <span className="text-[#66bb6a] text-[15px] font-black">
            ${Math.floor(profile?.cash ?? 0).toLocaleString()}
          </span>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2">
          {(["unit", "equipment"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`flex-1 py-2 rounded-lg border text-[10px] font-black tracking-[2px] uppercase transition-colors ${
                category === cat
                  ? "bg-[#1a0a2e] border-[rgba(153,69,255,0.3)] text-[#9945FF]"
                  : "bg-[#111] border-[#1e1e1e] text-text-dim hover:text-text-secondary"
              }`}
            >
              {cat === "unit" ? "Units" : "Equipment"}
            </button>
          ))}
        </div>

        {/* Item list */}
        {visibleItems.length === 0 ? (
          <p className="text-text-dim text-sm text-center py-8">
            No {category === "unit" ? "units" : "equipment"} available.
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
                onQtyChange={(id, v) =>
                  setQuantities((prev) => ({ ...prev, [id]: v }))
                }
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

