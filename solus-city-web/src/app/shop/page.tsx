"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { RarityBadge } from "@/components/game/RarityBadge";

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

export default function ShopPage() {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    const res = await api.get<{ all: ShopItem[] }>("/shop/items");
    setItems(res.data.all);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const buy = async (item: ShopItem) => {
    await api.post("/shop/buy", { itemId: item.id, qty: 1 });
    await fetchItems();
  };

  if (loading) return <div className="flex min-h-dvh items-center justify-center"><LoadingSpinner size={32} /></div>;

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-white/10 bg-black/20 p-4">
        <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase">Shop</p>
        <p className="text-[12px] text-[#888] mt-1">Wave 2 now exposes item rarity, slot, and effect hints.</p>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-lg border border-white/10 bg-black/20 p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[13px] font-bold text-[#eee]">{item.name}</p>
                <p className="text-[10px] text-[#777]">LV {item.levelRequirement} • Owned {item.owned}</p>
              </div>
              <RarityBadge rarity={item.rarity} />
            </div>
            <p className="text-[10px] text-[#666]">{item.description}</p>
            <div className="flex flex-wrap gap-2 text-[10px] font-bold">
              <span className="text-[#66bb6a]">${item.price.toLocaleString()}</span>
              {item.slot && <span className="text-[#42a5f5]">Slot {item.slot}</span>}
              {item.subCategory && <span className="text-[#9945FF]">{item.subCategory}</span>}
              {item.effectType && <span className="text-[#14F195]">{item.effectType.replaceAll("_", " ")}</span>}
            </div>
            <button disabled={item.locked} onClick={() => buy(item)} className="w-full py-2 rounded border border-white/10 text-[10px] font-black tracking-[2px] text-[#fdd835] disabled:opacity-40">
              {item.locked ? "LOCKED" : "BUY"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
