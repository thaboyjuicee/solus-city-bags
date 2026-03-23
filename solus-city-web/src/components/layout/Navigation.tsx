"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Box,
  CalendarDays,
  ChevronDown,
  Copy,
  Crosshair,
  Crown,
  Dumbbell,
  Home,
  ListTodo,
  LogOut,
  MoreHorizontal,
  ScrollText,
  ShoppingBag,
  Sparkles,
  Store,
  Trophy,
  UserRound,
  Users,
  Wallet,
  Shield,
  Map,
  Swords,
} from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { TOKEN_KEY } from "@/lib/config";
import { useSLSBalance } from "@/hooks/useSLSBalance";

// ─── Tab definitions ────────────────────────────────────────────────────────

const ICONS = {
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
  missions: ListTodo,
  inventory: Box,
  seasons: CalendarDays,
  prestige: Sparkles,
  championships: Crown,
} as const;

type IconKey = keyof typeof ICONS;

type NavTab = {
  href: string;
  label: string;
  icon: IconKey;
};

const PRIMARY_TABS: NavTab[] = [
  { href: "/home",         label: "Home",         icon: "home" },
  { href: "/crimes",       label: "Crimes",       icon: "crosshair" },
  { href: "/targets",      label: "Battle",       icon: "swords" },
  { href: "/gym",          label: "Gym",          icon: "dumbbell" },
  { href: "/shop",         label: "Shop",         icon: "store" },
  { href: "/black-market", label: "Black Market", icon: "blackMarket" },
  { href: "/profile",      label: "Profile",      icon: "profile" },
  { href: "/leaderboard",  label: "Leaderboard",  icon: "leaderboard" },
  { href: "/attack-logs",  label: "Attack Logs",  icon: "attackLogs" },
];

