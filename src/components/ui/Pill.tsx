import type { ReactNode } from "react";
import { Icon } from "@/components/icons";

interface StatusMeta {
  color: string;
  background: string;
  dot?: boolean;
  icon?: string;
}

// Shared status vocabulary across the admin console.
export const STATUS_MAP: Record<string, StatusMeta> = {
  // catalogue lifecycle
  Draft: { color: "#5F6368", background: "#EEF0F2", dot: true },
  Ready: { color: "#E0A800", background: "#FCF3D9", dot: true },
  Approved: { color: "#7A5AF8", background: "#EFEBFE", dot: true },
  Published: { color: "var(--success)", background: "#E6F3EC", dot: true },
  Unpublished: { color: "var(--muted)", background: "#EEF0F2", dot: true },
  "In construction": {
    color: "var(--primary-strong)",
    background: "var(--primary-tint)",
    icon: "building",
  },
  // money / verification
  Escrowed: { color: "var(--m-escrowed)", background: "var(--m-escrowed-tint)", icon: "lock" },
  Disbursed: { color: "var(--m-disbursed)", background: "var(--m-disbursed-tint)", icon: "check" },
  Pending: { color: "var(--m-pending)", background: "var(--m-pending-tint)", icon: "clock" },
  Verified: { color: "var(--success)", background: "#E6F3EC", icon: "check" },
  Unverified: { color: "var(--warning)", background: "#FCF3D9", icon: "alert" },
  Review: { color: "var(--warning)", background: "#FCF3D9", icon: "clock" },
  // generic states
  Active: { color: "var(--success)", background: "#E6F3EC", dot: true },
  Suspended: { color: "var(--danger)", background: "#FDECEA", dot: true },
  Settled: { color: "var(--success)", background: "#E6F3EC", dot: true },
  Reversed: { color: "var(--danger)", background: "#FDECEA", dot: true },
  Open: { color: "var(--danger)", background: "#FDECEA", dot: true },
  Investigating: { color: "var(--warning)", background: "#FCF3D9", dot: true },
  Resolved: { color: "var(--success)", background: "#E6F3EC", dot: true },
  "Awaiting approval": { color: "var(--warning)", background: "#FCF3D9", icon: "clock" },
  Executed: { color: "var(--success)", background: "#E6F3EC", icon: "check" },
  Rejected: { color: "var(--danger)", background: "#FDECEA", icon: "close" },
};

export function Pill({
  status,
  children,
  color,
  background,
  icon,
}: {
  status?: string;
  children?: ReactNode;
  color?: string;
  background?: string;
  icon?: string;
}) {
  const meta: StatusMeta = (status && STATUS_MAP[status]) || {
    color: color || "var(--muted)",
    background: background || "#EEF0F2",
    dot: !icon,
  };
  const iconName = icon || meta.icon;
  const IconGlyph = iconName ? Icon[iconName] : null;
  return (
    <span className="pill" style={{ color: meta.color, background: meta.background }}>
      {IconGlyph ? <IconGlyph size={12} /> : meta.dot ? <span className="dot" /> : null}
      {children || status}
    </span>
  );
}
