"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Box,
  CalendarDays,
  Crosshair,
  Crown,
  Dumbbell,
  Home,
  ListTodo,
  MoreHorizontal,
  ScrollText,
  ShoppingBag,
  Sparkles,
  Store,
  Trophy,
  UserRound,
  Users,
  History,
  Swords,
  Shield,
  Map,
} from "lucide-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useSLSBalance } from "@/hooks/useSLSBalance";

type NavTab = {
  href: string;
  label: string;
  icon?: "home" | "crosshair" | "swords" | "dumbbell" | "store" | "blackMarket" | "leaderboard" | "attackLogs" | "profile" | "syndicates" | "wars" | "territories" | "result" | "missions" | "inventory" | "seasons" | "prestige" | "championships";
};

const NAV_TABS: NavTab[] = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/crimes", label: "Crimes", icon: "crosshair" },
  { href: "/targets", label: "Battle", icon: "swords" },
  { href: "/gym", label: "Gym", icon: "dumbbell" },
  { href: "/shop", label: "Shop", icon: "store" },
  { href: "/black-market", label: "Black Market", icon: "blackMarket" },
  { href: "/inventory", label: "Inventory", icon: "inventory" },
  { href: "/leaderboard", label: "Leaderboard", icon: "leaderboard" },
  { href: "/seasons", label: "Seasons", icon: "seasons" },
  { href: "/prestige", label: "Prestige", icon: "prestige" },
  { href: "/championships", label: "Championships", icon: "championships" },
  { href: "/attack-logs", label: "Attack Logs", icon: "attackLogs" },
  { href: "/missions", label: "Missions", icon: "missions" },
  { href: "/profile", label: "Profile", icon: "profile" },
  { href: "/syndicates", label: "Syndicates", icon: "syndicates" },
  { href: "/wars", label: "Wars", icon: "wars" },
  { href: "/territories", label: "Territories", icon: "territories" },
  { href: "/battle-result", label: "Battle Result", icon: "result" },
];

const ICONS: Record<NonNullable<NavTab["icon"]>, typeof Home> = {
  home: Home,
  crosshair: Crosshair,
  swords: Swords,
  dumbbell: Dumbbell,
  store: Store,
  blackMarket: ShoppingBag,
  leaderboard: Trophy,
  attackLogs: ScrollText,
  profile: UserRound,
  syndicates: Users,
  wars: Shield,
  territories: Map,
  result: History,
  missions: ListTodo,
  inventory: Box,
  seasons: CalendarDays,
  prestige: Sparkles,
  championships: Crown,
};

function Icon({ name }: { name: NavTab["icon"] }) {
  const C = ICONS[name ?? "home"];
  return <C size={20} />;
}

function isActive(href: string, path: string) {
  return path === href || path.startsWith(`${href}/`);
}

function formatSls(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(2);
}

function SLSBadge() {
  const balance = useSLSBalance();
  if (balance === null) return null;
  return <span className="flex-shrink-0 px-2.5 py-1 rounded-sm bg-[#1a0a2e] border border-[rgba(153,69,255,0.3)] text-[#9945FF] text-[11px] font-bold tracking-[1px] whitespace-nowrap">{formatSls(balance)} $SLS</span>;
}

