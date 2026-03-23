type ContributionItem = {
  id: string;
  userName: string;
  syndicateName?: string;
  actionType: string;
  influenceDelta?: number;
  points?: number;
  createdAt?: string;
};

export function ContributionList({
  title,
  items,
}: {
  title: string;
  items: ContributionItem[];
}) {
  return (
<<<<<<< HEAD
    <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-2">
      <p className="text-[10px] font-black tracking-[3px] text-[#aab0a3] uppercase">{title}</p>
=======
    <div className="sc-panel p-4 flex flex-col gap-3">
      <p className="sc-kicker">{title}</p>
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
      {items.length === 0 ? (
        <p className="text-[12px] text-[#777]">No contributions yet.</p>
      ) : (
        items.map((item) => (
          <div key={item.id} className="rounded-xl border border-white/8 bg-[#0c0d13] px-4 py-3 flex items-center justify-between gap-3">
            <div>
<<<<<<< HEAD
              <p className="text-[12px] font-bold text-[#f2f4ec]">{item.userName}</p>
              <p className="text-[10px] text-[#777]">
                {(item.syndicateName ? `${item.syndicateName} - ` : "") + item.actionType.replaceAll("_", " ")}
=======
              <p className="text-[13px] font-black text-[#f3f4fa]">{item.userName}</p>
              <p className="mt-1 text-[10px] font-black tracking-[0.12em] text-[#73778b] uppercase">
                {(item.syndicateName ? `${item.syndicateName} • ` : "") + item.actionType.replaceAll("_", " ")}
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
              </p>
            </div>
            <p className="text-[14px] font-black text-[#36d47f]">+{item.influenceDelta ?? item.points ?? 0}</p>
          </div>
        ))
      )}
    </div>
  );
<<<<<<< HEAD
}


=======
}
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
