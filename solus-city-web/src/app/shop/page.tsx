"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowRight, CircleDollarSign, Clock3, Crosshair, Package, ShieldCheck, ShoppingCart, Store, Swords, Trophy } from "lucide-react";
import { api } from "@/lib/api/client";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageBanner } from "@/components/game/PageBanner";
import { RarityBadge } from "@/components/game/RarityBadge";
import { StatusBars } from "@/components/ui/StatusBars";
import { BlackMarketListing, BlackMarketRotation, MeResponse } from "@/lib/gameApi";

type ShopTab = "shop" | "listings";
type ShopCategory = "all" | "crew" | "weapon" | "armor" | "utility" | "consumable";

type ShopItem = {
  id: string;
  category: string;
  subCategory?: string | null;
  name: string;
  atk: number;
  def: number;
  speed: number;
  dex: number;
  price: number;
  levelRequirement: number;
  rarity?: string | null;
  slot?: string | null;
  description?: string | null;
  consumable?: boolean;
  effectType?: string | null;
  effectValue?: number | null;
  owned: number;
  locked: boolean;
  powerPreview?: {
    apNow: number;
    apAfterOne: number;
    dpNow: number;
    dpAfterOne: number;
  };
};

const SHOP_CATEGORY_ORDER: Exclude<ShopCategory, "all">[] = ["crew", "weapon", "armor", "utility", "consumable"];

const SHOP_CATEGORY_LABELS: Record<Exclude<ShopCategory, "all">, string> = {
  crew: "Crew",
  weapon: "Weapons",
  armor: "Armor",
  utility: "Utility",
  consumable: "Consumables",
};

function normalizeCategory(item: ShopItem): Exclude<ShopCategory, "all"> {
  const category = item.category?.toLowerCase() ?? "";
  const subCategory = item.subCategory?.toLowerCase() ?? "";
  const slot = item.slot?.toLowerCase() ?? "";

  if (item.consumable || category === "consumable") return "consumable";
  if (category === "unit" || subCategory === "crew") return "crew";
  if (subCategory === "weapon" || slot === "weapon") return "weapon";
  if (subCategory === "armor" || slot === "armor") return "armor";
  return "utility";
}

function getItemIcon(category: Exclude<ShopCategory, "all">) {
  switch (category) {
    case "crew":
      return <ShieldCheck className="h-4 w-4 flex-shrink-0 text-[#eee]" />;
    case "weapon":
      return <Swords className="h-4 w-4 flex-shrink-0 text-[#eee]" />;
    case "armor":
      return <ShieldCheck className="h-4 w-4 flex-shrink-0 text-[#eee]" />;
    case "utility":
      return <Package className="h-4 w-4 flex-shrink-0 text-[#eee]" />;
    case "consumable":
      return <Trophy className="h-4 w-4 flex-shrink-0 text-[#eee]" />;
  }
}

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
      <span>
        {label} +{value}
      </span>
    </span>
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

function FlashMessage({ message }: { message: string }) {
  const [fading, setFading] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFading(true), 1600);
    return () => clearTimeout(t);
  }, []);
  return (
    <p className={`text-[10px] font-bold text-[#66bb6a] transition-opacity duration-700 ${fading ? "opacity-0" : "opacity-100"}`}>
      {message}
    </p>
  );
}

