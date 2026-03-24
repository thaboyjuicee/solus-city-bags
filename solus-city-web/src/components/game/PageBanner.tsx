"use client";

import Image from "next/image";
import { ReactNode } from "react";

type Props = {
  imageSrc: string;
  imageAlt: string;
  title: string;
  subtitle: string;
  icon?: ReactNode;
  actions?: ReactNode;
  titleClassName?: string;
  subtitleClassName?: string;
  overlayClassName?: string;
  imageClassName?: string;
};

export function PageBanner({
  imageSrc,
  imageAlt,
  title,
  subtitle,
  icon,
  actions,
  titleClassName = "text-[#eee]",
  subtitleClassName = "text-[#a7a7a7]",
  overlayClassName = "bg-[linear-gradient(180deg,rgba(0,0,0,0.18),rgba(0,0,0,0.42)),linear-gradient(90deg,rgba(0,0,0,0.72),rgba(0,0,0,0.28),rgba(0,0,0,0.6))]",
  imageClassName = "object-cover opacity-65",
}: Props) {
  return (
    <div className="relative min-h-[180px] overflow-hidden rounded-lg border border-white/10 bg-black/20 backdrop-blur-sm md:min-h-[220px]">
      <Image
        src={imageSrc}
        alt={imageAlt}
        fill
        className={imageClassName}
      />
      <div className={`absolute inset-0 ${overlayClassName}`} />
      <div className="relative z-10 flex min-h-[180px] items-end px-4 pb-4 md:min-h-[220px] md:px-5 md:pb-5">
        <div className="flex w-full flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex items-end gap-3">
            {icon ? <div className="mb-1 shrink-0">{icon}</div> : null}
            <div className="max-w-xl">
              <p className={`text-[20px] font-black uppercase tracking-[3px] md:text-[24px] ${titleClassName}`}>
                {title}
              </p>
              <p className={`mt-2 text-[12px] font-semibold leading-relaxed ${subtitleClassName}`}>
                {subtitle}
              </p>
            </div>
          </div>
          {actions ? <div className="md:pb-1">{actions}</div> : null}
        </div>
      </div>
    </div>
  );
}
