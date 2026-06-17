import type { CSSProperties } from "react";

export function Progress({
  value,
  height = 7,
  color = "var(--primary-accent)",
  track = "#E9EDEA",
  radius = 99,
  style,
}: {
  value: number;
  height?: number;
  color?: string;
  track?: string;
  radius?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        height,
        background: track,
        borderRadius: radius,
        overflow: "hidden",
        width: "100%",
        ...style,
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${Math.min(100, Math.max(0, value))}%`,
          background: color,
          borderRadius: radius,
          transition: "width .5s cubic-bezier(.4,0,.2,1)",
        }}
      />
    </div>
  );
}
