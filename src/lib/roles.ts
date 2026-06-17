import type { AdminRole } from "@/stores/admin-store";

// ============================================================
// Role vocabulary + role-filtered navigation (PRD A8 permission matrix).
// The sidebar shows only items whose `roles` include the active view role;
// AUDITOR is read-only everywhere.
// ============================================================

export const ROLES: Record<AdminRole, { label: string; color: string; desc: string }> = {
  SUPER: { label: "Super Admin", color: "#0F5132", desc: "Full access to every area and action." },
  CATALOGUE: { label: "Catalogue", color: "#146C43", desc: "Create, edit and publish projects and content." },
  FINANCE: { label: "Finance", color: "#1570EF", desc: "Money, monitoring, disbursement & reconciliation." },
  OPS: { label: "Operations", color: "#7A5AF8", desc: "Investor accounts and complaints." },
  AUDITOR: { label: "Auditor", color: "#5F6368", desc: "Read-only access with export. No mutations." },
};

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  roles: AdminRole[];
  href: string;
  badge?: "live";
}

export const ADMIN_NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "home", roles: ["SUPER", "CATALOGUE", "FINANCE", "OPS", "AUDITOR"], href: "/" },
  { id: "catalogue", label: "Catalogue", icon: "building", roles: ["SUPER", "CATALOGUE"], href: "/catalogue" },
  { id: "monitoring", label: "Transactions", icon: "pulse", roles: ["SUPER", "FINANCE", "AUDITOR"], href: "/monitoring", badge: "live" },
  { id: "disbursements", label: "Disbursements", icon: "check", roles: ["SUPER", "FINANCE"], href: "/disbursements" },
  { id: "reconciliation", label: "Reconciliation", icon: "shieldCheck", roles: ["SUPER", "FINANCE", "AUDITOR"], href: "/reconciliation" },
  { id: "investors", label: "Investors", icon: "user", roles: ["SUPER", "OPS", "AUDITOR"], href: "/investors" },
  { id: "cases", label: "Cases", icon: "inbox", roles: ["SUPER", "OPS", "FINANCE"], href: "/cases" },
  { id: "reports", label: "Reports", icon: "trend", roles: ["SUPER", "FINANCE", "AUDITOR"], href: "/reports" },
  { id: "admins", label: "Admin users", icon: "shield", roles: ["SUPER"], href: "/admins" },
  { id: "audit", label: "Audit log", icon: "doc", roles: ["SUPER", "AUDITOR"], href: "/audit" },
];

export const isReadOnly = (role: AdminRole | null): boolean => role === "AUDITOR";

export function navForRole(role: AdminRole | null): NavItem[] {
  if (!role) return [];
  return ADMIN_NAV.filter((n) => n.roles.includes(role));
}

export function canSee(role: AdminRole | null, item: NavItem): boolean {
  return Boolean(role && item.roles.includes(role));
}
