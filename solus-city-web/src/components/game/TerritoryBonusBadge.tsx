export function TerritoryBonusBadge({ bonusType, bonusValue }: { bonusType: string; bonusValue: number }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-bold tracking-[1px] text-[#ddd]">
      {bonusType.replaceAll("_", " ")} +{bonusValue}
    </span>
  );
}
