"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api/client";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { RarityBadge } from "@/components/game/RarityBadge";
import { MeResponse } from "@/lib/gameApi";

<<<<<<< HEAD
type ShopTab = "shop" | "listings";
type ShopCategory = "all" | "crew" | "weapon" | "armor" | "utility" | "consumable";
=======
type ShopCategory = "all" | "crew" | "weapon" | "armor" | "consumable" | "utility";
type ShopShelf = Exclude<ShopCategory, "all">;
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39

type ShopItem = {
  id: string;
  category: string;
  subCategory?: string | null;
  name: string;
  atk?: number;
  def?: number;
  speed?: number;
  dex?: number;
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
};

<<<<<<< HEAD
const SHOP_CATEGORY_ORDER: Array<Exclude<ShopCategory, "all">> = ["crew", "weapon", "armor", "utility", "consumable"];

const SHOP_CATEGORY_META: Record<Exclude<ShopCategory, "all">, { label: string; note: string; accent: string }> = {
  crew: { label: "Crew", note: "People and unit assets that add force, not equipment utility.", accent: "text-[#66bb6a]" },
  weapon: { label: "Weapons", note: "Offensive gear meant to shape direct combat pressure.", accent: "text-[#ef5350]" },
  armor: { label: "Armor", note: "Defensive gear focused on survival and mitigation.", accent: "text-[#42a5f5]" },
  utility: { label: "Utility", note: "Support tools, intel gear, and tactical helpers.", accent: "text-[#9945FF]" },
  consumable: { label: "Consumables", note: "Spend-on-use recovery items and short-term boosts.", accent: "text-[#fdd835]" },
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

  return <p className={`text-[10px] font-bold text-[#66bb6a] transition-opacity duration-700 ${fading ? "opacity-0" : "opacity-100"}`}>{message}</p>;
}