const MORE_TABS: NavTab[] = [
  { href: "/inventory",     label: "Inventory",     icon: "inventory" },
  { href: "/seasons",       label: "Seasons",       icon: "seasons" },
  { href: "/championships", label: "Championships", icon: "championships" },
  { href: "/missions",      label: "Missions",      icon: "missions" },
  { href: "/syndicates",    label: "Syndicates",    icon: "syndicates" },
  { href: "/wars",          label: "Wars",          icon: "wars" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function Icon({ name }: { name: IconKey }) {
  const C = ICONS[name];
  return <C size={18} />;
}

function isActive(href: string, path: string) {
  return path === href || path.startsWith(`${href}/`);
}

function formatSls(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toFixed(2);
}

// ─── SLS balance badge ───────────────────────────────────────────────────────

function SLSBadge() {
  const balance = useSLSBalance();
  if (balance === null) return null;
  return (
    <span className="flex-shrink-0 px-2.5 py-1 rounded-sm bg-[#1a0a2e] border border-[rgba(153,69,255,0.3)] text-[#9945FF] text-[11px] font-bold tracking-[1px] whitespace-nowrap">
      {formatSls(balance)} $SLS
    </span>
  );
}

// ─── Wallet dropdown ─────────────────────────────────────────────────────────

function WalletDropdown() {
  const { publicKey, disconnect } = useWallet();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const address = publicKey?.toString() ?? "";
  const short = address ? `${address.slice(0, 4)}...${address.slice(-4)}` : "Wallet";

  function copyAddress() {
    if (address) navigator.clipboard.writeText(address);
    setOpen(false);
  }

  function doLogout() {
    localStorage.removeItem(TOKEN_KEY);
    disconnect();
    router.push("/login");
  }

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        type="button"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-[11px] font-bold tracking-[1px] whitespace-nowrap transition-colors ${
          open
            ? "bg-[#1a0a2e] border-[rgba(153,69,255,0.5)] text-[#9945FF]"
            : "bg-transparent border-[rgba(153,69,255,0.2)] text-[#aab0a3] hover:border-[rgba(153,69,255,0.4)] hover:text-[#9945FF]"
        }`}
      >
        <Wallet size={13} />
        <span>{short}</span>
        <ChevronDown size={11} className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-[#0d0d0d] border border-[rgba(153,69,255,0.2)] z-[60] overflow-hidden">
          <button
            onClick={copyAddress}
            type="button"
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[10px] font-bold tracking-[1px] uppercase text-[#aab0a3] hover:text-[#dde1d6] hover:bg-white/5 transition-colors text-left"
          >
            <Copy size={13} />
            Copy Address
          </button>
          <div className="border-t border-[#1a1a1a]" />
          <button
            onClick={doLogout}
            type="button"
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[10px] font-bold tracking-[1px] uppercase text-[#aab0a3] hover:text-[#dde1d6] hover:bg-white/5 transition-colors text-left"
          >
            <Wallet size={13} />
            Change Wallet
          </button>
          <div className="border-t border-[#1a1a1a]" />
          <button
            onClick={doLogout}
            type="button"
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[10px] font-bold tracking-[1px] uppercase text-red-500/60 hover:text-red-400 hover:bg-white/5 transition-colors text-left"
          >
            <LogOut size={13} />
            Log Out
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Navigation ─────────────────────────────────────────────────────────

export function Navigation() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const path = useMemo(() => (pathname === "/" ? "/home" : pathname ?? "/home"), [pathname]);

  // Close More on route change
  useEffect(() => {
    setMoreOpen(false);
  }, [path]);

  // Close More on outside click (desktop)
  useEffect(() => {
    if (!moreOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [moreOpen]);

  if (pathname === "/login") return null;

  // Desktop: More is active when on any More tab
  const moreActive = MORE_TABS.some((tab) => isActive(tab.href, path));
  // Mobile: More is active when on any tab not in the bottom bar (primary tabs 4+ or any More tab)
  const moreActiveMobile = [...PRIMARY_TABS.slice(4), ...MORE_TABS].some((tab) => isActive(tab.href, path));
  // Mobile More panel combines overflow primary tabs and secondary tabs
  const mobileMoreTabs = [...PRIMARY_TABS.slice(4), ...MORE_TABS];

  return (
    <>
      {/* ── Desktop nav (lg+) ── */}
      <nav className="hidden lg:block fixed top-0 left-0 right-0 h-14 bg-black/25 backdrop-blur-sm border-b border-white/10 z-50">
        <div className="h-full px-3 flex items-center justify-between gap-2">

          {/* Logo */}
          <Link
            href="/home"
            className="flex items-center gap-2 text-[#f2f4ec] font-black tracking-[3px] text-sm flex-shrink-0"
          >
            <Image src="/assets/images/app_icon.png" alt="Solus City" width={32} height={32} className="rounded-md" />
            <span className="hidden xl:inline">SOLUS CITY</span>
          </Link>

          {/* Primary tabs + More */}
          <div className="flex items-center h-full min-w-0">
            {PRIMARY_TABS.map((tab) => {
              const active = isActive(tab.href, path);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex items-center gap-1.5 px-2.5 h-full text-[11px] font-bold tracking-[2px] uppercase transition-colors whitespace-nowrap ${
                    active ? "bg-[#1a0a2e] text-[#9945FF]" : "text-[#aab0a3] hover:text-[#d0d5ca]"
                  }`}
                >
                  <Icon name={tab.icon} />
                  <span className="hidden xl:inline">{tab.label}</span>
                </Link>
              );
            })}

            {/* More dropdown */}
            <div ref={moreRef} className="relative h-full flex items-center">
              <button
                onClick={() => setMoreOpen((v) => !v)}
                type="button"
                className={`h-full px-2.5 inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[2px] uppercase transition-colors ${
                  moreOpen || moreActive ? "text-[#9945FF]" : "text-[#aab0a3] hover:text-[#d0d5ca]"
                }`}
              >
                <MoreHorizontal size={16} />
                <span>MORE</span>
                <ChevronDown
                  size={11}
                  className={`transition-transform duration-150 ${moreOpen ? "rotate-180" : ""}`}
                />
              </button>

              {moreOpen && (
                <div className="absolute top-full left-0 bg-[#0d0d0d] border border-[rgba(153,69,255,0.15)] border-t-[rgba(153,69,255,0.3)] z-[60] min-w-[200px]">
                  {MORE_TABS.map((tab) => {
                    const active = isActive(tab.href, path);
                    return (
                      <Link
                        key={tab.href}
                        href={tab.href}
                        onClick={() => setMoreOpen(false)}
                        className={`flex items-center gap-2.5 px-4 py-2.5 text-[11px] font-bold tracking-[2px] uppercase border-b border-[#161616] transition-colors whitespace-nowrap last:border-b-0 ${
                          active ? "bg-[#1a0a2e] text-[#9945FF]" : "text-[#aab0a3] hover:text-[#d0d5ca] hover:bg-white/[0.02]"
                        }`}
                      >
                        <Icon name={tab.icon} />
                        {tab.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: SLS badge + wallet */}
          <div className="flex-shrink-0 flex items-center gap-2">
            <SLSBadge />
            <WalletDropdown />
          </div>
        </div>
      </nav>

      {/* ── Mobile: top bar ── */}
      <nav className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-black/25 backdrop-blur-sm border-b border-white/10 z-50 grid grid-cols-[1fr_auto_1fr] items-center px-3">
        <div className="justify-self-start">
          <WalletDropdown />
        </div>
        <Link href="/home" className="justify-self-center text-[#f2f4ec] font-black tracking-[3px] text-sm">
          SOLUS CITY
        </Link>
        <div className="justify-self-end">
          <SLSBadge />
        </div>
      </nav>

      {/* ── Mobile: bottom tab bar (first 4 primary tabs + More) ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-14 bg-black/25 backdrop-blur-sm border-t border-white/10 z-50 flex justify-around items-center">
        {PRIMARY_TABS.slice(0, 4).map((tab) => {
          const active = isActive(tab.href, path);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full"
            >
              <span className={active ? "text-[#9945FF]" : "text-[#aab0a3]"}>
                <Icon name={tab.icon} />
              </span>
              <span className={`text-[9px] font-bold tracking-[2px] uppercase ${active ? "text-[#9945FF]" : "text-[#aab0a3]"}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen((v) => !v)}
          type="button"
          className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full"
        >
          <MoreHorizontal size={18} className={moreOpen || moreActiveMobile ? "text-[#9945FF]" : "text-[#aab0a3]"} />
          <span className={`text-[9px] font-bold tracking-[2px] uppercase ${moreOpen || moreActiveMobile ? "text-[#9945FF]" : "text-[#aab0a3]"}`}>
            MORE
          </span>
        </button>
      </nav>

      {/* ── Mobile: More panel — overflow primary tabs + secondary tabs ── */}
      {moreOpen && (
        <div className="lg:hidden fixed left-0 right-0 bottom-14 bg-[#0d0d0d] border-t border-[rgba(153,69,255,0.2)] z-50 grid grid-cols-2">
          {mobileMoreTabs.map((tab) => {
            const active = isActive(tab.href, path);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={() => setMoreOpen(false)}
                className={`flex items-center gap-2 px-4 py-3 text-[11px] font-bold tracking-[2px] uppercase border-b border-r border-[#161616] transition-colors ${
                  active ? "bg-[#1a0a2e] text-[#9945FF]" : "text-[#aab0a3] hover:text-[#d0d5ca]"
                }`}
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

