"use client";
import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Icon } from "@/components/icons";
import { cx } from "@/lib/cx";
import { ROLES } from "@/lib/roles";
import type { AdminRole } from "@/stores/admin-store";

// ============================================================
// Dense admin UI primitives (ported from the Claude Design admin handoff).
// Tailwind utilities for static styling; inline `style` is used only for
// genuinely data-driven values (role/severity colours, column widths).
// ============================================================

// ---------- Role badge ----------
export function RoleBadge({
  role,
  size = "md",
}: {
  role: AdminRole;
  size?: "sm" | "md";
}) {
  const roleMeta = ROLES[role] ?? ROLES.SUPER;
  const small = size === "sm";
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.25 rounded-md font-bold tracking-[.01em]",
        small ? "h-5 px-2 text-xs" : "h-6 px-2.5 text-xs",
      )}
      style={{ background: roleMeta.color + "14", color: roleMeta.color }}
    >
      <Icon.shield size={small ? 11 : 12} />
      {roleMeta.label}
    </span>
  );
}

// ---------- Severity dot ----------
export const SEV: Record<string, { color: string; label: string }> = {
  high: { color: "#D92D20", label: "High" },
  med: { color: "#E0A800", label: "Medium" },
  low: { color: "#5F6368", label: "Low" },
};
export function Severity({ level, label }: { level: string; label?: boolean }) {
  const meta = SEV[level] || SEV.low;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink">
      <span
        className="h-2 w-2 flex-none rounded-full"
        style={{ background: meta.color }}
      />
      {label !== false && meta.label}
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
  const meta = (map || {})[value] || { color: "#5F6368", bg: "#EEF0F2" };
  const Glyph = icon ? Icon[icon] : null;
  return (
    <span
      className="inline-flex h-5.5 items-center gap-1.25 rounded-md px-2.25 text-xs font-bold whitespace-nowrap"
      style={{ background: meta.bg, color: meta.color }}
    >
      {Glyph && <Glyph size={12} />}
      {value}
    </span>
  );
}

// ---------- Dense filter / search input ----------
export function AInput({
  value,
  onChange,
  placeholder,
  leftIcon,
  type = "text",
  width,
  rightSlot,
  onKeyDown,
  maxLength,
  inputMode,
  ariaLabel,
  className,
}: {
  value?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  leftIcon?: ReactNode;
  type?: string;
  width?: number | string;
  rightSlot?: ReactNode;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  maxLength?: number;
  inputMode?: "text" | "numeric" | "decimal";
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "relative inline-flex h-9 items-center rounded-lg border border-line bg-surface transition focus-within:border-primary-accent focus-within:shadow-[0_0_0_3px_rgba(25,135,84,.1)]",
        width ? "" : "w-auto",
        className,
      )}
      style={width ? { width } : undefined}
    >
      {leftIcon && <span className="flex pl-2.5 text-muted">{leftIcon}</span>}
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        type={type}
        onKeyDown={onKeyDown}
        maxLength={maxLength}
        inputMode={inputMode}
        aria-label={ariaLabel}
        className={cx(
          "h-full min-w-0 flex-1 border-none bg-transparent text-sm text-ink outline-none placeholder:text-muted",
          leftIcon ? "pr-2.5 pl-2" : "px-3",
        )}
      />
      {rightSlot}
    </div>
  );
}

export function ALabel({
  children,
  optional,
  hint,
}: {
  children: ReactNode;
  optional?: boolean;
  hint?: string;
}) {
  return (
    <div className="mb-1.5 text-xs font-semibold text-ink">
      <span className="flex justify-between">
        {children}
        {optional && <span className="font-medium text-muted">Optional</span>}
      </span>
      {hint && <span className="mt-0.5 block text-xs font-medium text-muted">{hint}</span>}
    </div>
  );
}

