"use client";
import { adminLogin, adminLogout, adminMfa } from "./api/client";
import { useAdminStore, type AdminUser } from "@/stores/admin-store";

// ============================================================
// Admin auth actions — thin wrappers that call the backend and update the
// session store. Tokens never touch JS; they're set as httpOnly cookies by the
// backend. Two steps: password (login) → TOTP (verifyMfa).
// ============================================================

/** Step 1 — verify password. If MFA is enabled the backend sets a pending-MFA
 *  cookie (caller shows the TOTP step); if not, the backend issues the full
 *  session directly and returns the admin (we go straight to authenticated). */
export async function login(email: string, password: string) {
  const result = await adminLogin(email, password);
  if (result.mfaRequired) {
    useAdminStore.getState().setPendingMfa(true);
  } else if (result.admin) {
    useAdminStore.getState().setAdmin(result.admin as AdminUser);
  }
  return result; // { mfaRequired, admin? }
}

/** Step 2 — verify the TOTP code; backend sets the session cookies. */
export async function verifyMfa(code: string) {
  const admin = await adminMfa(code);
  useAdminStore.getState().setAdmin(admin);
  return admin;
}

export async function logout() {
  try {
    await adminLogout();
  } finally {
    useAdminStore.getState().clear();
  }
}
