"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Store } from "lucide-react";
import { api } from "@/lib/api/client";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { RarityBadge } from "@/components/game/RarityBadge";
import { BlackMarketListing, BlackMarketRotation } from "@/lib/gameApi";

type ShopTab = "shop" | "listings";
type ShopCategory = "all" | "crew" | "weapon" | "armor" | "utility" | "consumable";

type ShopItem = {
  id: string;
  category: string;
  subCategory?: string | null;
  name: string;
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
  const [tab, setTab] = useState<ShopTab>("shop");
  const [shopCategory, setShopCategory] = useState<ShopCategory>("all");
  const [items, setItems] = useState<ShopItem[]>([]);
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
      const res = await api.get<{ all: ShopItem[] }>("/shop/items");
      setItems(res.data.all);
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
      setListingsError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to load listings.");
    }
  }, []);

  useEffect(() => { fetchShop(); }, [fetchShop]);
  useEffect(() => { if (tab === "listings") fetchListings(); }, [tab, fetchListings]);

  const buy = async (item: ShopItem) => {
    setShopBuyingId(item.id);
    setShopBuyError(null);
    try {
      await api.post("/shop/buy", { itemId: item.id, qty: 1 });
      await fetchShop();
      successCounter.current += 1;
      const key = successCounter.current;
      setShopSuccess({ msg: `Purchased ${item.name}!`, itemId: item.id, key });
      setTimeout(() => setShopSuccess((s) => (s?.key === key ? null : s)), 2500);
    } catch (err) {
      setShopBuyError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Purchase failed.");
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
      setListingsError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Purchase failed.");
    } finally {
      setBuyingId(null);
    }
  };

  if (loading) return <div className="flex min-h-dvh items-center justify-center"><LoadingSpinner size={32} /></div>;

  return (
    <div className="flex flex-col gap-3">
      <div className="h-28 rounded-lg overflow-hidden border border-white/10 bg-black/20 backdrop-blur-sm flex items-end relative">
        <Image src="/assets/images/shop_banner.png" alt="Shop banner" fill className="object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        <div className="relative z-10 px-3 pb-3 flex items-end gap-2">
          <Store size={18} className="text-[#66bb6a] mb-0.5" />
          <div>
            <p className="text-[10px] font-black text-[#66bb6a] tracking-[3px] uppercase">Shop</p>
            <p className="text-[11px] font-semibold text-[#d0d5ca]">Crew, gear, consumables, and black market listings</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2">
        {(["shop", "listings"] as ShopTab[]).map((id) => (
          <button key={id} onClick={() => setTab(id)} className={`py-2 border text-[10px] font-black tracking-[2px] uppercase ${tab === id ? "bg-[#1a0a2e] border-[rgba(153,69,255,0.3)] text-[#9945FF]" : "bg-black/20 border-white/10 text-[#aab0a3]"}`}>
            {id === "shop" ? "Shop Items" : "Listings"}
          </button>
        ))}
      </div>

      {tab === "shop" ? (
        <ShopItemsPanel items={items} shopCategory={shopCategory} buyingId={shopBuyingId} buyError={shopBuyError} success={shopSuccess} onCategoryChange={setShopCategory} onBuy={buy} />
      ) : (
        <>
          {listingsError && <p className="text-[10px] font-bold text-[#ef5350]">{listingsError}</p>}
          <ListingsPanel rotation={rotation} listings={listings} buyingId={buyingId} successId={listingSuccess} onBuy={buyListing} />
        </>
      )}
    </div>
  );
}
