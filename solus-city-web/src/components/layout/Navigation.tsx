"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

const TAB_LINKS = [
  { href: "/home", label: "Home" },
  { href: "/crimes", label: "Crimes" },
  { href: "/targets", label: "Targets" },
  { href: "/gym", label: "Gym" },
  { href: "/shop", label: "Shop" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/profile", label: "Profile" },
  { href: "/attack-logs", label: "Attack Logs" },
  { href: "/syndicates", label: "Syndicates" },
];

export function Navigation() {
  const pathname = usePathname();

  // Don't render the nav on the login page
  if (pathname === "/login") return null;

  return (
    <header className="sticky top-0 z-50 bg-surface border-b border-border">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        <Link href="/home" className="text-accent font-bold text-lg tracking-wider">
          SOLUS CITY
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {TAB_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                pathname === href
                  ? "bg-accent text-white"
                  : "text-text-secondary hover:text-text-primary hover:bg-border"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <WalletMultiButton />
      </div>

      {/* Mobile bottom nav (main tabs only) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border flex justify-around py-2 z-50">
        {TAB_LINKS.slice(0, 5).map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center text-xs gap-0.5 px-2 ${
              pathname === href ? "text-accent" : "text-text-dim"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
