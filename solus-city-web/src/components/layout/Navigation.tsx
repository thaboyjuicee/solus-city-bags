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
  Shield,
  ShoppingBag,
  Sparkles,
  Store,
  Swords,
  Trophy,
  UserRound,
  Users,
  Wallet,
  Map,
} from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { api } from "@/lib/api/client";
import { TOKEN_KEY } from "@/lib/config";
import { useSLSBalance } from "@/hooks/useSLSBalance";
import { MeResponse } from "@/lib/gameApi";

const ICONS = {
  home: Home,
  crimes: Crosshair,
  battle: Swords,
  gym: Dumbbell,
  shop: Store,
  market: ShoppingBag,
  profile: UserRound,
  board: Trophy,
  logs: ScrollText,
  inventory: Box,
  missions: ListTodo,
  seasons: CalendarDays,
  syndicate: Users,
  wars: Shield,
  territories: Map,
  titles: Crown,
  prestige: Sparkles,
} as const;

type IconKey = keyof typeof ICONS;

type NavItem = {
  href: string;
  label: string;
  icon: IconKey;
};

const MAIN_NAV: NavItem[] = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/crimes", label: "Crimes", icon: "crimes" },
  { href: "/targets", label: "Battle", icon: "battle" },
  { href: "/gym", label: "Gym", icon: "gym" },
  { href: "/shop", label: "Shop", icon: "shop" },
  { href: "/black-market", label: "Market", icon: "market" },
  { href: "/profile", label: "Profile", icon: "profile" },
  { href: "/leaderboard", label: "Board", icon: "board" },
  { href: "/attack-logs", label: "Logs", icon: "logs" },
];

const SECONDARY_NAV: NavItem[] = [
  { href: "/inventory", label: "Inventory", icon: "inventory" },
  { href: "/missions", label: "Missions", icon: "missions" },
  { href: "/seasons", label: "Seasons", icon: "seasons" },
  { href: "/syndicates", label: "Syndicate", icon: "syndicate" },
  { href: "/wars", label: "Wars", icon: "wars" },
  { href: "/territories", label: "Territories", icon: "territories" },
  { href: "/championships", label: "Titles", icon: "titles" },
  { href: "/prestige", label: "Prestige", icon: "prestige" },
];

function Icon({ name, size = 15 }: { name: IconKey; size?: number }) {
  const Component = ICONS[name];
  return <Component size={size} />;
}

function isActive(href: string, path: string) {
  return path === href || path.startsWith(`${href}/`);
}

