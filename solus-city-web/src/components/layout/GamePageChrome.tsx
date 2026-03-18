"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

const PAGE_IMAGE: Record<string, string> = {
  "/": "/assets/images/skyline.png",
  "/home": "/assets/images/skyline.png",
  "/crimes": "/assets/images/crimes.png",
  "/targets": "/assets/images/arena.png",
  "/battle": "/assets/images/arena.png",
  "/gym": "/assets/images/gym.png",
  "/shop": "/assets/images/shop.png",
  "/leaderboard": "/assets/images/skyline.png",
  "/attack-logs": "/assets/images/skyline.png",
  "/profile": "/assets/images/skyline.png",
  "/syndicates": "/assets/images/skyline.png",
  "/battle-result": "/assets/images/arena.png",
};

export function GamePageChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login") return <>{children}</>;

  const image =
    PAGE_IMAGE[pathname] ??
    PAGE_IMAGE[(pathname ?? "/").split("/")[1] as keyof typeof PAGE_IMAGE] ??
    "/assets/images/skyline.png";

  return (
    <div className="min-h-screen bg-[#0a0a0a] relative">
      <Image
        src={image}
        alt=""
        fill
        className="object-cover opacity-[0.08] fixed inset-0 -z-10 pointer-events-none"
      />

      <div className="relative z-10 px-4 py-4 max-w-lg mx-auto space-y-4 pb-16 md:pb-4">
        {children}
      </div>
    </div>
  );
}