// ---------- Card ----------
export function Card({
  children,
  style,
  pad = 18,
  title,
  action,
  sub,
}: {
  children: ReactNode;
  style?: CSSProperties;
  pad?: number;
  title?: ReactNode;
  action?: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div
      className="rounded-xl border border-line bg-surface shadow-1"
      style={style}
    >
      {title && (
        <div className="flex items-center justify-between border-b border-line px-4.5 py-3.5">
          <div>
            <div className="text-sm font-bold">{title}</div>
            {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
          </div>
          {action}
        </div>
      )}
      <div style={{ padding: pad }}>{children}</div>
    </div>
  );
}

// ---------- Stat / widget ----------
export function Stat({
  label,
  value,
  sub,
  icon,
  tone = "var(--brand)",
  trend,
  money,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: string;
  tone?: string;
  trend?: boolean;
  money?: string;
}) {
  const Glyph = icon ? Icon[icon] : null;
  return (
    <div className="rounded-xl border border-line bg-surface px-4.5 py-4 shadow-1">
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold text-muted">{label}</span>
        {Glyph && (
          <span
            className="grid h-7.5 w-7.5 place-items-center rounded-md"
            style={{ background: tone + "14", color: tone }}
          >
            <Glyph size={16} />
          </span>
        )}
      </div>
      <div
        className="ngn mt-2 text-2xl font-extrabold tracking-[-.02em]"
        style={{ color: money || "var(--ink)" }}
      >
        {value}
      </div>
      {sub && (
        <div className="mt-1 flex items-center gap-1.25 text-xs text-muted">
          {trend && <Icon.trend size={13} className="text-success" />}
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
  render?: (row: T, index: number) => ReactNode;
}
const ALIGN_CLASS = { left: "text-left", right: "text-right", center: "text-center" } as const;

export function Table<T>({
  columns,
  rows,
  onRowClick,
  activeId,
  getId,
  empty,
  dense,
  rowStyle,
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
  if (!rows.length && empty) return <div className="py-2.5">{empty}</div>;
  const cellPad = dense ? "px-3 py-2.25" : "px-3.5 py-2.75";
  const minWidth = columns.reduce((sum, c) => sum + (c.w || 120), 0);
  return (
    <div className="thin-scroll overflow-x-auto">
      <table className="w-full border-collapse text-sm" style={{ minWidth }}>
        <thead>
          <tr className="border-b border-line">
            {columns.map((column) => (
              <th
                key={column.key}
                className={cx(
                  "sticky top-0 bg-surface text-xs font-bold tracking-[.04em] whitespace-nowrap text-muted uppercase",
                  cellPad,
                  ALIGN_CLASS[column.align ?? "left"],
                )}
                style={{ width: column.w }}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const id = getId ? getId(row) : (row as { id?: string }).id;
            const active = activeId != null && id === activeId;
            return (
              <tr
                key={id || index}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cx(
                  "border-b border-[#EEF1EF] transition-colors",
                  onRowClick && "cursor-pointer",
                  active ? "bg-primary-tint" : onRowClick && "hover:bg-canvas",
                )}
                style={rowStyle ? rowStyle(row) : undefined}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cx(
                      "align-middle text-ink",
                      cellPad,
                      column.wrap ? "whitespace-normal" : "whitespace-nowrap",
                      ALIGN_CLASS[column.align ?? "left"],
                    )}
                  >
                    {column.render
                      ? column.render(row, index)
                      : String((row as Record<string, unknown>)[column.key] ?? "")}
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
  open,
  onClose,
  title,
  sub,
  children,
  footer,
  width = 480,
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
    <div
      className={cx("fixed inset-0 z-80", open ? "pointer-events-auto" : "pointer-events-none")}
    >
      <div
        onClick={onClose}
        className={cx(
          "absolute inset-0 bg-[rgba(16,24,40,.4)] transition-opacity duration-250",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        className={cx(
          "absolute top-0 right-0 bottom-0 flex max-w-[92vw] flex-col bg-surface shadow-[-12px_0_40px_rgba(16,24,40,.18)] transition-transform duration-300 ease-[cubic-bezier(.32,.72,0,1)]",
          open ? "translate-x-0" : "translate-x-[102%]",
        )}
        style={{ width }}
      >
        <div className="flex items-start justify-between border-b border-line px-5 py-4">
          <div>
            <div className="text-base font-bold">{title}</div>
            {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md bg-canvas text-muted"
            aria-label="Close"
          >
            <Icon.close size={18} />
          </button>
        </div>
        <div className="thin-scroll flex-1 overflow-y-auto p-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2.5 border-t border-line px-5 py-3.5">{footer}</div>
        )}
      </div>
    </div>
  );
}

// ---------- Centered modal ----------
export function Modal({
  open,
  onClose,
  children,
  width = 440,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-90 grid place-items-center p-6">
      <div onClick={onClose} className="absolute inset-0 bg-[rgba(16,24,40,.5)] animate-[ed-fade_.15s]" />
      <div
        className="relative overflow-hidden rounded-lg bg-surface shadow-pop animate-[ed-scale-in_.2s]"
        style={{ width, maxWidth: "100%" }}
      >
        {children}
      </div>
    </div>
  );
}

// ---------- Segmented control ----------
export function Segmented({
  options,
  value,
  onChange,
  size = "md",
}: {
  options: (string | { value: string; label: string })[];
  value: string;
  onChange: (value: string) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="inline-flex gap-0.75 rounded-md bg-[#EEF1EF] p-0.75">
      {options.map((option) => {
        const optionValue = typeof option === "string" ? option : option.value;
        const optionLabel = typeof option === "string" ? option : option.label;
        const selected = value === optionValue;
        return (
          <button
            key={optionValue}
            onClick={() => onChange(optionValue)}
            className={cx(
              "rounded-md px-3.25 text-xs font-bold whitespace-nowrap",
              size === "sm" ? "h-7.5" : "h-8.5",
              selected ? "bg-surface text-brand shadow-1" : "bg-transparent text-muted",
            )}
          >
            {optionLabel}
          </button>
        );
      })}
    </div>
  );
}

// ---------- Filter chip ----------
export function Chip({
  children,
  active,
  onClick,
  icon,
  count,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  icon?: string;
  count?: number | null;
}) {
  const Glyph = icon ? Icon[icon] : null;
  return (
    <button
      onClick={onClick}
      className={cx(
        "inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold whitespace-nowrap",
        active
          ? "border-primary-accent bg-primary-tint text-brand"
          : "border-line bg-surface text-muted",
      )}
    >
      {Glyph && <Glyph size={14} />}
      {children}
      {count != null && (
        <span
          className={cx(
            "rounded-full px-1.5 text-xs font-bold",
            active ? "bg-primary-accent text-white" : "bg-line text-muted",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ---------- Toggle ----------
export function Toggle({
  on,
  onChange,
  disabled,
}: {
  on: boolean;
  onChange: (on: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={disabled ? undefined : () => onChange(!on)}
      disabled={disabled}
      role="switch"
      aria-checked={on}
      className={cx(
        "relative h-5.75 w-10 flex-none rounded-full transition-colors",
        on ? "bg-primary-accent" : "bg-[#CDD4D0]",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
      )}
    >
      <span
        className={cx(
          "absolute top-[2.5px] h-4.5 w-4.5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,.2)] transition-[left]",
          on ? "left-[19.5px]" : "left-[2.5px]",
        )}
      />
    </button>
  );
}

// ---------- Page header ----------
export function PageHead({
  title,
  sub,
  actions,
}: {
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="m-0 text-2xl font-bold tracking-[-.02em]">{title}</h1>
          {sub && <p className="mt-1.25 mb-0 text-sm text-muted">{sub}</p>}
        </div>
        {actions && <div className="flex flex-none gap-2.5">{actions}</div>}
      </div>
    </div>
  );
}