function ListingsPanel({
  rotation,
  listings,
  buyingId,
  successId,
  onBuy,
}: {
  rotation: BlackMarketRotation | null;
  listings: BlackMarketListing[];
  buyingId: string | null;
  successId: { id: string; key: number } | null;
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
      {rotation && (
        <div className="rounded-lg border border-white/10 bg-black/20 p-4">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black tracking-[3px] text-[#9945FF] uppercase">Active Rotation</p>
              <p className="text-lg font-black text-[#eee]">{rotation.theme?.toUpperCase() ?? "BLACK MARKET"}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-bold tracking-[2px] text-[#555]">ENDS IN</p>
              <p className="text-sm font-black text-[#fdd835]">{formatTimeLeft(rotation.secondsRemaining ?? 0)}</p>
            </div>
          </div>
        </div>
      )}

      {Object.entries(grouped).map(([group, entries]) => (
        <div key={group} className="flex flex-col gap-2">
          <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase">{group}</p>
          {entries.map((listing) => {
            const soldOut = listing.remainingStock <= 0;
            const busy = buyingId === listing.id;
            const justBought = successId?.id === listing.id;
            return (
              <div key={listing.id} className="bg-black/20 border border-white/10 rounded-md p-3 flex flex-col gap-2">
                <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words text-[13px] font-bold text-[#eee]">{listing.item.name}</p>
                    <p className="break-words text-[10px] text-[#555]">{listing.item.description}</p>
                  </div>
                  <div className="flex flex-col items-start gap-1 sm:items-end">
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
                </div>
                {justBought && <FlashMessage key={successId!.key} message={`Purchased ${listing.item.name}!`} />}
                <button
                  onClick={() => onBuy(listing)}
                  disabled={busy || soldOut}
                  className="w-full py-2 rounded border border-[rgba(153,69,255,0.3)] bg-[#1a0a2e] text-[#9945FF] text-[10px] font-black tracking-[2px] disabled:opacity-40"
                >
                  {busy ? "BUYING..." : soldOut ? "SOLD OUT" : "BUY"}
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function ShopPage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [tab, setTab] = useState<ShopTab>("shop");
  const [shopCategory, setShopCategory] = useState<ShopCategory>("all");
  const [items, setItems] = useState<ShopItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [rotation, setRotation] = useState<BlackMarketRotation | null>(null);
  const [listings, setListings] = useState<BlackMarketListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [listingsError, setListingsError] = useState<string | null>(null);
  const [shopBuyingId, setShopBuyingId] = useState<string | null>(null);
  const [shopBuyError, setShopBuyError] = useState<string | null>(null);
  const [shopSuccess, setShopSuccess] = useState<{ msg: string; itemId: string; key: number } | null>(null);
  const [listingSuccess, setListingSuccess] = useState<{ id: string; key: number } | null>(null);
  const successCounter = useRef(0);

  const fetchShop = useCallback(async () => {
    try {
      const [shopRes, meRes] = await Promise.all([
        api.get<{ all: ShopItem[] }>("/shop/items"),
        api.get<MeResponse>("/me"),
      ]);
      setItems(shopRes.data.all);
      setMe(meRes.data);
      setQuantities((prev) => {
        const next = { ...prev };
        shopRes.data.all.forEach((item) => {
          if (!next[item.id]) next[item.id] = "1";
        });
        return next;
      });
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchListings = useCallback(async () => {
    setListingsError(null);
    try {
      const res = await api.get<{ rotation: BlackMarketRotation; listings: BlackMarketListing[] }>("/black-market/listings");
      setRotation(res.data.rotation);
      setListings(res.data.listings);
    } catch (err) {
      setListingsError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to load listings."
      );
    }
  }, []);

  useEffect(() => {
    fetchShop();
  }, [fetchShop]);

  useEffect(() => {
    if (tab === "listings") fetchListings();
  }, [tab, fetchListings]);

  const groupedShopItems = useMemo(() => {
    const source = shopCategory === "all" ? items : items.filter((item) => normalizeCategory(item) === shopCategory);
    return SHOP_CATEGORY_ORDER.map((category) => ({
      category,
      items: source.filter((item) => normalizeCategory(item) === category),
    })).filter((group) => group.items.length > 0);
  }, [items, shopCategory]);

  const buy = async (item: ShopItem) => {
    const qty = parseInt(quantities[item.id] ?? "1", 10);
    if (Number.isNaN(qty) || qty < 1 || qty > 100) {
      setShopBuyError("Quantity must be between 1 and 100.");
      return;
    }
    setShopBuyingId(item.id);
    setShopBuyError(null);
    try {
      await api.post("/shop/buy", { itemId: item.id, qty });
      await fetchShop();
      successCounter.current += 1;
      const key = successCounter.current;
      setShopSuccess({ msg: `Purchased ${qty}x ${item.name}!`, itemId: item.id, key });
      setTimeout(() => setShopSuccess((s) => (s?.key === key ? null : s)), 2500);
    } catch (err) {
      setShopBuyError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Purchase failed."
      );
    } finally {
      setShopBuyingId(null);
    }
  };

  const buyListing = async (listing: BlackMarketListing) => {
    setBuyingId(listing.id);
    setListingsError(null);
    try {
      await api.post("/black-market/buy", { listingId: listing.id, qty: 1 });
      await fetchListings();
      successCounter.current += 1;
      const key = successCounter.current;
      setListingSuccess({ id: listing.id, key });
      setTimeout(() => setListingSuccess((s) => (s?.key === key ? null : s)), 2500);
    } catch (err) {
      setListingsError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Purchase failed."
      );
    } finally {
      setBuyingId(null);
    }
  };

  if (loading) return <div className="flex min-h-dvh items-center justify-center"><LoadingSpinner size={32} /></div>;

  return (
    <div className="flex flex-col gap-3">
      {me ? <StatusBars profile={me} /> : null}

      <PageBanner
        imageSrc="/assets/images/shop_banner.png"
        imageAlt="Shop banner"
        title="Shop"
        subtitle="Gear, consumables, and black market listings"
        icon={<Store className="h-5 w-5 text-[#66bb6a]" />}
        titleClassName="text-[#66bb6a]"
        subtitleClassName="text-[#888]"
      />

      <div className="grid grid-cols-2 gap-1">
        {(["shop", "listings"] as ShopTab[]).map((id) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`min-w-0 rounded-md border px-2 py-2 text-[9px] font-black uppercase tracking-[1px] sm:text-[10px] sm:tracking-[2px] ${
              tab === id
                ? "bg-[#1a0a2e] border-[rgba(153,69,255,0.3)] text-[#9945FF]"
                : "bg-black/20 border-white/10 text-[#555]"
            }`}
          >
            <span className="block leading-tight text-center">{id === "shop" ? "Shop Items" : "Listings"}</span>
          </button>
        ))}
      </div>

      {tab === "shop" && (
        <>
          {shopBuyError && <p className="text-[10px] font-bold text-[#ef5350]">{shopBuyError}</p>}
          <div className="flex flex-wrap gap-2">
            {(["all", ...SHOP_CATEGORY_ORDER] as ShopCategory[]).map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setShopCategory(category)}
                className={`px-3 py-2 rounded border text-[10px] font-black tracking-[2px] uppercase ${
                  shopCategory === category
                    ? "bg-[#1a0a2e] border-[rgba(153,69,255,0.3)] text-[#9945FF]"
                    : "bg-black/20 border-white/10 text-[#777]"
                }`}
              >
                {category === "all" ? "All" : SHOP_CATEGORY_LABELS[category]}
              </button>
            ))}
          </div>
          {groupedShopItems.length === 0 ? (
            <div className="rounded-md border border-white/10 bg-black/20 p-3 text-[11px] text-[#777]">No items in this shelf yet.</div>
          ) : (
            groupedShopItems.map((group) => (
              <div key={group.category} className="flex flex-col gap-2">
                {shopCategory === "all" && (
                  <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase">{SHOP_CATEGORY_LABELS[group.category]}</p>
                )}
                <div className="flex flex-col gap-2">
                  {group.items.map((item) => {
                    const busy = shopBuyingId === item.id;
                    const justBought = shopSuccess?.itemId === item.id;
                    const itemCategory = normalizeCategory(item);
                    const qty = Math.max(1, parseInt(quantities[item.id] ?? "1", 10) || 1);
                    const insufficientCash = !item.locked && (me?.cash ?? 0) < item.price * qty;
                    const showPreview =
                      !!item.powerPreview &&
                      (item.powerPreview.apAfterOne !== item.powerPreview.apNow ||
                        item.powerPreview.dpAfterOne !== item.powerPreview.dpNow);
                    return (
                      <div
                        key={item.id}
                        className={`rounded-lg border border-white/10 bg-black/20 p-3.5 flex flex-col gap-2 ${
                          item.locked ? "opacity-45" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            {getItemIcon(itemCategory)}
                            <span className="truncate text-[15px] font-bold text-[#eee]">{item.name}</span>
                          </div>
                          <span className="flex-shrink-0 rounded bg-[#9945FF20] px-2 py-0.5 text-[9px] font-bold tracking-wide text-[#9945FF]">
                            {item.owned} OWNED
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          {item.atk > 0 && (
                            <StatChip value={item.atk} color="#ef5350" label="ATK" icon={<Swords className="h-3 w-3" />} />
                          )}
                          {item.def > 0 && (
                            <StatChip value={item.def} color="#1e88e5" label="DEF" icon={<ShieldCheck className="h-3 w-3" />} />
                          )}
                          {item.speed > 0 && (
                            <StatChip value={item.speed} color="#9945FF" label="SPD" icon={<Clock3 className="h-3 w-3" />} />
                          )}
                          {item.dex > 0 && (
                            <StatChip value={item.dex} color="#fdd835" label="DEX" icon={<Crosshair className="h-3 w-3" />} />
                          )}
                          <span className="flex items-center gap-1 text-[12px] font-bold text-[#66bb6a]">
                            <CircleDollarSign className="h-3 w-3" />
                            ${item.price.toLocaleString()}
                          </span>
                          {item.rarity ? <RarityBadge rarity={item.rarity} /> : null}
                        </div>
                        {showPreview ? (
                          <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-[#777]">
                            <span>
                              AP <span className="text-[#ef5350]">{item.powerPreview!.apNow}</span>{" "}
                              <ArrowRight className="inline-block h-3 w-3 align-middle text-[#777]" />{" "}
                              <span className="text-[#66bb6a]">{item.powerPreview!.apAfterOne}</span>
                            </span>
                            <span>
                              DP <span className="text-[#42a5f5]">{item.powerPreview!.dpNow}</span>{" "}
                              <ArrowRight className="inline-block h-3 w-3 align-middle text-[#777]" />{" "}
                              <span className="text-[#66bb6a]">{item.powerPreview!.dpAfterOne}</span>
                            </span>
                          </div>
                        ) : null}
                        {item.description ? <p className="text-[10px] text-[#666]">{item.description}</p> : null}
                        <p className="text-[9px] font-black tracking-[2px] text-[#777]">
                          LV REQ {item.levelRequirement}
                          {item.subCategory ? <span className="ml-2 text-[#9945FF]">{item.subCategory.toUpperCase()}</span> : null}
                          {item.slot && itemCategory !== "crew" ? <span className="ml-2 text-[#42a5f5]">SLOT {item.slot.toUpperCase()}</span> : null}
                          {item.effectType ? (
                            <span className="ml-2 text-[#14F195]">{item.effectType.replaceAll("_", " ").toUpperCase()}</span>
                          ) : null}
                        </p>
                        {justBought && <FlashMessage key={shopSuccess!.key} message={shopSuccess!.msg} />}
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={quantities[item.id] ?? "1"}
                            onChange={(event) => setQuantities((prev) => ({ ...prev, [item.id]: event.target.value }))}
                            disabled={item.locked || busy}
                            className="w-16 rounded-lg border border-white/10 bg-black/20 px-2 py-2 text-center text-sm font-bold text-[#eee] focus:outline-none disabled:opacity-40"
                          />
                          <button
                            disabled={item.locked || busy}
                            onClick={() => buy(item)}
                            className={`flex flex-1 items-center justify-center gap-1 rounded-lg border py-2.5 text-[11px] font-bold tracking-[2px] transition-opacity ${
                              item.locked
                                ? "cursor-not-allowed border-white/10 bg-black/20 text-[#777] opacity-40"
                                : insufficientCash
                                ? "border-[rgba(153,69,255,0.3)] bg-[#1a0a2e] text-[#9945FF] opacity-60"
                                : "border-[rgba(153,69,255,0.3)] bg-[#1a0e2e] text-[#9945FF]"
                            } ${busy ? "opacity-40" : ""}`}
                          >
                            {busy ? (
                              "BUYING..."
                            ) : insufficientCash && !item.locked ? (
                              "LOW CASH"
                            ) : (
                              <>
                                <ShoppingCart className="h-3.5 w-3.5" />
                                BUY
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </>
      )}

      {tab === "listings" && (
        <>
          {listingsError && <p className="text-[10px] font-bold text-[#ef5350]">{listingsError}</p>}
          <ListingsPanel
            rotation={rotation}
            listings={listings}
            buyingId={buyingId}
            successId={listingSuccess}
            onBuy={buyListing}
          />
        </>
      )}
    </div>
  );
}
