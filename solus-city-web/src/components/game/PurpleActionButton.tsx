import { ButtonHTMLAttributes, ReactNode } from "react";

export function PurpleActionButton({
  children,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      {...rest}
      className={`bg-[#1a0a2e] border border-[rgba(153,69,255,0.3)] text-[#9945FF] text-[11px] font-bold tracking-[2px] uppercase rounded-md py-2 px-4 transition-colors ${className}`}
    >
      {children}
    </button>
  );
}