export function Navigation() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const path = useMemo(() => (pathname === "/" ? "/home" : pathname ?? "/home"), [pathname]);

  useEffect(() => {
    setMoreOpen(false);
  }, [path]);

  if (pathname === "/login") return null;

  const mobileMoreTabs = NAV_TABS.slice(4);
  const compactVisibleTabs = NAV_TABS.slice(0, 4);
  const moreActive = mobileMoreTabs.some((tab) => isActive(tab.href, path));

  return (
    <>
      <nav className="hidden 2xl:block fixed top-0 left-0 right-0 h-14 bg-black/25 backdrop-blur-sm border-b border-white/10 z-50 overflow-x-hidden">
        <div className="h-full px-3 flex items-center justify-between gap-3 relative">
          <Link href="/home" className="flex items-center gap-2 text-[#eee] font-black tracking-[3px] text-sm flex-shrink-0">
            <Image src="/assets/images/app_icon.png" alt="Solus City" width={32} height={32} className="rounded-md" />
            SOLUS CITY
          </Link>
          <div className="flex items-center gap-0 relative h-full">
            {NAV_TABS.map((tab) => {
              const active = isActive(tab.href, path);
              return (
                <Link key={tab.href} href={tab.href} className={`flex items-center gap-2 px-2.5 h-full text-[11px] font-bold tracking-[2px] uppercase transition-colors whitespace-nowrap ${active ? "bg-[#1a0a2e] text-[#9945FF]" : "text-[#555] hover:text-[#888]"}`}>
                  <Icon name={tab.icon} />
                  <span className="whitespace-nowrap">{tab.label}</span>
                </Link>
              );
            })}
          </div>
          <div className="flex-shrink-0 flex items-center gap-2 justify-end"><SLSBadge /><WalletMultiButton className="justify-center" /></div>
        </div>
      </nav>
      <nav className="hidden lg:block 2xl:hidden fixed top-0 left-0 right-0 h-14 bg-black/25 backdrop-blur-sm border-b border-white/10 z-50">
        <div className="h-full px-3 flex items-center justify-between gap-3">
          <Link href="/home" className="flex items-center gap-2 text-[#eee] font-black tracking-[3px] text-sm flex-shrink-0"><Image src="/assets/images/app_icon.png" alt="Solus City" width={32} height={32} className="rounded-md" />SOLUS CITY</Link>
          <div className="flex items-center gap-0 relative h-full">
            {compactVisibleTabs.map((tab) => {
              const active = isActive(tab.href, path);
              return <Link key={tab.href} href={tab.href} className={`flex items-center gap-1 px-2 h-full text-[11px] font-bold tracking-[2px] uppercase transition-colors whitespace-nowrap ${active ? "bg-[#1a0a2e] text-[#9945FF]" : "text-[#555] hover:text-[#888]"}`}><Icon name={tab.icon} /><span className="whitespace-nowrap">{tab.label}</span></Link>;
            })}
            <button onClick={() => setMoreOpen((v) => !v)} className="h-full px-2 inline-flex items-center gap-1 text-[11px] font-bold tracking-[2px] uppercase transition-colors" type="button"><MoreHorizontal size={16} className={moreOpen || moreActive ? "text-[#9945FF]" : "text-[#555]"} /><span className={`whitespace-nowrap ${moreOpen || moreActive ? "text-[#9945FF]" : "text-[#555]"}`}>MORE</span></button>
          </div>
          <div className="flex-shrink-0 flex items-center gap-2 justify-end"><SLSBadge /><WalletMultiButton className="justify-center" /></div>
        </div>
      </nav>
      <nav className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-black/25 backdrop-blur-sm border-b border-white/10 z-50 flex items-center justify-center"><Link href="/home" className="flex items-center gap-2 text-[#eee] font-black tracking-[3px] text-sm"><Image src="/assets/images/app_icon.png" alt="Solus City" width={32} height={32} className="rounded-md" />SOLUS CITY</Link></nav>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-14 bg-black/25 backdrop-blur-sm border-t border-white/10 z-50 flex justify-around items-center">
        {NAV_TABS.slice(0, 4).map((tab) => {
          const active = isActive(tab.href, path);
          return <Link key={tab.href} href={tab.href} className="flex flex-col items-center justify-center gap-1"><Icon name={tab.icon} /><span className={`text-[9px] font-bold tracking-[2px] uppercase ${active ? "text-[#9945FF]" : "text-[#555]"}`}>{tab.label}</span></Link>;
        })}
        <button onClick={() => setMoreOpen((v) => !v)} className="flex flex-col items-center justify-center gap-1" type="button"><MoreHorizontal size={20} className={moreOpen || moreActive ? "text-[#9945FF]" : "text-[#555]"} /><span className={`text-[9px] font-bold tracking-[2px] uppercase ${moreOpen || moreActive ? "text-[#9945FF]" : "text-[#555]"}`}>MORE</span></button>
      </nav>
      {moreOpen && <><div className="lg:hidden fixed left-0 right-0 bottom-14 border-t border-white/10 bg-black/25 backdrop-blur-sm z-50">{mobileMoreTabs.map((tab) => { const active = isActive(tab.href, path); return <Link key={tab.href} href={tab.href} className={`flex items-center gap-2 px-4 py-2.5 text-[11px] font-bold tracking-[2px] uppercase border-b border-[#1e1e1e] transition-colors ${active ? "bg-[#1a0a2e] text-[#9945FF]" : "text-[#555]"}`} onClick={() => setMoreOpen(false)}><Icon name={tab.icon} /><span className="whitespace-nowrap">{tab.label}</span></Link>; })}</div><div className="hidden lg:block fixed top-14 right-3 border-t border-white/10 bg-black/25 backdrop-blur-sm z-50">{mobileMoreTabs.map((tab) => { const active = isActive(tab.href, path); return <Link key={tab.href} href={tab.href} className={`flex items-center gap-2 px-4 py-2.5 text-[11px] font-bold tracking-[2px] uppercase border-b border-[#1e1e1e] transition-colors whitespace-nowrap ${active ? "bg-[#1a0a2e] text-[#9945FF]" : "text-[#555]"}`} onClick={() => setMoreOpen(false)}><Icon name={tab.icon} /><span className="whitespace-nowrap">{tab.label}</span></Link>; })}</div></>}
    </>
  );
}

