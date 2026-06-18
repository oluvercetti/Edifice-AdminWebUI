"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { AInput } from "@/components/admin/primitives";
import { cx } from "@/lib/cx";
import { useAdminStore, type AdminRole } from "@/stores/admin-store";
import { ROLES, isReadOnly, navForRole } from "@/lib/roles";
import { logout } from "@/lib/auth";

// ============================================================
// Admin shell — persistent dark sidebar (role-filtered) + top bar with the
// "view console as role" switcher, environment indicator, and read-only badge.
// ============================================================

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Sidebar({ viewAs }: { viewAs: AdminRole | null }) {
  const pathname = usePathname();
  const navItems = navForRole(viewAs);
  return (
    <aside className="sticky top-0 flex h-screen w-58 flex-none flex-col bg-[#0D1F17] text-[#cdd9d2]">
      <div className="flex items-center gap-2.25 px-4.5 pt-4.5 pb-3.5">
        <span className="grid h-7.5 w-7.5 flex-none place-items-center rounded-md bg-primary-accent">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M5 20V7l7-3.5L19 7v13" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M9 20v-4h6v4M9.5 9.5h5M9.5 13h5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <div>
          <div className="text-base font-bold tracking-[-.01em] text-white">Edifice</div>
          <div className="text-xs font-semibold tracking-[.04em] text-[#6f8a7c]">ADMIN CONSOLE</div>
        </div>
      </div>
      <nav className="thin-scroll flex-1 overflow-y-auto px-2.5 py-1.5">
        {navItems.map((item) => {
          const Glyph = Icon[item.icon];
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cx(
                "relative mb-0.5 flex w-full items-center gap-2.5 rounded-md px-2.75 py-2.25 text-sm no-underline",
                active ? "bg-[rgba(25,135,84,.22)] font-bold text-white" : "font-medium text-[#a9bcb1]",
              )}
            >
              <Glyph size={18} />
              <span className="flex-1">{item.label}</span>
              {item.badge === "live" && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#7ee0a8]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#3ddc84] animate-[ed-pulse_1.6s_infinite]" />
                  LIVE
                </span>
              )}
              {active && (
                <span className="absolute top-2 bottom-2 -left-2.5 w-0.75 rounded-full bg-primary-accent" />
              )}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/8 px-3.5 py-3 text-xs text-[#6f8a7c]">
        <div className="flex items-center gap-1.5">
          <span className="h-1.75 w-1.75 rounded-full bg-[#3ddc84]" />
          All systems operational
        </div>
      </div>
    </aside>
  );
}

function TopBar() {
  const router = useRouter();
  const { admin, viewAs, setViewAs } = useAdminStore();
  const [menuOpen, setMenuOpen] = useState(false);
  if (!admin) return null;
  const role = viewAs ?? admin.roles[0];
  const roleMeta = ROLES[role];
  const readOnly = isReadOnly(viewAs);
  // A SUPER admin may preview any role; everyone else only their own.
  const selectableRoles = admin.roles.includes("SUPER")
    ? (Object.keys(ROLES) as AdminRole[])
    : admin.roles;

  return (
    <header className="sticky top-0 z-40 flex h-15 flex-none items-center gap-4 border-b border-line bg-surface px-6">
      <AInput
        placeholder="Search investors, transactions, projects…"
        ariaLabel="Search"
        leftIcon={<Icon.search size={16} />}
        width={340}
      />
      <div className="flex-1" />
      {readOnly && (
        <span className="inline-flex h-7 items-center gap-1.5 rounded-md bg-[#EEF0F2] px-2.75 text-xs font-bold text-muted">
          <Icon.eye size={14} />
          Read-only
        </span>
      )}
      <span className="inline-flex h-7 items-center gap-1.5 rounded-md bg-[#FCF3D9] px-2.75 text-xs font-bold text-[#9a7b00]">
        <span className="h-1.75 w-1.75 rounded-full bg-current" />
        Development
      </span>
      <button className="grid h-9.5 w-9.5 place-items-center rounded-lg border border-line bg-surface text-ink" aria-label="Alerts">
        <Icon.bell size={18} />
      </button>
      <div className="relative">
        <button
          onClick={() => setMenuOpen((open) => !open)}
          className="flex h-10 items-center gap-2.25 rounded-md border border-line bg-surface py-0 pr-2 pl-2.5"
        >
          <span className="grid h-7.5 w-7.5 place-items-center rounded-md bg-brand text-xs font-bold text-white">
            {initialsOf(admin.name)}
          </span>
          <span className="text-left">
            <span className="block text-xs leading-tight font-bold">{admin.name}</span>
            <span className="block text-xs font-bold" style={{ color: roleMeta.color }}>
              {roleMeta.label}
            </span>
          </span>
          <Icon.chevD size={15} className="text-muted" />
        </button>
        {menuOpen && (
          <>
            <div onClick={() => setMenuOpen(false)} className="fixed inset-0 z-[50]" />
            <div className="absolute top-11.5 right-0 z-[51] w-65 rounded-xl border border-line bg-surface p-2 shadow-pop animate-[ed-fade_.12s]">
              <div className="px-2.5 pt-1.5 pb-2 text-xs font-bold tracking-[.05em] text-muted uppercase">
                View console as role
              </div>
              {selectableRoles.map((roleKey) => (
                <button
                  key={roleKey}
                  onClick={() => {
                    setViewAs(roleKey);
                    setMenuOpen(false);
                  }}
                  className={cx(
                    "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2.25 text-left",
                    role === roleKey && "bg-primary-tint",
                  )}
                >
                  <span className="h-2 w-2 flex-none rounded-full" style={{ background: ROLES[roleKey].color }} />
                  <span className="flex-1">
                    <span className="block text-sm font-bold text-ink">{ROLES[roleKey].label}</span>
                    <span className="mt-px block text-xs leading-snug text-muted">{ROLES[roleKey].desc}</span>
                  </span>
                  {role === roleKey && <Icon.check size={15} className="text-primary-accent" />}
                </button>
              ))}
              <div className="my-2 h-px bg-line" />
              <button
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/settings");
                }}
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2.25 text-sm font-semibold text-ink"
              >
                <Icon.shieldCheck size={16} />
                Account &amp; security
              </button>
              <button
                onClick={() => void logout()}
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2.25 text-sm font-semibold text-danger"
              >
                <Icon.logout size={16} />
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const viewAs = useAdminStore((state) => state.viewAs);
  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar viewAs={viewAs} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="mx-auto w-full max-w-330 flex-1 px-7 pt-6.5 pb-15">{children}</main>
      </div>
    </div>
  );
}
