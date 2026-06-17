"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// ============================================================
// Admin session store — non-sensitive session state only. Tokens live in
// httpOnly cookies (edifice_admin_*); this mirrors the signed-in admin + the
// "view console as role" lens. Persisted to sessionStorage so a mid-session
// reload keeps the view. The backend still enforces real RBAC on every call.
// ============================================================

export type AdminRole = "SUPER" | "CATALOGUE" | "FINANCE" | "OPS" | "AUDITOR";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  roles: AdminRole[];
  status: "ACTIVE" | "SUSPENDED";
  mfaEnabled: boolean;
}

export type AdminStatus =
  | "idle"
  | "loading"
  | "authenticated"
  | "unauthenticated";

interface AdminState {
  admin: AdminUser | null;
  status: AdminStatus;
  /** The role lens for nav + read-only gating (defaults to the admin's first role). */
  viewAs: AdminRole | null;
  /** True between password and MFA steps. */
  pendingMfa: boolean;
  setAdmin: (admin: AdminUser | null) => void;
  setViewAs: (role: AdminRole) => void;
  setPendingMfa: (v: boolean) => void;
  clear: () => void;
  hydrate: () => Promise<void>;
}

const safeSessionStorage = createJSONStorage(() =>
  typeof window !== "undefined"
    ? window.sessionStorage
    : {
        getItem: () => null,
        setItem: () => undefined,
        removeItem: () => undefined,
      },
);

export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
      admin: null,
      status: "idle",
      viewAs: null,
      pendingMfa: false,

      setAdmin: (admin) =>
        set((s) => ({
          admin,
          status: admin ? "authenticated" : "unauthenticated",
          viewAs: admin ? (s.viewAs ?? admin.roles[0] ?? null) : null,
          pendingMfa: false,
        })),
      setViewAs: (viewAs) => set({ viewAs }),
      setPendingMfa: (pendingMfa) => set({ pendingMfa }),
      clear: () =>
        set({ admin: null, status: "unauthenticated", viewAs: null, pendingMfa: false }),

      hydrate: async () => {
        if (get().status === "loading") return;
        set({ status: "loading" });
        const { api, ApiError } = await import("@/lib/api/http");
        try {
          const admin = await api<AdminUser>("/admin/auth/me");
          set((s) => ({
            admin,
            status: "authenticated",
            viewAs: s.viewAs ?? admin.roles[0] ?? null,
          }));
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) {
            set({ admin: null, status: "unauthenticated" });
          } else {
            set({ status: "unauthenticated" });
          }
        }
      },
    }),
    {
      name: "edifice-admin",
      storage: safeSessionStorage,
      partialize: (state) => ({ admin: state.admin, viewAs: state.viewAs }),
    },
  ),
);
