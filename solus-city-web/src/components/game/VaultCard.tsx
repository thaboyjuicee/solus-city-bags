export function VaultCard({
  walletCash,
  vaultCash,
}: {
  walletCash: number;
  vaultCash: number;
}) {
  return (
    <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-3">
      <p className="text-[9px] font-bold tracking-[2px] text-[#555] mb-2">CASH STORAGE</p>
      <div className="flex items-center justify-between text-[11px] font-bold">
        <span className="text-[#888]">Wallet</span>
        <span className="text-[#66bb6a]">${Math.floor(walletCash).toLocaleString()}</span>
      </div>
      <div className="flex items-center justify-between text-[11px] font-bold mt-1">
        <span className="text-[#888]">Vault</span>
        <span className="text-[#42a5f5]">${Math.floor(vaultCash).toLocaleString()}</span>
      </div>
    </div>
  );
}
