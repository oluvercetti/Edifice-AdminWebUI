import type { CSSProperties, ReactNode } from "react";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/Button";

export function Skeleton({
  width = "100%",
  height = 14,
  radius = 6,
  style,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number;
  style?: CSSProperties;
}) {
  return <div className="skel" style={{ width, height, borderRadius: radius, ...style }} />;
}

export function Spinner({
  size = 22,
  strokeWidth = 2.5,
  color = "var(--brand)",
}: {
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  return (
    <svg className="spin" width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="rgba(0,0,0,.08)" strokeWidth={strokeWidth} />
      <path d="M21 12a9 9 0 0 0-9-9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function Placeholder({
  label = "Image",
  icon = "building",
  style,
  children,
  height,
}: {
  label?: string;
  icon?: string;
  style?: CSSProperties;
  children?: ReactNode;
  height?: number | string;
}) {
  const IconGlyph = Icon[icon];
  return (
    <div className="ph" style={{ height, ...style }}>
      {children || (
        <span className="ph-label">
          {IconGlyph && <IconGlyph size={15} />}
          {label}
        </span>
      )}
    </div>
  );
}

export function EmptyState({
  icon = "inbox",
  title,
  body,
  action,
}: {
  icon?: string;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
}) {
  const IconGlyph = Icon[icon];
  return (
    <div className="flex flex-col items-center px-7 py-11 text-center animate-[ed-fade_.3s_both]">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-tint text-primary-strong">
        <IconGlyph size={26} />
      </span>
      <h3 className="m-0 text-sm font-bold text-ink">{title}</h3>
      {body && <p className="mt-2 mb-0 max-w-72 text-sm leading-normal text-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  body = "We couldn't load this right now.",
  onRetry,
}: {
  title?: ReactNode;
  body?: ReactNode;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center px-7 py-11 text-center animate-[ed-fade_.3s_both]">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FDECEA] text-danger">
        <Icon.alert size={26} />
      </span>
      <h3 className="m-0 text-sm font-bold text-ink">{title}</h3>
      <p className="mt-2 mb-0 max-w-72 text-sm leading-normal text-muted">{body}</p>
      {onRetry && (
        <div className="mt-5">
          <Button variant="secondary" size="sm" leftIcon={<Icon.refresh size={15} />} onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
