export function applyVaultTransfer(
  walletCash: number,
  vaultCash: number,
  amount: number,
  type: "deposit" | "withdraw"
) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be greater than 0");
  }

  if (type === "deposit") {
    if (amount > walletCash) {
      throw new Error("Insufficient wallet cash");
    }
    return {
      walletCash: walletCash - amount,
      vaultCash: vaultCash + amount,
    };
  }

  if (amount > vaultCash) {
    throw new Error("Insufficient vault cash");
  }

  return {
    walletCash: walletCash + amount,
    vaultCash: vaultCash - amount,
  };
}
