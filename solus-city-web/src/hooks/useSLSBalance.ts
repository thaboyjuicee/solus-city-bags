"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";

const SLS_MINT = new PublicKey("ELTXCFp1tmtfu39CPw6afnMSjW1BBxjinorJQsKmBAGS");

export const SLS_BALANCE_REFRESH_EVENT = "sls-balance-refresh";

export function useSLSBalance(): number | null {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!publicKey) {
      setBalance(null);
      return;
    }
    try {
      const accounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
        mint: SLS_MINT,
      });
      const uiAmount =
        accounts.value[0]?.account.data.parsed.info.tokenAmount.uiAmount ?? 0;
      setBalance(uiAmount);
    } catch {
      setBalance(null);
    }
  }, [connection, publicKey]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  useEffect(() => {
    window.addEventListener(SLS_BALANCE_REFRESH_EVENT, fetchBalance);
    return () => window.removeEventListener(SLS_BALANCE_REFRESH_EVENT, fetchBalance);
  }, [fetchBalance]);

  return balance;
}
