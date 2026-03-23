"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";

export function GamePageChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(153,69,255,0.16),transparent_24%),radial-gradient(circle_at_top_right,rgba(36,116,255,0.14),transparent_20%),linear-gradient(180deg,#05060a_0%,#0a0b11_100%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:64px_64px]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.2)_65%,rgba(0,0,0,0.55))]" />

      <div className="relative z-10 px-3 pb-24 pt-[68px] md:px-4 lg:pl-[196px] lg:pr-6 lg:pt-[76px]">
        <div className="mx-auto w-full max-w-[1180px]">{children}</div>
      </div>
    </div>
  );
}
