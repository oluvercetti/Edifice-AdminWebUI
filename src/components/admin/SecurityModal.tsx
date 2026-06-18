"use client";
import { useState } from "react";
import { Modal } from "@/components/admin/primitives";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Pill } from "@/components/ui/Pill";
import { Icon } from "@/components/icons";
import { MfaSetup } from "@/components/MfaSetup";
import { ApiError } from "@/lib/api/http";
import { disableMfa } from "@/lib/api/client";
import { useAdminStore, type AdminUser } from "@/stores/admin-store";
import { useToast } from "@/providers/ToastProvider";

// ============================================================
// SecurityModal — self-service account security. Enable MFA (QR + key + confirm)
// or disable it (requires a current code). Opened from the Shell account menu.
// ============================================================

export function SecurityModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const admin = useAdminStore((s) => s.admin);
  const setAdmin = useAdminStore((s) => s.setAdmin);
  const [enrolling, setEnrolling] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const onEnabled = (updated: AdminUser) => {
    setAdmin(updated);
    setEnrolling(false);
    toast("MFA enabled");
  };

  const disable = async () => {
    setBusy(true);
    try {
      setAdmin(await disableMfa(code));
      setCode("");
      toast("MFA disabled");
    } catch (error) {
      toast(
        error instanceof ApiError ? error.message : "Couldn’t disable MFA.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    setEnrolling(false);
    setCode("");
    onClose();
  };

  if (!admin) return null;

  return (
    <Modal open={open} onClose={close} width={460}>
      <div className="p-5">
        <div className="mb-4 flex items-start justify-between">
          <h2 className="m-0 text-base font-bold tracking-[-.01em] text-ink">
            Two-factor authentication
          </h2>
          <button
            type="button"
            onClick={close}
            className="grid h-8 w-8 place-items-center rounded-md bg-canvas text-muted"
            aria-label="Close"
          >
            <Icon.close size={18} />
          </button>
        </div>

        {admin.mfaEnabled ? (
          <>
            <div className="mb-4 flex items-center gap-2">
              <Pill color="var(--success)" background="#E6F3EC" icon="check">
                Enabled
              </Pill>
              <span className="text-sm text-muted">
                A code from your authenticator is required at sign-in.
              </span>
            </div>
            <p className="mb-3 text-sm text-muted">
              Enter a current 6-digit code to turn MFA off.
            </p>
            <Field label="Authenticator code">
              <Input
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                leftIcon={<Icon.shieldCheck size={16} />}
              />
            </Field>
            <Button
              full
              variant="outlineDanger"
              busy={busy}
              disabled={code.length !== 6}
              onClick={() => void disable()}
            >
              Disable MFA
            </Button>
          </>
        ) : enrolling ? (
          <MfaSetup onComplete={onEnabled} />
        ) : (
          <>
            <p className="mb-4 text-sm leading-relaxed text-muted">
              Add a second factor with an authenticator app (TOTP) so your
              sign-in needs both your password and a one-time code.
            </p>
            <Button full onClick={() => setEnrolling(true)}>
              Set up MFA
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}
