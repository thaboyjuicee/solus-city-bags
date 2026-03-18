"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Crosshair,
  Dumbbell,
  Home,
  MoreHorizontal,
  ScrollText,
  Store,
  Trophy,
  UserRound,
  Users,
  History,
  Swords,
} from "lucide-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

type NavTab = {
  href: string;
  label: string;
  icon?:
    | "home"
    | "crosshair"
    | "swords"
    | "dumbbell"
    | "store"
    | "leaderboard"
    | "attackLogs"
    | "profile"
    | "syndicates"
    | "result";
};

const NAV_TABS: NavTab[] = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/crimes", label: "Crimes", icon: "crosshair" },
  { href: "/targets", label: "Battle", icon: "swords" },
  { href: "/gym", label: "Gym", icon: "dumbbell" },
  { href: "/shop", label: "Shop", icon: "store" },
  { href: "/leaderboard", label: "Leaderboard", icon: "leaderboard" },
  { href: "/attack-logs", label: "Attack Logs", icon: "attackLogs" },
  { href: "/profile", label: "Profile", icon: "profile" },
  { href: "/syndicates", label: "Syndicates", icon: "syndicates" },
  { href: "/battle-result", label: "Battle Result", icon: "result" },
];

const ICONS: Record<NonNullable<NavTab["icon"]>, typeof Home> = {
  home: Home,
  crosshair: Crosshair,
  swords: Swords,
  dumbbell: Dumbbell,
  store: Store,
  leaderboard: Trophy,
  attackLogs: ScrollText,
  profile: UserRound,
  syndicates: Users,
  result: History,
};

function Icon({ name }: { name: NavTab["icon"] }) {
  const C = ICONS[name ?? "home"];
  return <C size={20} />;
}

function isActive(href: string, path: string) {
  return path === href || path.startsWith(`${href}/`);
}

export function Navigation() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const path = useMemo(
    () => (pathname === "/" ? "/home" : pathname ?? "/home"),
    [pathname]
  );

  useEffect(() => {
    setMoreOpen(false);
  }, [path]);

  if (pathname === "/login") return null;

  const mobileMoreTabs = NAV_TABS.slice(4);
  const moreActive = mobileMoreTabs.some((tab) => isActive(tab.href, path));

  return (
    <>
      <nav className="hidden md:block fixed top-0 left-0 right-0 h-14 bg-[#111] border-b border-[#1e1e1e] z-50">
        <div className="h-full px-3 flex items-center justify-between gap-3 relative">
          <Link
            href="/home"
            className="text-[#eee] font-black tracking-[3px] text-sm flex-shrink-0"
          >
            SOLUS CITY
          </Link>

          <div className="flex items-center gap-0 relative h-full">
            {NAV_TABS.map((tab) => {
              const active = isActive(tab.href, path);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex items-center gap-2 px-2.5 h-full text-[11px] font-bold tracking-[2px] uppercase transition-colors ${
                    active
                      ? "bg-[#1a0a2e] text-[#9945FF]"
                      : "text-[#555] hover:text-[#888]"
                  }`}
                >
                  <Icon name={tab.icon} />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex-shrink-0 w-[170px] flex justify-end">
            <WalletMultiButton className="justify-center" />
          </div>
        </div>
      </nav>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-[#111] border-t border-[#1e1e1e] z-50 flex justify-around items-center">
        {NAV_TABS.slice(0, 4).map((tab) => {
          const active = isActive(tab.href, path);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center justify-center gap-1"
            >
              <Icon name={tab.icon} />
              <span
                className={`text-[9px] font-bold tracking-[2px] uppercase ${
                  active ? "text-[#9945FF]" : "text-[#555]"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}

        <button
          onClick={() => setMoreOpen((v) => !v)}
          className="flex flex-col items-center justify-center gap-1"
          type="button"
        >
          <MoreHorizontal
            size={20}
            className={moreOpen || moreActive ? "text-[#9945FF]" : "text-[#555]"}
          />
          <span
            className={`text-[9px] font-bold tracking-[2px] uppercase ${
              moreOpen || moreActive ? "text-[#9945FF]" : "text-[#555]"
            }`}
          >
            MORE
          </span>
        </button>
      </nav>

      {moreOpen && (
        <div className="md:hidden fixed left-0 right-0 bottom-14 border-t border-[#1e1e1e] bg-[#111] z-50">
          {NAV_TABS.slice(4).map((tab) => {
            const active = isActive(tab.href, path);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-2 px-4 py-2.5 text-[11px] font-bold tracking-[2px] uppercase border-b border-[#1e1e1e] transition-colors ${
                  active ? "bg-[#1a0a2e] text-[#9945FF]" : "text-[#555]"
                }`}
                onClick={() => setMoreOpen(false)}
              >
                <Icon name={tab.icon} />
                {tab.label}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
