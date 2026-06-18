"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { MfaSetup } from "@/components/MfaSetup";
import { ApiError } from "@/lib/api/http";
import { acceptInvite } from "@/lib/api/client";
import { useAdminStore, type AdminUser } from "@/stores/admin-store";
import {
  createPasswordSchema,
  type CreatePasswordValues,
} from "@/lib/schemas";
import { useToast } from "@/providers/ToastProvider";

// ============================================================
// Create-password (invite acceptance). Public route — an invitee has no session
// yet. Reads the single-use token, lets them set their own password (accepting
// the invite signs them in), then — if the invite required MFA — flows straight
// into MFA setup before entering the console.
// ============================================================

function Brand() {
  return (
    <div className="mb-5.5 flex items-center gap-2.5">
      <span className="grid h-8.5 w-8.5 flex-none place-items-center rounded-lg bg-brand">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M5 20V7l7-3.5L19 7v13" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M9 20v-4h6v4M9.5 9.5h5M9.5 13h5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </span>
      <div>
        <div className="text-base font-bold tracking-[-.01em]">Edifice</div>
        <div className="text-xs font-bold tracking-tight text-muted">ADMIN CONSOLE · INTERNAL USE</div>
      </div>
    </div>
  );
}

export function CreatePasswordScreen() {
  const router = useRouter();
  const toast = useToast();
  const token = useSearchParams().get("token") ?? "";
  const [step, setStep] = useState<"password" | "mfa">("password");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreatePasswordValues>({
    resolver: zodResolver(createPasswordSchema),
    mode: "onTouched",
    defaultValues: { password: "", confirm: "" },
  });

  const enterConsole = (admin: AdminUser) => {
    useAdminStore.getState().setAdmin(admin);
    router.replace("/");
  };

  const onSubmit = handleSubmit(async ({ password }) => {
    setBusy(true);
    try {
      const result = await acceptInvite(token, password);
      if (result.mfaSetupRequired) {
        toast("Password set — now set up MFA", "success");
        setStep("mfa");
      } else {
        toast("Welcome to the console", "success");
        enterConsole(result.admin);
      }
    } catch (error) {
      toast(
        error instanceof ApiError ? error.message : "Couldn’t set your password.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  });

  return (
    <div className="ed-auth-stage flex min-h-screen">
      <div className="grid w-full place-items-center p-6">
        <div className="w-105 max-w-full rounded-xl bg-surface p-8 shadow-pop">
          <Brand />
          {!token ? (
            <div>
              <h1 className="mb-1.5 text-xl font-bold">Invalid invite link</h1>
              <p className="text-sm leading-relaxed text-muted">
                This link is missing its token. Ask an administrator to resend
                your invite.
              </p>
            </div>
          ) : step === "mfa" ? (
            <>
              <h1 className="mb-1 text-2xl font-bold">Set up MFA</h1>
              <p className="mb-5 text-sm text-muted">
                Your account requires two-factor authentication.
              </p>
              <MfaSetup onComplete={enterConsole} />
            </>
          ) : (
            <>
              <h1 className="mb-1 text-2xl font-bold">Create your password</h1>
              <p className="mb-5 text-sm text-muted">
                Set a password to activate your admin account.
              </p>
              <form onSubmit={onSubmit} noValidate>
                <Field label="Password" error={errors.password?.message}>
                  <Input
                    type={showPassword ? "text" : "password"}
                    leftIcon={<Icon.lock size={16} />}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    error={!!errors.password}
                    rightSlot={
                      <button
                        type="button"
                        onClick={() => setShowPassword((shown) => !shown)}
                        className="flex text-muted"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <Icon.eyeOff size={16} /> : <Icon.eye size={16} />}
                      </button>
                    }
                    {...register("password")}
                  />
                </Field>
                <Field label="Confirm password" error={errors.confirm?.message}>
                  <Input
                    type={showPassword ? "text" : "password"}
                    leftIcon={<Icon.lock size={16} />}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    error={!!errors.confirm}
                    {...register("confirm")}
                  />
                </Field>
                <Button full size="lg" type="submit" busy={busy}>
                  Set password
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
