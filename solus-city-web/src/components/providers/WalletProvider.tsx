"use client";

import React, { useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { clusterApiUrl } from "@solana/web3.js";
import { SOLANA_NETWORK } from "@/lib/config";

// Default styles for the wallet modal — can be overridden in globals.css
import "@solana/wallet-adapter-react-ui/styles.css";

interface Props {
  children: React.ReactNode;
}

type SolanaConnectionProviderProps = {
  endpoint: string;
  children?: React.ReactNode;
};

type SolanaWalletProviderProps = {
  wallets: ReadonlyArray<unknown>;
  autoConnect?: boolean;
  children?: React.ReactNode;
};

type SolanaWalletModalProviderProps = {
  children?: React.ReactNode;
};

const TypedConnectionProvider =
  ConnectionProvider as React.ComponentType<SolanaConnectionProviderProps>;

const TypedWalletProvider = WalletProvider as React.ComponentType<SolanaWalletProviderProps>;

const TypedWalletModalProvider =
  WalletModalProvider as React.ComponentType<SolanaWalletModalProviderProps>;

export function SolanaWalletProvider({ children }: Props) {
  const endpoint = useMemo(
    () => process.env.NEXT_PUBLIC_HELIUS_RPC_URL ?? clusterApiUrl(SOLANA_NETWORK),
    []
  );

  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <TypedConnectionProvider endpoint={endpoint}>
      <TypedWalletProvider wallets={wallets} autoConnect>
        <TypedWalletModalProvider>{children}</TypedWalletModalProvider>
      </TypedWalletProvider>
    </TypedConnectionProvider>
  );
}
