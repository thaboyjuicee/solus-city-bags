"use client";

import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";

const SLS_MINT = new PublicKey("ELTXCFp1tmtfu39CPw6afnMSjW1BBxjinorJQsKmBAGS");

export function useSLSBalance(): number | null {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!publicKey) {
      setBalance(null);
      return;
    }

    let cancelled = false;

    async function fetchBalance() {
      try {
        const accounts = await connection.getParsedTokenAccountsByOwner(publicKey!, {
          mint: SLS_MINT,
        });
        if (cancelled) return;
        const uiAmount =
          accounts.value[0]?.account.data.parsed.info.tokenAmount.uiAmount ?? 0;
        setBalance(uiAmount);
      } catch {
        if (!cancelled) setBalance(null);
      }
    }

    fetchBalance();
    return () => {
      cancelled = true;
    };
  }, [connection, publicKey]);

  return balance;
}