function formatCompact(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 100) / 10}K`;
  return `${Math.floor(value)}`;
}

function formatSls(value: number | null) {
  if (value === null) return "-";
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

function formatTier(tier?: string | null) {
  return tier ? tier.replaceAll("_", " ") : "low";
}

function WalletDropdown() {
  const { publicKey, disconnect } = useWallet();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const address = publicKey?.toBase58() ?? "";
  const shortAddress = address ? `${address.slice(0, 4)}...${address.slice(-4)}` : "Wallet";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-black/30 px-2.5 py-1 text-[10px] font-black tracking-[0.16em] text-[#8f92a6] uppercase"
      >
        <Wallet size={12} />
        <span>{shortAddress}</span>
        <ChevronDown size={10} className={open ? "rotate-180" : ""} />
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-[80] mt-2 min-w-[170px] rounded-xl border border-white/10 bg-[#111218] p-2 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
          <button
            type="button"
            onClick={() => {
              if (address) navigator.clipboard.writeText(address);
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-black tracking-[0.16em] text-[#c7c8d4] uppercase hover:bg-white/5"
          >
            <Copy size={12} />
            Copy Address
          </button>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem(TOKEN_KEY);
              disconnect();
              router.push("/login");
            }}
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-black tracking-[0.16em] text-[#ff8d8d] uppercase hover:bg-white/5"
          >
            <LogOut size={12} />
            Log Out
          </button>
        </div>
      ) : null}
    </div>
  );
}

function DesktopStatBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-2 min-w-[114px]">
      <span className="text-[9px] font-black tracking-[0.18em] text-[#6c7084] uppercase">{label}</span>
      <div className="h-[3px] w-16 overflow-hidden rounded-full bg-white/5">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[9px] font-bold text-[#8f92a6]">{value}</span>
    </div>
  );
}

function SidebarStatus({ me }: { me: MeResponse | null }) {
  const bars = [
    { label: "HP", value: me?.health ?? 0, max: me?.maxHealth ?? 100, color: "#ff5d5d" },
    { label: "EN", value: me?.energy ?? 0, max: me?.maxEnergy ?? 100, color: "#36d47f" },
    { label: "NV", value: me?.nerve ?? 0, max: me?.maxNerve ?? 100, color: "#4f8cff" },
  ];

  return (
    <div className="border-t border-white/8 px-4 py-3">
      <p className="text-[9px] font-black tracking-[0.2em] text-[#4d5061] uppercase">Status</p>
      <div className="mt-3 space-y-2">
        {bars.map((bar) => {
          const pct = bar.max > 0 ? Math.min(100, Math.round((bar.value / bar.max) * 100)) : 0;
          return (
            <div key={bar.label} className="flex items-center gap-2">
              <span className="w-4 text-[9px] font-black text-[#b8bbca]">{bar.label}</span>
              <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/5">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: bar.color }} />
              </div>
              <span className="w-6 text-right text-[9px] text-[#5d6075]">{bar.value}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between text-[9px] font-black">
        <span className="text-[#f7bf35]">LV {me?.level ?? "-"}</span>
        <span className="text-[#36d47f]">${formatCompact(me?.cash)}</span>
        <span className="text-[#ff8e3c]">{me?.heat ?? 0}</span>
      </div>
    </div>
  );
}

export function Navigation() {
  const pathname = usePathname();
  const slsBalance = useSLSBalance();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const path = useMemo(() => (pathname === "/" ? "/home" : pathname ?? "/home"), [pathname]);

  useEffect(() => {
    if (pathname === "/login") return;

    let cancelled = false;

    const load = async () => {
      try {
        const response = await api.get<MeResponse>("/me");
        if (!cancelled) setMe(response.data);
      } catch {
        if (!cancelled) setMe(null);
      }
    };

    load();
    const interval = window.setInterval(load, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const onClick = (event: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [moreOpen]);

  if (pathname === "/login") {
    return null;
  }

  const mobileTabs = [
    { href: "/home", label: "Home", icon: "home" as IconKey },
    { href: "/crimes", label: "Crimes", icon: "crimes" as IconKey },
    { href: "/targets", label: "Battle", icon: "battle" as IconKey },
    { href: "/profile", label: "Profile", icon: "profile" as IconKey },
  ];

  return (
    <>
      <aside className="fixed inset-y-3 left-3 z-50 hidden w-[172px] overflow-hidden rounded-[20px] border border-white/8 bg-[#0b0c11]/95 shadow-[0_20px_45px_rgba(0,0,0,0.45)] backdrop-blur-xl lg:flex lg:flex-col">
        <div className="border-b border-white/8 px-4 py-4">
          <div className="flex items-center gap-3">
            <Image src="/assets/images/app_icon.png" alt="Solus City" width={28} height={28} className="rounded-lg" />
            <div>
              <p className="text-[15px] font-black tracking-[0.05em] text-[#f4f5fb]">SOLUS CITY</p>
              <p className="text-[9px] font-black tracking-[0.18em] text-[#5f6172] uppercase">V2 · Season 4</p>
            </div>
          </div>
        </div>

        <div className="border-b border-white/8 px-4 py-3">
          <p className="text-[14px] font-black text-[#f3f4fa]">{me?.name ?? "GhostOperator"}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="sc-chip sc-chip-purple">LV {me?.level ?? "--"}</span>
            <span className="sc-chip sc-chip-orange">{formatTier(me?.wantedTier)}</span>
            {me?.syndicate?.name ? <span className="sc-chip">{me.syndicate.name}</span> : null}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          <div className="space-y-1">
            {MAIN_NAV.map((item) => {
              const active = isActive(item.href, path);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[11px] font-black tracking-[0.18em] uppercase transition-colors ${
                    active
                      ? "bg-[rgba(153,69,255,0.14)] text-[#9f64ff]"
                      : "text-[#64687b] hover:bg-white/4 hover:text-[#c2c5d4]"
                  }`}
                >
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="mt-5">
            <p className="px-3 text-[9px] font-black tracking-[0.24em] text-[#434759] uppercase">More</p>
            <div className="mt-2 space-y-1">
              {SECONDARY_NAV.map((item) => {
                const active = isActive(item.href, path);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[11px] font-black tracking-[0.18em] uppercase transition-colors ${
                      active
                        ? "bg-[rgba(153,69,255,0.14)] text-[#9f64ff]"
                        : "text-[#64687b] hover:bg-white/4 hover:text-[#c2c5d4]"
                    }`}
                  >
                    <Icon name={item.icon} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-4 pb-2">
          <WalletDropdown />
        </div>
        <SidebarStatus me={me} />
      </aside>

      <header className="fixed left-3 right-3 top-3 z-40 hidden h-[50px] rounded-[18px] border border-white/8 bg-[#0b0c11]/88 px-5 shadow-[0_16px_45px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:left-[190px] lg:flex lg:items-center lg:justify-between">
        <div className="flex items-center gap-6">
          <div>
            <p className="text-[12px] font-black text-[#f4f5fb]">{me?.name ?? "GhostOperator"}</p>
            <p className="text-[9px] font-black tracking-[0.18em] text-[#7f8195] uppercase">LV {me?.level ?? "--"}</p>
          </div>
          <div className="flex items-center gap-4">
            <DesktopStatBar label="HP" value={me?.health ?? 0} max={me?.maxHealth ?? 100} color="#ff5d5d" />
            <DesktopStatBar label="EN" value={me?.energy ?? 0} max={me?.maxEnergy ?? 100} color="#36d47f" />
            <DesktopStatBar label="NV" value={me?.nerve ?? 0} max={me?.maxNerve ?? 100} color="#4f8cff" />
            <DesktopStatBar label="HP" value={me?.happiness ?? 0} max={me?.maxHappiness ?? 100} color="#f7bf35" />
          </div>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-black tracking-[0.12em] uppercase">
          <span className="text-[#ff9d32]">{me?.heat ?? 0} {formatTier(me?.wantedTier)}</span>
          <span className="text-[#36d47f]">${formatCompact(me?.cash)}</span>
          <span className="text-[#f7bf35]">{formatSls(slsBalance)} SLS</span>
        </div>
      </header>

      <div className="fixed inset-x-0 top-0 z-40 border-b border-white/8 bg-[#0b0c11]/92 px-3 py-3 shadow-[0_10px_35px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link href="/home" className="flex items-center gap-2">
            <Image src="/assets/images/app_icon.png" alt="Solus City" width={28} height={28} className="rounded-lg" />
            <span className="text-[14px] font-black tracking-[0.05em] text-[#f4f5fb]">SOLUS CITY</span>
          </Link>
          <div className="flex items-center gap-3 text-[10px] font-black uppercase">
            <span className="text-[#36d47f]">${formatCompact(me?.cash)}</span>
            <span className="text-[#ff8e3c]">{me?.heat ?? 0}</span>
            <span className="sc-chip sc-chip-purple">LV {me?.level ?? "--"}</span>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          <DesktopStatBar label="HP" value={me?.health ?? 0} max={me?.maxHealth ?? 100} color="#ff5d5d" />
          <DesktopStatBar label="EN" value={me?.energy ?? 0} max={me?.maxEnergy ?? 100} color="#36d47f" />
          <DesktopStatBar label="NV" value={me?.nerve ?? 0} max={me?.maxNerve ?? 100} color="#4f8cff" />
          <DesktopStatBar label="HP" value={me?.happiness ?? 0} max={me?.maxHappiness ?? 100} color="#f7bf35" />
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/8 bg-[#0b0c11]/95 px-2 py-2 shadow-[0_-12px_35px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between gap-1">
          {mobileTabs.map((tab) => {
            const active = isActive(tab.href, path);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[9px] font-black tracking-[0.18em] uppercase ${
                  active ? "bg-[rgba(153,69,255,0.14)] text-[#9f64ff]" : "text-[#5f6377]"
                }`}
              >
                <Icon name={tab.icon} />
                <span>{tab.label}</span>
              </Link>
            );
          })}

          <div ref={moreRef} className="relative flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen((value) => !value)}
              className={`flex w-full flex-col items-center gap-1 rounded-xl px-2 py-2 text-[9px] font-black tracking-[0.18em] uppercase ${
                moreOpen ? "bg-[rgba(153,69,255,0.14)] text-[#9f64ff]" : "text-[#5f6377]"
              }`}
            >
              <MoreHorizontal size={15} />
              <span>More</span>
            </button>

            {moreOpen ? (
              <div className="absolute bottom-[calc(100%+12px)] right-0 w-[220px] rounded-[18px] border border-white/10 bg-[#111218]/97 p-2 shadow-[0_20px_45px_rgba(0,0,0,0.55)]">
                <div className="grid grid-cols-2 gap-1">
                  {[MAIN_NAV[3], MAIN_NAV[4], MAIN_NAV[5], MAIN_NAV[7], MAIN_NAV[8], ...SECONDARY_NAV].map((item) => {
                    const active = isActive(item.href, path);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMoreOpen(false)}
                        className={`flex items-center gap-2 rounded-xl px-3 py-3 text-[10px] font-black tracking-[0.12em] uppercase ${
                          active ? "bg-[rgba(153,69,255,0.14)] text-[#9f64ff]" : "text-[#72768b]"
                        }`}
                      >
                        <Icon name={item.icon} size={14} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
                <div className="mt-2 border-t border-white/8 pt-2">
                  <WalletDropdown />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </nav>
    </>
  );
}
