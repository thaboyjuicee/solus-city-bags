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
    <div className="sc-panel p-4 flex flex-col gap-3">
      <p className="sc-kicker">{title}</p>
      {items.length === 0 ? (
        <p className="text-[12px] text-[#777]">No contributions yet.</p>
      ) : (
        items.map((item) => (
          <div key={item.id} className="rounded-xl border border-white/8 bg-[#0c0d13] px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[13px] font-black text-[#f3f4fa]">{item.userName}</p>
              <p className="mt-1 text-[10px] font-black tracking-[0.12em] text-[#73778b] uppercase">
                {(item.syndicateName ? `${item.syndicateName} • ` : "") + item.actionType.replaceAll("_", " ")}
              </p>
            </div>
            <p className="text-[14px] font-black text-[#36d47f]">+{item.influenceDelta ?? item.points ?? 0}</p>
          </div>
        ))
      )}
    </div>
  );
}
