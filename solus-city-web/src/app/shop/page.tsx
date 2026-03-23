"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api/client";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { RarityBadge } from "@/components/game/RarityBadge";
import { MeResponse } from "@/lib/gameApi";

type ShopCategory = "all" | "crew" | "weapon" | "armor" | "consumable" | "utility";
type ShopShelf = Exclude<ShopCategory, "all">;

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
}

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

  useEffect(() => {
    fetchShop();
  }, [fetchShop]);

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
          </div>
        </div>
      </section>

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
          </button>
        ))}
      </section>

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
    </div>
  );
}
