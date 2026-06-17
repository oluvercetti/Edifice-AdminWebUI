"use client";
import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useState,
} from "react";
import { Icon } from "@/components/icons";
import { ROLES } from "@/lib/roles";
import type { AdminRole } from "@/stores/admin-store";

// ============================================================
// Dense admin UI primitives (ported from the Claude Design admin handoff).
// Pixel-specific, so they use inline styles bound to the design tokens.
// ============================================================

// ---------- Role badge ----------
export function RoleBadge({ role, size = "md" }: { role: AdminRole; size?: "sm" | "md" }) {
  const r = ROLES[role] ?? ROLES.SUPER;
  const s = size === "sm" ? { h: 20, fs: 11, px: 8 } : { h: 24, fs: 12, px: 10 };
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 5, height: s.h,
        padding: `0 ${s.px}px`, borderRadius: 6, background: r.color + "14",
        color: r.color, fontSize: s.fs, fontWeight: 700, letterSpacing: ".01em",
      }}
    >
      <Icon.shield size={s.fs} />
      {r.label}
    </span>
  );
}

// ---------- Severity dot ----------
export const SEV: Record<string, { c: string; l: string }> = {
  high: { c: "#D92D20", l: "High" },
  med: { c: "#E0A800", l: "Medium" },
  low: { c: "#5F6368", l: "Low" },
};
export function Severity({ level, label }: { level: string; label?: boolean }) {
  const s = SEV[level] || SEV.low;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>
      <span style={{ width: 8, height: 8, borderRadius: 99, background: s.c, flex: "none" }} />
      {label !== false && s.l}
    </span>
  );
}

// ---------- Type badge (txn / catalogue) ----------
export function TypeBadge({
  map,
  value,
  icon,
}: {
  map?: Record<string, { color: string; bg: string }>;
  value: string;
  icon?: string;
}) {
  const m = (map || {})[value] || { color: "#5F6368", bg: "#EEF0F2" };
  const IcC = icon ? Icon[icon] : null;
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 5, height: 22, padding: "0 9px",
        borderRadius: 6, background: m.bg, color: m.color, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
      }}
    >
      {IcC && <IcC size={12} />}
      {value}
    </span>
  );
}

// ---------- Dense input ----------
export function AInput({
  value, onChange, placeholder, leftIcon, type = "text", style, width, rightSlot,
  onKeyDown, maxLength, inputMode,
}: {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  leftIcon?: ReactNode;
  type?: string;
  style?: CSSProperties;
  width?: number | string;
  rightSlot?: ReactNode;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  maxLength?: number;
  inputMode?: "text" | "numeric" | "decimal";
}) {
  const [f, setF] = useState(false);
  return (
    <div
      style={{
        position: "relative", display: "inline-flex", alignItems: "center", height: 36, width: width || "auto",
        border: `1px solid ${f ? "var(--primary-accent)" : "var(--line)"}`, borderRadius: 8, background: "#fff",
        boxShadow: f ? "0 0 0 3px rgba(25,135,84,.1)" : "none", transition: "all .12s", ...style,
      }}
    >
      {leftIcon && <span style={{ paddingLeft: 10, color: "var(--muted)", display: "flex" }}>{leftIcon}</span>}
      <input
        value={value} onChange={onChange} placeholder={placeholder} type={type} onKeyDown={onKeyDown}
        maxLength={maxLength} inputMode={inputMode} onFocus={() => setF(true)} onBlur={() => setF(false)}
        style={{
          flex: 1, border: "none", outline: "none", background: "transparent",
          padding: leftIcon ? "0 10px 0 8px" : "0 12px", fontSize: 13.5, color: "var(--ink)",
          fontFamily: "var(--font)", height: "100%", minWidth: 0, width: "100%",
        }}
      />
      {rightSlot}
    </div>
  );
}

export function ALabel({ children, optional, hint }: { children: ReactNode; optional?: boolean; hint?: string }) {
  return (
    <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>
      <span style={{ display: "flex", justifyContent: "space-between" }}>
        {children}
        {optional && <span style={{ color: "var(--muted)", fontWeight: 500 }}>Optional</span>}
      </span>
      {hint && <span style={{ display: "block", color: "var(--muted)", fontWeight: 500, fontSize: 11.5, marginTop: 2 }}>{hint}</span>}
    </div>
  );
}

