"use client";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Icon } from "@/components/icons";

// ============================================================
// Toast — transient top-right feedback for admin actions.
// ============================================================

type ToastKind = "success" | "error" | "info";
interface ToastState {
  msg: string;
  kind: ToastKind;
  id: number;
}

const ToastContext = createContext<(msg: string, kind?: ToastKind) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

const STYLE: Record<ToastKind, { bg: string; ic: string }> = {
  success: { bg: "var(--brand)", ic: "checkCircle" },
  error: { bg: "var(--danger)", ic: "alert" },
  info: { bg: "var(--ink)", ic: "info" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((msg: string, kind: ToastKind = "success") => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ msg, kind, id: Date.now() });
    timer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const k = toast ? STYLE[toast.kind] : null;
  const IcC = k ? Icon[k.ic] : null;

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && k && IcC && (
        <div style={{ position: "fixed", top: 72, right: 24, zIndex: 100, animation: "ed-fade-up .25s" }}>
          <div style={{
            background: k.bg, color: "#fff", borderRadius: 10, padding: "12px 16px",
            display: "flex", alignItems: "center", gap: 10, boxShadow: "var(--sh-pop)", maxWidth: 360,
          }}>
            <IcC size={19} />
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>{toast.msg}</span>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}
