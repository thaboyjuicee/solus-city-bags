import type { Metadata } from "next";
import dynamic from "next/dynamic";
import "./globals.css";
import { SolanaWalletProvider } from "@/components/providers/WalletProvider";

// WalletMultiButton renders an <i> icon that only exists on the client,
// causing a server/client HTML mismatch. Skipping SSR for Navigation
// prevents Next.js from server-rendering it at all.
const Navigation = dynamic(
  () => import("@/components/layout/Navigation").then((m) => m.Navigation),
  { ssr: false }
);

export const metadata: Metadata = {
  title: "Solus City",
  description: "The web client for Solus City — the on-chain crime RPG",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-background text-text-primary min-h-dvh">
        <SolanaWalletProvider>
          <div className="flex flex-col min-h-dvh">
            <Navigation />
            <main className="flex-1">{children}</main>
          </div>
        </SolanaWalletProvider>
      </body>
    </html>
  );
}
