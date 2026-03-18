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
const GamePageChrome = dynamic(
  () =>
    import("@/components/layout/GamePageChrome").then(
      (m) => m.GamePageChrome
    ),
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
      <body className="min-h-dvh">
        <SolanaWalletProvider>
          <div className="relative min-h-dvh">
            <Navigation />
            <main className="min-h-dvh pt-14 md:pt-14">
              <GamePageChrome>{children}</GamePageChrome>
            </main>
          </div>
        </SolanaWalletProvider>
      </body>
    </html>
  );
}
