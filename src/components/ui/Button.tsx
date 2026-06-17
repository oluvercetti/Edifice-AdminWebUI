"use client";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Icon } from "@/components/icons";
import { cx } from "@/lib/cx";

type Variant =
  | "primary"
  | "strong"
  | "secondary"
  | "ghost"
  | "tint"
  | "destructive"
  | "outlineDanger";
type Size = "sm" | "md" | "lg";

export interface ButtonProps {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  children?: ReactNode;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  disabled?: boolean;
  busy?: boolean;
  onClick?: () => void;
  href?: string;
  style?: CSSProperties;
  type?: "button" | "submit" | "reset";
  title?: string;
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: "h-8 gap-1.5 rounded-md px-3 text-xs",
  md: "h-10 gap-2 rounded-md px-4 text-sm",
  lg: "h-12 gap-2.25 rounded-md px-5 text-base",
};

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-brand text-white shadow-1",
  strong: "bg-primary-accent text-white shadow-1",
  secondary: "border border-line bg-surface text-ink shadow-1",
  ghost: "bg-transparent text-brand",
  tint: "bg-primary-tint text-brand",
  destructive: "bg-danger text-white shadow-1",
  outlineDanger: "border border-[#F4C4BF] bg-surface text-danger",
};

export function Button({
  variant = "primary",
  size = "md",
  full,
  children,
  leftIcon,
  rightIcon,
  disabled,
  busy,
  onClick,
  href,
  style,
  type = "button",
  title,
}: ButtonProps) {
  const isDisabled = disabled || busy;
  const className = cx(
    "focusable inline-flex cursor-pointer items-center justify-center font-semibold transition active:scale-[.98]",
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:active:scale-100",
    SIZE_CLASSES[size],
    VARIANT_CLASSES[variant],
    full ? "w-full" : "w-auto",
  );
  const content = (
    <>
      {busy ? <Icon.refresh size={16} className="spin" /> : leftIcon}
      {children}
      {!busy && rightIcon}
    </>
  );

  if (href && !isDisabled) {
    return (
      <Link href={href} className={className} style={style} title={title} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      title={title}
      style={style}
      className={className}
    >
      {content}
    </button>
  );
}
