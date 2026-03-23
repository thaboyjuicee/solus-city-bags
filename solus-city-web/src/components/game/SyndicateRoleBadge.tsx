export function SyndicateRoleBadge({ role }: { role: string | null | undefined }) {
  const normalized = (role ?? "member").replaceAll("_", " ");
  return (
    <span className="inline-flex w-fit items-center rounded-full border border-[rgba(153,69,255,0.3)] bg-[#1a0a2e] px-2 py-0.5 text-[10px] font-black tracking-[2px] uppercase text-[#9945FF]">
      {normalized}
    </span>
  );
}