function ListingsPanel({ rotation, listings, buyingId, successId, onBuy }: { rotation: BlackMarketRotation | null; listings: BlackMarketListing[]; buyingId: string | null; successId: { id: string; key: number } | null; onBuy: (listing: BlackMarketListing) => void; }) {
  const grouped = useMemo(() => listings.reduce<Record<string, BlackMarketListing[]>>((acc, listing) => {
    acc[listing.listingType] = [...(acc[listing.listingType] ?? []), listing];
    return acc;
  }, {}), [listings]);

  return (
    <div className="flex flex-col gap-3">
      {rotation && (
        <div className="rounded-lg border border-white/10 bg-black/20 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black tracking-[3px] text-[#9945FF] uppercase">Active Rotation</p>
              <p className="text-lg font-black text-[#f2f4ec]">{rotation.theme?.toUpperCase() ?? "BLACK MARKET"}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-bold tracking-[2px] text-[#aab0a3]">ENDS IN</p>
              <p className="text-sm font-black text-[#fdd835]">{formatTimeLeft(rotation.secondsRemaining ?? 0)}</p>
            </div>
          </div>
        </div>
      )}

      {Object.entries(grouped).map(([group, entries]) => (
        <div key={group} className="flex flex-col gap-2">
          <p className="text-[10px] font-black tracking-[3px] text-[#aab0a3] uppercase">{group}</p>
          {entries.map((listing) => {
            const soldOut = listing.remainingStock <= 0;
            const busy = buyingId === listing.id;
            const justBought = successId?.id === listing.id;
            return (
              <div key={listing.id} className="bg-black/20 border border-white/10 rounded-md p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[13px] font-bold text-[#f2f4ec]">{listing.item.name}</p>
                    <p className="text-[10px] text-[#aab0a3]">{listing.item.description}</p>
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
                </div>
                {justBought && <FlashMessage key={successId!.key} message={`Purchased ${listing.item.name}!`} />}
                <button onClick={() => onBuy(listing)} disabled={busy || soldOut} className="w-full py-2 rounded border border-[rgba(153,69,255,0.3)] bg-[#1a0a2e] text-[#9945FF] text-[10px] font-black tracking-[2px] disabled:opacity-40">
                  {busy ? "BUYING..." : soldOut ? "SOLD OUT" : "BUY"}
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
=======
const CATEGORY_META: Record<ShopShelf, { title: string; description: string; tone: string }> = {
  crew: {
    title: "Crew",
    description: "People and unit assets that add force, not equipment utility.",
    tone: "text-[#4f8cff]",
  },
  weapon: {
    title: "Weapons",
    description: "Direct offensive pieces that push attack pressure.",
    tone: "text-[#ff9d6b]",
  },
  armor: {
    title: "Armor",
    description: "Mitigation and survivability for PvP and raids.",
    tone: "text-[#7ef0c5]",
  },
  utility: {
    title: "Utility",
    description: "Mobility, intel, and tactical support gear.",
    tone: "text-[#d9a7ff]",
  },
  consumable: {
    title: "Consumables",
    description: "One-shot support items with instant or timed effects.",
    tone: "text-[#ffd36b]",
  },
};

function normalizeCategory(item: ShopItem): ShopShelf {
  const primary = String(item.subCategory || item.slot || item.category || "utility").toLowerCase();
  if (primary.includes("crew") || item.category.toLowerCase().includes("unit")) return "crew";
  if (primary.includes("weapon")) return "weapon";
  if (primary.includes("armor")) return "armor";
  if (primary.includes("consumable") || item.category.toLowerCase().includes("consumable")) return "consumable";
  if (primary.includes("mobility") || primary.includes("intel") || primary.includes("utility")) return "utility";
  return "utility";
}

function formatEffect(item: ShopItem) {
  if (!item.effectType) return null;
  const label = item.effectType.replaceAll("_", " ");
  if (item.effectValue == null) return label;
  return `${label} ${item.effectValue}`;
}

function statBadges(item: ShopItem) {
  const rows = [
    item.atk ? `ATK +${item.atk}` : null,
    item.def ? `DEF +${item.def}` : null,
    item.speed ? `SPD +${item.speed}` : null,
    item.dex ? `DEX +${item.dex}` : null,
    formatEffect(item),
  ].filter(Boolean) as string[];

  return rows.length ? rows : [item.slot ? `${item.slot} slot` : item.category];
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
}

function ShopItemsPanel({ items, shopCategory, buyingId, buyError, success, onCategoryChange, onBuy }: { items: ShopItem[]; shopCategory: ShopCategory; buyingId: string | null; buyError: string | null; success: { msg: string; itemId: string; key: number } | null; onCategoryChange: (category: ShopCategory) => void; onBuy: (item: ShopItem) => void; }) {
  const categoryCounts = useMemo(() => items.reduce((acc, item) => {
    const category = normalizeCategory(item);
    acc[category] += 1;
    acc.locked += item.locked ? 1 : 0;
    acc.owned += item.owned;
    return acc;
  }, { crew: 0, weapon: 0, armor: 0, utility: 0, consumable: 0, locked: 0, owned: 0 }), [items]);

  const sections = useMemo(() => {
    const grouped = SHOP_CATEGORY_ORDER.map((category) => ({ category, items: items.filter((item) => normalizeCategory(item) === category) })).filter((group) => group.items.length > 0);
    if (shopCategory === "all") return grouped;
    return grouped.filter((group) => group.category === shopCategory);
  }, [items, shopCategory]);

  return (
    <div className="flex flex-col gap-3">
      {buyError && <p className="text-[10px] font-bold text-[#ef5350]">{buyError}</p>}
      <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black tracking-[3px] text-[#aab0a3] uppercase">Shop layout</p>
            <p className="text-[12px] text-[#d0d5ca] mt-1">Crew is separated from support gear so people, tools, and consumables stop reading like one pile.</p>
          </div>
          <p className="text-[11px] font-black text-[#f2f4ec]">{items.length} items</p>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <div className="rounded-md border border-white/10 bg-black/20 p-3"><p className="text-[9px] font-bold tracking-[2px] text-[#aab0a3] uppercase">Crew</p><p className="mt-1 text-[16px] font-black text-[#66bb6a]">{categoryCounts.crew}</p></div>
          <div className="rounded-md border border-white/10 bg-black/20 p-3"><p className="text-[9px] font-bold tracking-[2px] text-[#aab0a3] uppercase">Owned</p><p className="mt-1 text-[16px] font-black text-[#f2f4ec]">{categoryCounts.owned}</p></div>
          <div className="rounded-md border border-white/10 bg-black/20 p-3"><p className="text-[9px] font-bold tracking-[2px] text-[#aab0a3] uppercase">Locked</p><p className="mt-1 text-[16px] font-black text-[#ff9800]">{categoryCounts.locked}</p></div>
          <div className="rounded-md border border-white/10 bg-black/20 p-3"><p className="text-[9px] font-bold tracking-[2px] text-[#aab0a3] uppercase">Gear</p><p className="mt-1 text-[16px] font-black text-[#42a5f5]">{categoryCounts.weapon + categoryCounts.armor + categoryCounts.utility}</p></div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", ...SHOP_CATEGORY_ORDER] as ShopCategory[]).map((category) => {
            const active = shopCategory === category;
            const label = category === "all" ? "All" : SHOP_CATEGORY_META[category].label;
            return (
              <button key={category} type="button" onClick={() => onCategoryChange(category)} className={`rounded-md border px-3 py-2 text-[10px] font-black tracking-[2px] uppercase ${active ? "border-[rgba(153,69,255,0.3)] bg-[#1a0a2e] text-[#9945FF]" : "border-white/10 bg-black/20 text-[#aab0a3]"}`}>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {sections.length === 0 ? (
        <div className="rounded-md border border-white/10 bg-black/20 p-3 text-[11px] text-[#aab0a3]">No items in this shelf yet.</div>
      ) : sections.map((section) => (
        <div key={section.category} className="flex flex-col gap-2">
          {shopCategory === "all" && (
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`text-[10px] font-black tracking-[3px] uppercase ${SHOP_CATEGORY_META[section.category].accent}`}>{SHOP_CATEGORY_META[section.category].label}</p>
                <p className="text-[11px] text-[#d0d5ca]">{SHOP_CATEGORY_META[section.category].note}</p>
              </div>
              <p className="text-[10px] font-black text-[#aab0a3]">{section.items.length}</p>
            </div>
          )}
          <div className="grid gap-2 md:grid-cols-2">
            {section.items.map((item) => {
              const category = normalizeCategory(item);
              const busy = buyingId === item.id;
              const justBought = success?.itemId === item.id;
              return (
                <div key={item.id} className="rounded-lg border border-white/10 bg-black/20 p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[13px] font-bold text-[#f2f4ec]">{item.name}</p>
                      <p className="text-[10px] text-[#d0d5ca]">LV {item.levelRequirement} - {SHOP_CATEGORY_META[category].label} - Owned {item.owned}</p>
                    </div>
                    <RarityBadge rarity={item.rarity} />
                  </div>
                  <p className="text-[10px] text-[#aab0a3]">{item.description}</p>
                  <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                    <span className="text-[#66bb6a]">${item.price.toLocaleString()}</span>
                    <span className={SHOP_CATEGORY_META[category].accent}>{SHOP_CATEGORY_META[category].label}</span>
                    {item.slot && category !== "crew" && <span className="text-[#42a5f5]">Slot {item.slot}</span>}
                    {item.subCategory && item.subCategory.toLowerCase() !== category && <span className="text-[#9945FF]">{item.subCategory}</span>}
                    {item.effectType && <span className="text-[#14F195]">{item.effectType.replaceAll("_", " ")}</span>}
                  </div>
                  {category === "crew" && <p className="text-[10px] text-[#d0d5ca]">Adds force to your roster. Crew is tracked separately from utility gear.</p>}
                  {justBought && <FlashMessage key={success!.key} message={success!.msg} />}
                  <button disabled={item.locked || busy} onClick={() => onBuy(item)} className="w-full py-2 rounded border border-white/10 text-[10px] font-black tracking-[2px] text-[#fdd835] disabled:opacity-40">
                    {busy ? "BUYING..." : item.locked ? "LOCKED" : "BUY"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ShopPage() {
<<<<<<< HEAD
  const [tab, setTab] = useState<ShopTab>("shop");
  const [shopCategory, setShopCategory] = useState<ShopCategory>("all");
=======
  const [category, setCategory] = useState<ShopCategory>("all");
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
  const [items, setItems] = useState<ShopItem[]>([]);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [shopBuyingId, setShopBuyingId] = useState<string | null>(null);
  const [shopBuyError, setShopBuyError] = useState<string | null>(null);
  const [shopSuccess, setShopSuccess] = useState<{ msg: string; itemId: string; key: number } | null>(null);
  const successCounter = useRef(0);

  const fetchShop = useCallback(async () => {
    try {
      const [itemsRes, meRes] = await Promise.all([
        api.get<{ all: ShopItem[] }>("/shop/items"),
        api.get<MeResponse>("/me"),
      ]);
      setItems(itemsRes.data.all);
      setMe(meRes.data);
    } finally {
      setLoading(false);
    }
  }, []);

<<<<<<< HEAD
  const fetchListings = useCallback(async () => {
    setListingsError(null);
    try {
      const res = await api.get<{ rotation: BlackMarketRotation; listings: BlackMarketListing[] }>("/black-market/listings");
      setRotation(res.data.rotation);
      setListings(res.data.listings);
    } catch (err) {
      setListingsError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to load listings.");
    }
  }, []);

  useEffect(() => { fetchShop(); }, [fetchShop]);
  useEffect(() => { if (tab === "listings") fetchListings(); }, [tab, fetchListings]);
=======
  useEffect(() => {
    fetchShop();
  }, [fetchShop]);
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39

  const buy = async (item: ShopItem) => {
    setShopBuyingId(item.id);
    setShopBuyError(null);
    try {
      await api.post("/shop/buy", { itemId: item.id, qty: 1 });
      await fetchShop();
      successCounter.current += 1;
      const key = successCounter.current;
      setShopSuccess({ msg: `Purchased ${item.name}!`, itemId: item.id, key });
      setTimeout(() => setShopSuccess((current) => (current?.key === key ? null : current)), 2200);
    } catch (err) {
      setShopBuyError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Purchase failed.");
    } finally {
      setShopBuyingId(null);
    }
  };

<<<<<<< HEAD
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
      setListingsError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Purchase failed.");
    } finally {
      setBuyingId(null);
    }
  };
=======
  const categoryCounts = useMemo(() => {
    return items.reduce<Record<ShopShelf, number>>(
      (acc, item) => {
        const key: ShopShelf = normalizeCategory(item);
        acc[key] += 1;
        return acc;
      },
      { crew: 0, weapon: 0, armor: 0, utility: 0, consumable: 0 },
    );
  }, [items]);
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39

  const groupedItems = useMemo(() => {
    const order: ShopShelf[] = ["crew", "weapon", "armor", "utility", "consumable"];
    const source = category === "all" ? items : items.filter((item) => normalizeCategory(item) === category);
    return order
      .map((group) => ({
        key: group,
        rows: source.filter((item) => normalizeCategory(item) === group),
        meta: CATEGORY_META[group],
      }))
      .filter((group) => group.rows.length > 0);
  }, [category, items]);

  const lockedCount = useMemo(() => items.filter((item) => item.locked).length, [items]);
  const ownedCount = useMemo(() => items.filter((item) => item.owned > 0).length, [items]);

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><LoadingSpinner size={32} /></div>;
  }

  return (
<<<<<<< HEAD
    <div className="flex flex-col gap-3">
      <div className="h-28 rounded-lg overflow-hidden border border-white/10 bg-black/20 backdrop-blur-sm flex items-end relative">
        <Image src="/assets/images/shop_banner.png" alt="Shop banner" fill className="object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        <div className="relative z-10 px-3 pb-3 flex items-end gap-2">
          <Store size={18} className="text-[#66bb6a] mb-0.5" />
          <div>
            <p className="text-[10px] font-black text-[#66bb6a] tracking-[3px] uppercase">Shop</p>
            <p className="text-[11px] font-semibold text-[#d0d5ca]">Crew, gear, consumables, and black market listings</p>
=======
    <div className="space-y-6 pb-12">
      <section className="sc-panel-strong overflow-hidden p-6 md:p-7">
        <div className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="sc-kicker">ARMORY</span>
              <span className="sc-chip sc-chip-purple">{items.length} stocked items</span>
            </div>
            <div>
              <h1 className="sc-page-title">Separate crew from gear</h1>
              <p className="sc-subtitle max-w-3xl">
                Crew, weapons, armor, utility gear, and consumables now live on distinct shelves so people, gear, and support items stop reading like the same type of purchase.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <div className="sc-stat">
                <div className="sc-label">Wallet</div>
                <div className="sc-value">${Math.floor(me?.cash ?? 0).toLocaleString()}</div>
              </div>
              <div className="sc-stat">
                <div className="sc-label">Owned lines</div>
                <div className="sc-value">{ownedCount}</div>
              </div>
              <div className="sc-stat">
                <div className="sc-label">Locked</div>
                <div className="sc-value">{lockedCount}</div>
              </div>
              <div className="sc-stat">
                <div className="sc-label">Utility note</div>
                <div className="sc-value">Equip slot logic</div>
                <div className="mt-2 text-xs text-white/45">Slotted gear auto-equips only when the slot is empty.</div>
              </div>
            </div>
          </div>

          <div className="sc-panel p-5">
            <div className="sc-kicker">SHOP BREAKDOWN</div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {(["crew", "weapon", "armor", "utility", "consumable"] as const).map((key) => (
                <div key={key} className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="sc-label">{CATEGORY_META[key].title}</div>
                      <div className={`mt-2 text-lg font-black ${CATEGORY_META[key].tone}`}>{categoryCounts[key]}</div>
                    </div>
                    <button type="button" className="sc-button" onClick={() => setCategory(key)}>
                      View
                    </button>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-white/55">{CATEGORY_META[key].description}</p>
                </div>
              ))}
            </div>
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
          </div>
        </div>
      </section>

<<<<<<< HEAD
      <div className="grid grid-cols-2">
        {(["shop", "listings"] as ShopTab[]).map((id) => (
          <button key={id} onClick={() => setTab(id)} className={`py-2 border text-[10px] font-black tracking-[2px] uppercase ${tab === id ? "bg-[#1a0a2e] border-[rgba(153,69,255,0.3)] text-[#9945FF]" : "bg-black/20 border-white/10 text-[#aab0a3]"}`}>
            {id === "shop" ? "Shop Items" : "Listings"}
=======
      <section className="flex flex-wrap gap-2">
        {([
          ["all", "All shelves"],
          ["crew", "Crew"],
          ["weapon", "Weapons"],
          ["armor", "Armor"],
          ["utility", "Utility"],
          ["consumable", "Consumables"],
        ] as Array<[ShopCategory, string]>).map(([value, label]) => (
          <button key={value} type="button" onClick={() => setCategory(value)} className={category === value ? "sc-button sc-button-primary" : "sc-button"}>
            {label}
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
          </button>
        ))}
      </section>

<<<<<<< HEAD
      {tab === "shop" ? (
        <ShopItemsPanel items={items} shopCategory={shopCategory} buyingId={shopBuyingId} buyError={shopBuyError} success={shopSuccess} onCategoryChange={setShopCategory} onBuy={buy} />
      ) : (
        <>
          {listingsError && <p className="text-[10px] font-bold text-[#ef5350]">{listingsError}</p>}
          <ListingsPanel rotation={rotation} listings={listings} buyingId={buyingId} successId={listingSuccess} onBuy={buyListing} />
        </>
      )}
=======
      {shopBuyError ? <div className="sc-panel-danger p-4 text-[12px] text-[#ffb0b0]">{shopBuyError}</div> : null}

      <div className="space-y-6">
        {groupedItems.map((group) => (
          <section key={group.key} className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="sc-kicker">{group.meta.title}</div>
                <h2 className="mt-2 text-2xl font-black text-white">{group.rows.length} items</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">{group.meta.description}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {group.rows.map((item) => {
                const busy = shopBuyingId === item.id;
                const justBought = shopSuccess?.itemId === item.id;
                const effect = formatEffect(item);

                return (
                  <div key={item.id} className="sc-panel-strong p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="sc-kicker">{item.subCategory ?? group.key}{item.slot ? ` / ${item.slot}` : ""}</div>
                        <h3 className="mt-2 text-2xl font-black text-white">{item.name}</h3>
                      </div>
                      <RarityBadge rarity={item.rarity} />
                    </div>

                    <p className="mt-3 text-sm leading-6 text-white/60">{item.description}</p>

                    <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.12em]">
                      <span className="sc-chip sc-chip-green">${item.price.toLocaleString()}</span>
                      <span className="sc-chip">LV {item.levelRequirement}</span>
                      <span className="sc-chip sc-chip-purple">Owned {item.owned}</span>
                      {effect ? <span className="sc-chip sc-chip-orange">{effect}</span> : null}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {statBadges(item).map((label) => (
                        <span key={label} className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/65">
                          {label}
                        </span>
                      ))}
                    </div>

                    <div className="mt-5 flex items-end justify-between gap-3">
                      <div>
                        <div className="sc-label">Spend</div>
                        <div className="mt-1 text-[24px] font-black text-[#36d47f]">${item.price.toLocaleString()}</div>
                        <div className="mt-1 text-xs text-white/45">
                          {item.locked ? `Requires level ${item.levelRequirement}` : normalizeCategory(item) === "crew" ? "Adds force to your roster." : "Available now"}
                        </div>
                      </div>
                      <button disabled={item.locked || busy} onClick={() => buy(item)} className={`sc-button ${item.locked ? "text-[#555]" : "sc-button-primary"}`}>
                        {busy ? "BUYING..." : item.locked ? "LOCKED" : "BUY"}
                      </button>
                    </div>

                    {justBought ? <p className="mt-3 text-[11px] font-black text-[#36d47f]">{shopSuccess?.msg}</p> : null}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
    </div>
  );
}
