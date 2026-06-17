"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";
import { AInput } from "@/components/admin/primitives";
import { useAdminStore, type AdminRole } from "@/stores/admin-store";
import { ADMIN_NAV, ROLES, isReadOnly, navForRole } from "@/lib/roles";
import { logout } from "@/lib/auth";

// ============================================================
// Admin shell — persistent dark sidebar (role-filtered) + top bar with the
// "view console as role" switcher, environment indicator, and read-only badge.
// ============================================================

function initials(name: string): string {
  return name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
}

function Sidebar({ viewAs }: { viewAs: AdminRole | null }) {
  const pathname = usePathname();
  const items = navForRole(viewAs);
  return (
    <aside style={{ width: 232, flex: "none", background: "#0D1F17", color: "#cdd9d2", display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0 }}>
      <div style={{ padding: "18px 18px 14px", display: "flex", alignItems: "center", gap: 9 }}>
        <span style={{ width: 30, height: 30, borderRadius: 8, background: "var(--primary-accent)", display: "grid", placeItems: "center", flex: "none" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M5 20V7l7-3.5L19 7v13" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M9 20v-4h6v4M9.5 9.5h5M9.5 13h5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <div>
          <div style={{ fontSize: 15.5, fontWeight: 700, color: "#fff", letterSpacing: "-.01em" }}>Edifice</div>
          <div style={{ fontSize: 10.5, color: "#6f8a7c", fontWeight: 600, letterSpacing: ".04em" }}>ADMIN CONSOLE</div>
        </div>
      </div>
      <nav className="thin-scroll" style={{ flex: 1, overflowY: "auto", padding: "6px 10px" }}>
        {items.map((n) => {
          const IcC = Icon[n.icon];
          const on = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
          return (
            <Link key={n.id} href={n.href} style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 11px", borderRadius: 8,
              cursor: "pointer", marginBottom: 2, textDecoration: "none",
              background: on ? "rgba(25,135,84,.22)" : "transparent", color: on ? "#fff" : "#a9bcb1",
              fontSize: 13.5, fontWeight: on ? 700 : 500, position: "relative",
            }}>
              <IcC size={18} />
              <span style={{ flex: 1 }}>{n.label}</span>
              {n.badge === "live" && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: "#7ee0a8" }}>
                  <span style={{ width: 6, height: 6, borderRadius: 99, background: "#3ddc84", animation: "ed-pulse 1.6s infinite" }} />LIVE
                </span>
              )}
              {on && <span style={{ position: "absolute", left: -10, top: 8, bottom: 8, width: 3, borderRadius: 99, background: "var(--primary-accent)" }} />}
            </Link>
          );
        })}
      </nav>
      <div style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,.08)", fontSize: 11, color: "#6f8a7c" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: 99, background: "#3ddc84" }} />All systems operational
        </div>
      </div>
    </aside>
  );
}

function TopBar() {
  const { admin, viewAs, setViewAs } = useAdminStore();
  const [open, setOpen] = useState(false);
  if (!admin) return null;
  const role = viewAs ?? admin.roles[0];
  const r = ROLES[role];
  const readOnly = isReadOnly(viewAs);
  // A SUPER admin can preview any role; everyone else can only view their own roles.
  const selectableRoles = admin.roles.includes("SUPER")
    ? (Object.keys(ROLES) as AdminRole[])
    : admin.roles;

  return (
    <header style={{ height: 60, flex: "none", background: "#fff", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 16, padding: "0 24px", position: "sticky", top: 0, zIndex: 40 }}>
      <AInput placeholder="Search investors, transactions, projects…" leftIcon={<Icon.search size={16} />} width={340} />
      <div style={{ flex: 1 }} />
      {readOnly && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 28, padding: "0 11px", borderRadius: 7, background: "#EEF0F2", color: "var(--muted)", fontSize: 12, fontWeight: 700 }}>
          <Icon.eye size={14} />Read-only
        </span>
      )}
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 28, padding: "0 11px", borderRadius: 7, background: "#FCF3D9", color: "#9a7b00", fontSize: 12, fontWeight: 700 }}>
        <span style={{ width: 7, height: 7, borderRadius: 99, background: "currentColor" }} />Development
      </span>
      <button style={{ position: "relative", width: 38, height: 38, borderRadius: 9, border: "1px solid var(--line)", background: "#fff", display: "grid", placeItems: "center", cursor: "pointer", color: "var(--ink)" }}>
        <Icon.bell size={18} />
      </button>
      <div style={{ position: "relative" }}>
        <button onClick={() => setOpen((o) => !o)} style={{ display: "flex", alignItems: "center", gap: 9, height: 40, padding: "0 8px 0 10px", borderRadius: 10, border: "1px solid var(--line)", background: "#fff", cursor: "pointer" }}>
          <span style={{ width: 30, height: 30, borderRadius: 8, background: "var(--brand)", color: "#fff", display: "grid", placeItems: "center", fontSize: 12.5, fontWeight: 700 }}>{initials(admin.name)}</span>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.1 }}>{admin.name}</div>
            <div style={{ fontSize: 11, color: r.color, fontWeight: 700 }}>{r.label}</div>
          </div>
          <Icon.chevD size={15} style={{ color: "var(--muted)" }} />
        </button>
        {open && (
          <>
            <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 50 }} />
            <div style={{ position: "absolute", top: 46, right: 0, width: 260, background: "#fff", border: "1px solid var(--line)", borderRadius: 12, boxShadow: "var(--sh-pop)", zIndex: 51, padding: 8, animation: "ed-fade .12s" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em", padding: "6px 10px 8px" }}>View console as role</div>
              {selectableRoles.map((k) => (
                <button key={k} onClick={() => { setViewAs(k); setOpen(false); }} style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 10px", borderRadius: 8,
                  border: "none", cursor: "pointer", background: role === k ? "var(--primary-tint)" : "transparent", textAlign: "left",
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: 99, background: ROLES[k].color, flex: "none" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{ROLES[k].label}</div>
                    <div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.3, marginTop: 1 }}>{ROLES[k].desc}</div>
                  </div>
                  {role === k && <Icon.check size={15} style={{ color: "var(--primary-accent)" }} />}
                </button>
              ))}
              <div style={{ height: 1, background: "var(--line)", margin: "8px 0" }} />
              <button onClick={() => void logout()} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 10px", borderRadius: 8, border: "none", cursor: "pointer", background: "transparent", color: "var(--danger)", fontSize: 13, fontWeight: 600 }}>
                <Icon.logout size={16} />Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const viewAs = useAdminStore((s) => s.viewAs);
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--canvas)" }}>
      <Sidebar viewAs={viewAs} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <TopBar />
        <main style={{ flex: 1, padding: "26px 28px 60px", maxWidth: 1320, width: "100%", margin: "0 auto" }}>{children}</main>
      </div>
    </div>
  );
}

// Re-export for nav guards used by screens (active item helpers).
export { ADMIN_NAV };