// ---------- Card ----------
export function Card({
  children, style, pad = 18, title, action, sub,
}: {
  children: ReactNode;
  style?: CSSProperties;
  pad?: number;
  title?: ReactNode;
  action?: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 12, boxShadow: "var(--sh-1)", ...style }}>
      {title && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--line)" }}>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 700 }}>{title}</div>
            {sub && <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>{sub}</div>}
          </div>
          {action}
        </div>
      )}
      <div style={{ padding: pad }}>{children}</div>
    </div>
  );
}

// ---------- Stat ----------
export function Stat({
  label, value, sub, icon, tone = "var(--brand)", trend, money,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: string;
  tone?: string;
  trend?: boolean;
  money?: string;
}) {
  const IcC = icon ? Icon[icon] : null;
  return (
    <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: "16px 18px", boxShadow: "var(--sh-1)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 600 }}>{label}</span>
        {IcC && (
          <span style={{ width: 30, height: 30, borderRadius: 8, background: tone + "14", color: tone, display: "grid", placeItems: "center" }}>
            <IcC size={16} />
          </span>
        )}
      </div>
      <div className="ngn" style={{ fontSize: 25, fontWeight: 800, letterSpacing: "-.02em", marginTop: 8, color: money || "var(--ink)" }}>{value}</div>
      {sub && (
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, display: "flex", alignItems: "center", gap: 5 }}>
          {trend && <Icon.trend size={13} style={{ color: "var(--success)" }} />}
          {sub}
        </div>
      )}
    </div>
  );
}

