interface Props {
  size?: number;
  color?: string;
}

export function LoadingSpinner({ size = 32, color = "#9945FF" }: Props) {
  return (
    <div
      className="animate-spin rounded-full border-2 border-transparent"
      style={{
        width: size,
        height: size,
        borderTopColor: color,
        borderRightColor: color,
      }}
      role="status"
      aria-label="Loading"
    />
  );
}
