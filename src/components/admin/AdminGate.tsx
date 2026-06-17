"use client";
import { useEffect } from "react";
import { useAdminStore } from "@/stores/admin-store";
import { Shell } from "@/components/admin/Shell";
import { AuthScreens } from "@/components/screens/AuthScreens";
import { Spinner } from "@/components/ui/feedback";

// ============================================================
// AdminGate — hydrates the admin session from the httpOnly cookie, then either
// renders the sign-in flow (A0) or the console shell around the routed page.
// ============================================================

export function AdminGate({ children }: { children: React.ReactNode }) {
  const status = useAdminStore((s) => s.status);
  const hydrate = useAdminStore((s) => s.hydrate);

  useEffect(() => {
    if (status === "idle") void hydrate();
  }, [status, hydrate]);

  if (status === "idle" || status === "loading") {
    return (
      <div className="ed-auth-stage grid min-h-screen place-items-center">
        <Spinner size={40} color="#fff" />
      </div>
    );
  }

  if (status !== "authenticated") {
    return <AuthScreens />;
  }

  return <Shell>{children}</Shell>;
}
