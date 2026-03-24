export function truncateWallet(wallet: string): string {
  if (!wallet || wallet.length < 8) return wallet;
  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
}

export function displayName(name: string | null | undefined, wallet: string): string {
  return name?.trim() || truncateWallet(wallet);
}