// ---------- Generic table ----------
export interface Column<T> {
  key: string;
  label: string;
  w?: number;
  align?: "left" | "right" | "center";
  wrap?: boolean;
  render?: (row: T, i: number) => ReactNode;
}
export function Table<T>({
  columns, rows, onRowClick, activeId, getId, empty, dense, rowStyle,
}: {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  activeId?: string | null;
  getId?: (row: T) => string;
  empty?: ReactNode;
  dense?: boolean;
  rowStyle?: (row: T) => CSSProperties;
}) {
  if (!rows.length && empty) return <div style={{ padding: "10px 0" }}>{empty}</div>;
  return (
    <div style={{ overflowX: "auto" }} className="thin-scroll">
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: columns.reduce((s, c) => s + (c.w || 120), 0) }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--line)" }}>
            {columns.map((c) => (
              <th key={c.key} style={{
                textAlign: c.align || "left", padding: dense ? "9px 12px" : "11px 14px", fontSize: 11.5, fontWeight: 700,
                color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".04em", whiteSpace: "nowrap",
                width: c.w, position: "sticky", top: 0, background: "#fff",
              }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const id = getId ? getId(row) : (row as { id?: string }).id;
            const active = activeId != null && id === activeId;
            return (
              <tr key={id || i} onClick={onRowClick ? () => onRowClick(row) : undefined}
                style={{
                  borderBottom: "1px solid #EEF1EF", cursor: onRowClick ? "pointer" : "default",
                  background: active ? "var(--primary-tint)" : "transparent", transition: "background .1s",
                  ...(rowStyle ? rowStyle(row) : {}),
                }}
                onMouseEnter={(e) => { if (onRowClick && !active) e.currentTarget.style.background = "#F7F9F8"; }}
                onMouseLeave={(e) => { if (onRowClick && !active) e.currentTarget.style.background = "transparent"; }}>
                {columns.map((c) => (
                  <td key={c.key} style={{
                    textAlign: c.align || "left", padding: dense ? "9px 12px" : "11px 14px",
                    whiteSpace: c.wrap ? "normal" : "nowrap", color: "var(--ink)", verticalAlign: "middle",
                  }}>
                    {c.render ? c.render(row, i) : String((row as Record<string, unknown>)[c.key] ?? "")}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Right drawer ----------
export function Drawer({
  open, onClose, title, sub, children, footer, width = 480,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  sub?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 80, pointerEvents: open ? "auto" : "none" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(16,24,40,.4)", opacity: open ? 1 : 0, transition: "opacity .25s" }} />
      <div style={{
        position: "absolute", top: 0, right: 0, bottom: 0, width, maxWidth: "92vw", background: "#fff",
        boxShadow: "-12px 0 40px rgba(16,24,40,.18)", transform: open ? "translateX(0)" : "translateX(102%)",
        transition: "transform .3s cubic-bezier(.32,.72,0,1)", display: "flex", flexDirection: "column",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{title}</div>
            {sub && <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>{sub}</div>}
          </div>
          <button onClick={onClose} style={{ border: "none", background: "var(--canvas)", width: 32, height: 32, borderRadius: 8, display: "grid", placeItems: "center", cursor: "pointer", color: "var(--muted)" }}>
            <Icon.close size={18} />
          </button>
        </div>
        <div className="thin-scroll" style={{ flex: 1, overflowY: "auto", padding: 20 }}>{children}</div>
        {footer && <div style={{ padding: "14px 20px", borderTop: "1px solid var(--line)", display: "flex", gap: 10, justifyContent: "flex-end" }}>{footer}</div>}
      </div>
    </div>
  );
}

// ---------- Modal ----------
export function Modal({ open, onClose, children, width = 440 }: { open: boolean; onClose: () => void; children: ReactNode; width?: number }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 90, display: "grid", placeItems: "center", padding: 24 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(16,24,40,.5)", animation: "ed-fade .15s" }} />
      <div style={{ position: "relative", background: "#fff", borderRadius: 14, width, maxWidth: "100%", boxShadow: "var(--sh-pop)", animation: "ed-scale-in .2s", overflow: "hidden" }}>{children}</div>
    </div>
  );
}

// ---------- Segmented control ----------
export function Segmented({
  options, value, onChange, size = "md",
}: {
  options: (string | { value: string; label: string })[];
  value: string;
  onChange: (v: string) => void;
  size?: "sm" | "md";
}) {
  const h = size === "sm" ? 30 : 34;
  return (
    <div style={{ display: "inline-flex", gap: 3, background: "#EEF1EF", borderRadius: 9, padding: 3 }}>
      {options.map((o) => {
        const v = typeof o === "string" ? o : o.value;
        const l = typeof o === "string" ? o : o.label;
        const on = value === v;
        return (
          <button key={v} onClick={() => onChange(v)} style={{
            height: h, padding: "0 13px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 700,
            background: on ? "#fff" : "transparent", color: on ? "var(--brand)" : "var(--muted)", boxShadow: on ? "var(--sh-1)" : "none", whiteSpace: "nowrap",
          }}>{l}</button>
        );
      })}
    </div>
  );
}

// ---------- Filter chip ----------
export function Chip({
  children, active, onClick, icon, count,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  icon?: string;
  count?: number | null;
}) {
  const IcC = icon ? Icon[icon] : null;
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 6, height: 32, padding: "0 12px", borderRadius: 8, cursor: "pointer",
      border: `1px solid ${active ? "var(--primary-accent)" : "var(--line)"}`, background: active ? "var(--primary-tint)" : "#fff",
      color: active ? "var(--brand)" : "var(--muted)", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap",
    }}>
      {IcC && <IcC size={14} />}
      {children}
      {count != null && (
        <span style={{ background: active ? "var(--primary-accent)" : "var(--line)", color: active ? "#fff" : "var(--muted)", borderRadius: 99, fontSize: 11, fontWeight: 700, padding: "1px 6px" }}>{count}</span>
      )}
    </button>
  );
}

// ---------- Toggle ----------
export function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button onClick={disabled ? undefined : () => onChange(!on)} disabled={disabled} style={{
      width: 40, height: 23, borderRadius: 99, border: "none", cursor: disabled ? "not-allowed" : "pointer",
      background: on ? "var(--primary-accent)" : "#CDD4D0", position: "relative", transition: "background .18s", opacity: disabled ? 0.5 : 1, flex: "none",
    }}>
      <span style={{ position: "absolute", top: 2.5, left: on ? 19.5 : 2.5, width: 18, height: 18, borderRadius: 99, background: "#fff", transition: "left .18s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
    </button>
  );
}

// ---------- Page header ----------
export function PageHead({
  title, sub, actions,
}: {
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 23, fontWeight: 700, letterSpacing: "-.02em" }}>{title}</h1>
          {sub && <p style={{ margin: "5px 0 0", fontSize: 13.5, color: "var(--muted)" }}>{sub}</p>}
        </div>
        {actions && <div style={{ display: "flex", gap: 10, flex: "none" }}>{actions}</div>}
      </div>
    </div>
  );
}
