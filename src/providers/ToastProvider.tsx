"use client";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { cx } from "@/lib/cx";

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

const TOAST_STYLE: Record<ToastKind, { className: string; icon: string }> = {
  success: { className: "bg-brand", icon: "checkCircle" },
  error: { className: "bg-danger", icon: "alert" },
  info: { className: "bg-ink", icon: "info" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((msg: string, kind: ToastKind = "success") => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ msg, kind, id: Date.now() });
    timer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const style = toast ? TOAST_STYLE[toast.kind] : null;
  const Glyph = style ? Icon[style.icon] : null;

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && style && Glyph && (
        <div className="fixed top-18 right-6 z-100 animate-[ed-fade-up_.25s]">
          <div
            className={cx(
              "flex max-w-90 items-center gap-2.5 rounded-md px-4 py-3 text-white shadow-pop",
              style.className,
            )}
          >
            <Glyph size={19} />
            <span className="text-sm font-semibold">{toast.msg}</span>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}
