"use client";
import type {
  ChangeEvent,
  FocusEvent,
  ReactNode,
  Ref,
} from "react";
import { Icon } from "@/components/icons";
import { cx } from "@/lib/cx";

// ============================================================
// Field (label + hint/error wrapper) and Input — the dense admin form
// primitives. Inputs forward name/onBlur/ref so react-hook-form's
// {...register("field")} wires straight onto the underlying <input>.
// ============================================================

export function Field({
  label,
  hint,
  error,
  children,
  optional,
  labelRight,
  htmlFor,
  className,
}: {
  label?: string;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  optional?: boolean;
  labelRight?: ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={cx("block", className ?? "mb-4")}>
      {(label || labelRight) && (
        <span className="mb-1.5 flex items-baseline justify-between text-xs font-semibold text-ink">
          {label ?? <span />}
          {optional && <span className="font-medium text-muted">Optional</span>}
          {labelRight}
        </span>
      )}
      {children}
      {error ? (
        <span className="mt-1.5 flex items-center gap-1 text-xs font-medium text-danger">
          <Icon.alert size={13} />
          {error}
        </span>
      ) : (
        hint && <span className="mt-1.5 block text-xs text-muted">{hint}</span>
      )}
    </label>
  );
}

export interface InputProps {
  value?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  error?: boolean;
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
  id?: string;
  inputMode?: "text" | "numeric" | "decimal" | "tel" | "email" | "search" | "url";
  maxLength?: number;
  disabled?: boolean;
  autoComplete?: string;
  /** Accessible name when there's no visible <label> (e.g. the topbar search). */
  ariaLabel?: string;
  fullWidth?: boolean;
  // react-hook-form integration.
  name?: string;
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
  ref?: Ref<HTMLInputElement>;
}

export function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  error,
  leftIcon,
  rightSlot,
  id,
  inputMode,
  maxLength,
  disabled,
  autoComplete,
  ariaLabel,
  fullWidth = true,
  name,
  onBlur,
  ref,
}: InputProps) {
  return (
    <div
      className={cx(
        "relative inline-flex h-9 items-center rounded-lg border bg-surface transition focus-within:shadow-[0_0_0_3px_rgba(25,135,84,.1)]",
        error
          ? "border-danger"
          : "border-line focus-within:border-primary-accent",
        disabled && "opacity-60",
        fullWidth ? "flex w-full" : "w-auto",
      )}
    >
      {leftIcon && <span className="flex pl-2.5 text-muted">{leftIcon}</span>}
      <input
        id={id}
        ref={ref}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        type={type}
        inputMode={inputMode}
        maxLength={maxLength}
        disabled={disabled}
        autoComplete={autoComplete}
        aria-label={ariaLabel}
        aria-invalid={error || undefined}
        onBlur={onBlur}
        className={cx(
          "h-full min-w-0 flex-1 border-none bg-transparent text-sm text-ink outline-none placeholder:text-muted",
          leftIcon ? "pr-2.5 pl-2" : "px-3",
        )}
      />
      {rightSlot && <span className="flex pr-2.5">{rightSlot}</span>}
    </div>
  );
}

/** Multi-line variant matching the Input chrome. */
export function Textarea({
  id,
  name,
  ref,
  value,
  onChange,
  onBlur,
  placeholder,
  rows = 3,
  error,
}: {
  id?: string;
  name?: string;
  ref?: Ref<HTMLTextAreaElement>;
  value?: string;
  onChange?: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur?: (event: FocusEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  error?: boolean;
}) {
  return (
    <textarea
      id={id}
      ref={ref}
      name={name}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      placeholder={placeholder}
      rows={rows}
      aria-invalid={error || undefined}
      className={cx(
        "w-full resize-y rounded-lg border bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:shadow-[0_0_0_3px_rgba(25,135,84,.1)] placeholder:text-muted",
        error ? "border-danger" : "border-line focus:border-primary-accent",
      )}
    />
  );
}
