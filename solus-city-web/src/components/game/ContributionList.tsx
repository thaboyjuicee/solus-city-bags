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
    <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-2">
      <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase">{title}</p>
      {items.length === 0 ? (
        <p className="text-[12px] text-[#777]">No contributions yet.</p>
      ) : (
        items.map((item) => (
          <div key={item.id} className="rounded-md border border-white/10 bg-black/20 p-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[12px] font-bold text-[#eee]">{item.userName}</p>
              <p className="text-[10px] text-[#777]">
                {(item.syndicateName ? `${item.syndicateName} • ` : "") + item.actionType.replaceAll("_", " ")}
              </p>
            </div>
            <p className="text-[12px] font-black text-[#66bb6a]">+{item.influenceDelta ?? item.points ?? 0}</p>
          </div>
        ))
      )}
    </div>
  );
}
