"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api/client";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { RarityBadge } from "@/components/game/RarityBadge";
import { MeResponse } from "@/lib/gameApi";

type ShopCategory = "all" | "weapon" | "armor" | "consumable" | "utility";
type ShopItem = { id: string; category: string; subCategory?: string | null; name: string; price: number; levelRequirement: number; rarity?: string | null; slot?: string | null; description?: string | null; consumable?: boolean; effectType?: string | null; effectValue?: number | null; owned: number; locked: boolean; };
function normalizeCategory(item: ShopItem): ShopCategory { const value = (item.category || item.slot || "utility").toLowerCase(); if (value.includes("weapon")) return "weapon"; if (value.includes("armor")) return "armor"; if (value.includes("consumable")) return "consumable"; if (value.includes("utility")) return "utility"; return "utility"; }

export default function ShopPage() {
  const [category, setCategory] = useState<ShopCategory>("all");
  const [items, setItems] = useState<ShopItem[]>([]);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [shopBuyingId, setShopBuyingId] = useState<string | null>(null);
  const [shopBuyError, setShopBuyError] = useState<string | null>(null);
  const [shopSuccess, setShopSuccess] = useState<{ msg: string; itemId: string; key: number } | null>(null);
  const successCounter = useRef(0);

  const fetchShop = useCallback(async () => {
    try { const [itemsRes, meRes] = await Promise.all([api.get<{ all: ShopItem[] }>("/shop/items"), api.get<MeResponse>("/me")]); setItems(itemsRes.data.all); setMe(meRes.data); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchShop(); }, [fetchShop]);

  const buy = async (item: ShopItem) => {
    setShopBuyingId(item.id); setShopBuyError(null);
    try { await api.post("/shop/buy", { itemId: item.id, qty: 1 }); await fetchShop(); successCounter.current += 1; const key = successCounter.current; setShopSuccess({ msg: `Purchased ${item.name}!`, itemId: item.id, key }); setTimeout(() => setShopSuccess((current) => (current?.key === key ? null : current)), 2200); }
    catch (err) { setShopBuyError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Purchase failed."); }
    finally { setShopBuyingId(null); }
  };

  const filteredItems = useMemo(() => category === "all" ? items : items.filter((item) => normalizeCategory(item) === category), [category, items]);
  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><LoadingSpinner size={32} /></div>;

  return <div className="space-y-4"><div className="flex items-start justify-between gap-4"><div><p className="sc-page-title">Equipment Shop</p><p className="sc-subtitle mt-2">Gear up · arm yourself</p></div><div className="text-right"><p className="sc-kicker">Your Cash</p><p className="mt-2 text-[24px] font-black text-[#36d47f]">${Math.floor(me?.cash ?? 0).toLocaleString()}</p></div></div><div className="flex flex-wrap gap-2 border-b border-white/8 pb-3">{([ ["all", "All Items"], ["weapon", "Weapons"], ["armor", "Armor"], ["consumable", "Consumables"], ["utility", "Utility"] ] as Array<[ShopCategory, string]>).map(([value, label]) => <button key={value} type="button" onClick={() => setCategory(value)} className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] ${category === value ? "bg-[rgba(153,69,255,0.14)] text-[#9f64ff]" : "text-[#5f6377]"}`}>{label}</button>)}</div>{shopBuyError ? <div className="sc-panel-danger p-4 text-[12px] text-[#ffb0b0]">{shopBuyError}</div> : null}<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filteredItems.map((item) => { const busy = shopBuyingId === item.id; const justBought = shopSuccess?.itemId === item.id; return <div key={item.id} className="sc-panel p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#696d82]">{normalizeCategory(item)}{item.slot ? ` · ${item.slot}` : ""}</p><p className="mt-2 text-[24px] font-black text-[#f4f5fb]">{item.name}</p></div><RarityBadge rarity={item.rarity} /></div><p className="mt-3 text-[12px] text-[#7a7f95]">{item.description}</p><div className="mt-4 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.12em]"><span className="sc-chip sc-chip-green">${item.price.toLocaleString()}</span><span className="sc-chip">LV {item.levelRequirement}</span>{item.subCategory ? <span className="sc-chip sc-chip-purple">{item.subCategory}</span> : null}{item.effectType ? <span className="sc-chip sc-chip-orange">{item.effectType.replaceAll("_", " ")}</span> : null}</div><div className="mt-5 flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#65697d]">Price</p><p className="mt-1 text-[24px] font-black text-[#36d47f]">${item.price.toLocaleString()}</p></div><button disabled={item.locked || busy} onClick={() => buy(item)} className={`sc-button ${item.locked ? "text-[#555]" : "sc-button-primary"}`}>{busy ? "BUYING..." : item.locked ? "LOCKED" : "BUY"}</button></div>{justBought ? <p className="mt-3 text-[11px] font-black text-[#36d47f]">{shopSuccess?.msg}</p> : null}</div>; })}</div></div>;
}