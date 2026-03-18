import { ButtonHTMLAttributes, ReactNode } from "react";

export function PrimaryActionButton({
  children,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      {...rest}
      className={`bg-[#1a0a0a] border border-red-900 text-[#ef5350] text-[11px] font-bold tracking-[2px] uppercase rounded-md py-2 px-4 hover:bg-[#2a0a0a] transition-colors ${className}`}
    >
      {children}
    </button>
  );
}
