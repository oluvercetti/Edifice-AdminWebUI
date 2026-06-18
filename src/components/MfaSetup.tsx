"use client";
import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { ApiError } from "@/lib/api/http";
import { enableMfa, startMfaSetup } from "@/lib/api/client";
import type { AdminUser } from "@/stores/admin-store";
import { useToast } from "@/providers/ToastProvider";

// ============================================================
// MfaSetup — TOTP enrollment. Shows a scannable QR (otpauth URI) AND the manual
// key, then confirms a 6-digit code to activate. Reused by onboarding (after
// create-password), the login-forced path, and self-service settings.
// ============================================================

export function MfaSetup({
  onComplete,
}: {
  onComplete: (admin: AdminUser) => void;
}) {
  const toast = useToast();
  const [setup, setSetup] = useState<{
    secret: string;
    otpauthUri: string;
  } | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    startMfaSetup()
      .then((s) => active && setSetup(s))
      .catch(() => active && setLoadError(true));
    return () => {
      active = false;
    };
  }, []);

  const submit = async () => {
    setBusy(true);
    try {
      onComplete(await enableMfa(code));
    } catch (error) {
      toast(
        error instanceof ApiError ? error.message : "Couldn’t enable MFA.",
        "error",
      );
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  if (loadError) {
    return (
      <p className="text-sm font-medium text-danger">
        Couldn’t start MFA setup. Please try again.
      </p>
    );
  }
  if (!setup) return <div className="skel h-56 rounded-lg" />;

  return (
    <div>
      <p className="mb-3.5 text-sm leading-relaxed text-muted">
        Scan the QR code with your authenticator app (or enter the key
        manually), then enter the 6-digit code to confirm.
      </p>

      <div className="mb-4 flex justify-center rounded-lg border border-line bg-white p-4">
        <QRCode value={setup.otpauthUri} size={160} />
      </div>

      <div className="mb-4">
        <div className="mb-1.5 text-xs font-semibold text-ink">Setup key</div>
        <div className="flex items-center gap-2 rounded-lg border border-line bg-canvas px-3 py-2">
          <code className="min-w-0 flex-1 font-mono text-sm break-all text-ink">
            {setup.secret}
          </code>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(setup.secret);
              toast("Setup key copied");
            }}
            className="flex-none text-xs font-semibold text-brand"
          >
            Copy
          </button>
        </div>
      </div>

      <Field label="6-digit code">
        <Input
          value={code}
          onChange={(event) =>
            setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
          }
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          leftIcon={<Icon.shieldCheck size={16} />}
        />
      </Field>

      <Button
        full
        size="lg"
        busy={busy}
        disabled={code.length !== 6}
        onClick={() => void submit()}
      >
        Enable MFA
      </Button>
    </div>
  );
}
