import type { CSSProperties } from "react";
import {
  type LucideIcon,
  Home,
  Compass,
  Layers,
  Activity,
  User,
  Search,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ArrowRight,
  X,
  Check,
  CheckCircle2,
  Shield,
  ShieldCheck,
  Lock,
  Building2,
  MapPin,
  TrendingUp,
  Clock,
  FileText,
  Download,
  Box,
  GalleryHorizontal,
  Camera,
  Bell,
  Settings,
  CreditCard,
  Landmark,
  Info,
  TriangleAlert,
  RefreshCw,
  Inbox,
  LogOut,
  Phone,
  Mail,
  Eye,
  EyeOff,
  Star,
  Plus,
  Copy,
  CircleHelp,
  Flag,
  KeyRound,
} from "lucide-react";

// ============================================================
// EDIFICE — Icon registry (backed by lucide-react) + brand logo
// ------------------------------------------------------------
// The named registry lets components reference icons either directly
// (`<Icon.bell />`) or dynamically by name from data (`Icon[notification.icon]`).
// Stroke width defaults to 1.8 to match the Edifice design language.
// ============================================================

export interface IconProps {
  size?: number;
  strokeWidth?: number;
  color?: string;
  style?: CSSProperties;
  className?: string;
}

function createIcon(LucideGlyph: LucideIcon) {
  return function EdificeIcon({
    size = 20,
    strokeWidth = 1.8,
    color,
    style,
    className,
  }: IconProps) {
    return (
      <LucideGlyph
        size={size}
        strokeWidth={strokeWidth}
        color={color}
        style={style}
        className={className}
      />
    );
  };
}

export type IconComponent = (props: IconProps) => React.ReactElement;

export const Icon: Record<string, IconComponent> = {
  home: createIcon(Home),
  compass: createIcon(Compass),
  layers: createIcon(Layers),
  pulse: createIcon(Activity),
  user: createIcon(User),
  search: createIcon(Search),
  filter: createIcon(SlidersHorizontal),
  chevR: createIcon(ChevronRight),
  chevL: createIcon(ChevronLeft),
  chevD: createIcon(ChevronDown),
  arrowR: createIcon(ArrowRight),
  close: createIcon(X),
  check: createIcon(Check),
  checkCircle: createIcon(CheckCircle2),
  shield: createIcon(Shield),
  shieldCheck: createIcon(ShieldCheck),
  lock: createIcon(Lock),
  building: createIcon(Building2),
  pin: createIcon(MapPin),
  trend: createIcon(TrendingUp),
  clock: createIcon(Clock),
  doc: createIcon(FileText),
  download: createIcon(Download),
  cube: createIcon(Box),
  pano: createIcon(GalleryHorizontal),
  camera: createIcon(Camera),
  bell: createIcon(Bell),
  settings: createIcon(Settings),
  card: createIcon(CreditCard),
  bank: createIcon(Landmark),
  info: createIcon(Info),
  alert: createIcon(TriangleAlert),
  refresh: createIcon(RefreshCw),
  inbox: createIcon(Inbox),
  logout: createIcon(LogOut),
  phone: createIcon(Phone),
  mail: createIcon(Mail),
  eye: createIcon(Eye),
  eyeOff: createIcon(EyeOff),
  star: createIcon(Star),
  plus: createIcon(Plus),
  copy: createIcon(Copy),
  helpCircle: createIcon(CircleHelp),
  flag: createIcon(Flag),
  key: createIcon(KeyRound),
};

// ---------- Brand logo (bespoke — not part of any icon library) ----------
export function EdificeMark({
  size = 28,
  color = "#fff",
  background = "var(--brand)",
}: {
  size?: number;
  color?: string;
  background?: string;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background,
        alignItems: "center",
        justifyContent: "center",
        flex: "none",
      }}
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none">
        <path d="M5 20V7l7-3.5L19 7v13" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9 20v-4h6v4M9.5 9.5h5M9.5 13h5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function EdificeWordmark({
  size = 19,
  color = "var(--ink)",
  markSize,
  light,
}: {
  size?: number;
  color?: string;
  markSize?: number;
  light?: boolean;
}) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
      <EdificeMark
        size={markSize || size * 1.5}
        color={light ? "var(--brand)" : "#fff"}
        background={light ? "#fff" : "var(--brand)"}
      />
      <span style={{ fontSize: size, fontWeight: 700, letterSpacing: "-.02em", color }}>
        Edifice
      </span>
    </span>
  );
}
