"use client";
import { adminLogin, adminLogout, adminMfa } from "./api/client";
import { useAdminStore } from "@/stores/admin-store";

// ============================================================
// Admin auth actions — thin wrappers that call the backend and update the
// session store. Tokens never touch JS; they're set as httpOnly cookies by the
// backend. Two steps: password (login) → TOTP (verifyMfa).
// ============================================================

/** Step 1 — verify password; backend sets the pending-MFA cookie. */
export async function login(email: string, password: string) {
  const result = await adminLogin(email, password);
  useAdminStore.getState().setPendingMfa(true);
  return result; // { mfaRequired, devCode? }
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
