interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={`bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-4 ${className ?? ""}`}>
      {children}
    </div>
  );
}
