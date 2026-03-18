interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return <div className={`bg-[#141414] border border-[#1e1e1e] rounded-md p-4 ${className ?? ""}`}>{children}</div>;
}
