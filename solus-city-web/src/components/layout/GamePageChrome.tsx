"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

const PAGE_IMAGE: Record<string, string> = {
  "/": "/assets/images/home_skyline.png",
  "/home": "/assets/images/home_skyline.png",
  "/crimes": "/assets/images/crimes_banner.png",
  "/targets": "/assets/images/arena_banner.png",
  "/battle": "/assets/images/arena_banner.png",
  "/gym": "/assets/images/gym_banner.png",
  "/shop": "/assets/images/shop_banner.png",
  "/leaderboard": "/assets/images/home_skyline.png",
  "/attack-logs": "/assets/images/home_skyline.png",
  "/profile": "/assets/images/home_skyline.png",
  "/syndicates": "/assets/images/home_skyline.png",
  "/battle-result": "/assets/images/arena_banner.png",
};

export function GamePageChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login") return <>{children}</>;

  const image =
    PAGE_IMAGE[pathname] ??
    PAGE_IMAGE[(pathname ?? "/").split("/")[1] as keyof typeof PAGE_IMAGE] ??
    "/assets/images/home_skyline.png";

  return (
    <div className="min-h-screen bg-[#000000] relative isolate">
      <Image
        src={image}
        alt=""
        fill
        className="object-cover opacity-[0.08] inset-0 z-0 pointer-events-none"
      />
      <Image
        src="/assets/images/texture_overlay.png"
        alt=""
        fill
        className="object-cover opacity-[0.08] inset-0 z-0 pointer-events-none mix-blend-screen"
      />

      <div className="relative z-10 px-4 py-4 w-full max-w-5xl xl:max-w-6xl mx-auto space-y-4 pb-16 md:px-8 md:py-5 md:pb-4">
        {children}
      </div>
    </div>
  );
}
