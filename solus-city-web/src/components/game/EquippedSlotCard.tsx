"use client";

import { RarityBadge } from "./RarityBadge";

export function EquippedSlotCard({
  slot,
  name,
  rarity,
}: {
  slot: string;
  name?: string;
  rarity?: string | null;
}) {
  return (
    <div className="sc-panel p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
<<<<<<< HEAD
        <p className="text-[10px] font-black tracking-[2px] text-[#aab0a3] uppercase">{slot}</p>
        <RarityBadge rarity={rarity} />
      </div>
      <p className="text-[12px] font-bold text-[#f2f4ec]">{name ?? "Empty"}</p>
    </div>
  );
}

=======
        <p className="sc-label">{slot}</p>
        <RarityBadge rarity={rarity} />
      </div>
      <p className="text-[16px] font-black text-[#f4f5fb]">{name ?? "Empty"}</p>
    </div>
  );
}
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
