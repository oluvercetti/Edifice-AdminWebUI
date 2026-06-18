"use client";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { cx } from "@/lib/cx";
import { ApiError } from "@/lib/api/http";
import { login, verifyMfa } from "@/lib/auth";
import { adminLoginSchema, type AdminLoginValues } from "@/lib/schemas";
import { useToast } from "@/providers/ToastProvider";

/** Pull the API message off an error, with a fallback. */
function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

// ============================================================
// A0 — Admin authentication: login → TOTP MFA → console; plus access-denied.
// Login uses react-hook-form + zod; internal-use framing on the brand stage.
// ============================================================

type Mode = "login" | "mfa" | "denied";

function Stage({ children }: { children: React.ReactNode }) {
  return (
    <div className="ed-auth-stage flex min-h-screen">
      <div className="grid w-full place-items-center p-6">
        <div className="w-105 max-w-full rounded-xl bg-surface p-8 shadow-pop">{children}</div>
      </div>
    </div>
  );
}

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

export function AuthScreens() {
  const toast = useToast();
  const [mode, setMode] = useState<Mode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdminLoginValues>({
    resolver: zodResolver(adminLoginSchema),
    mode: "onTouched",
    defaultValues: { email: "", password: "" },
  });

  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [mfaError, setMfaError] = useState(false);
  const [mfaBusy, setMfaBusy] = useState(false);
  const digitInputs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus the first code box whenever the MFA step appears (avoids reading the
  // ref inside the submit handler, which the React Compiler rules disallow).
  useEffect(() => {
    if (mode === "mfa") digitInputs.current[0]?.focus();
  }, [mode]);

  const onLogin = async ({ email, password }: AdminLoginValues) => {
    setLoginError(null);
    try {
      const result = await login(email, password);
      // MFA disabled → login already set the session; the gate re-renders to
      // the console. Only advance to the TOTP step when the backend asks.
      if (result.mfaRequired) {
        setDigits(Array(6).fill(""));
        setMode("mfa");
      }
    } catch (error) {
      const message = errorMessage(error, "Sign-in failed.");
      setLoginError(message);
      toast(message, "error");
    }
  };

  async function submitMfa(code: string) {
    setMfaBusy(true);
    setMfaError(false);
    try {
      await verifyMfa(code); // success re-renders the gate to the console
    } catch (error) {
      setMfaError(true);
      setDigits(Array(6).fill(""));
      toast(errorMessage(error, "Verification failed."), "error");
      setTimeout(() => digitInputs.current[0]?.focus(), 50);
    } finally {
      setMfaBusy(false);
    }
  }

  function onDigitChange(index: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setMfaError(false);
    if (digit && index < 5) digitInputs.current[index + 1]?.focus();
    if (next.join("").length === 6) void submitMfa(next.join(""));
  }

  function onDigitKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      digitInputs.current[index - 1]?.focus();
    }
  }

  if (mode === "denied") {
    return (
      <Stage>
        <div className="text-center">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-lg bg-[#FDECEA] text-danger">
            <Icon.lock size={26} />
          </span>
          <h1 className="mb-1.5 text-2xl font-bold">Access denied</h1>
          <p className="mb-4.5 text-sm leading-relaxed text-muted">
            The admin console can only be reached from an approved office network or VPN.
          </p>
          <div className="mb-4.5 rounded-md border border-line bg-canvas p-3.5 text-left">
            {[
              ["Your IP", "102.89.34.117"],
              ["Network", "Unrecognised"],
              ["Required", "Office / VPN"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between py-0.75 text-xs">
                <span className="text-muted">{label}</span>
                <span className="font-semibold">{value}</span>
              </div>
            ))}
          </div>
          <Button full variant="secondary" size="lg" onClick={() => setMode("login")}>
            Back to sign in
          </Button>
          <p className="mt-3.5 text-xs text-muted">This attempt has been logged. Contact IT to request access.</p>
        </div>
      </Stage>
    );
  }

  if (mode === "mfa") {
    return (
      <Stage>
        <button
          onClick={() => setMode("login")}
          className="mb-3.5 inline-flex items-center gap-1 text-sm font-semibold text-muted"
        >
          <Icon.chevL size={16} />
          Back
        </button>
        <span className="mb-3.5 grid h-11.5 w-11.5 place-items-center rounded-xl bg-primary-tint text-primary-strong">
          <Icon.shieldCheck size={22} />
        </span>
        <h1 className="mb-1.5 text-xl font-bold">Two-factor authentication</h1>
        <p className="mb-4.5 text-sm text-muted">Enter the 6-digit code from your authenticator app.</p>
        <div className={cx("mb-3.5 flex gap-2", mfaError && "ed-shake")}>
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(element) => {
                digitInputs.current[index] = element;
              }}
              value={digit}
              onChange={(event) => onDigitChange(index, event.target.value)}
              onKeyDown={(event) => onDigitKeyDown(index, event)}
              inputMode="numeric"
              maxLength={1}
              aria-label={`Digit ${index + 1}`}
              className={cx(
                "h-14 w-12 rounded-md border-[1.5px] text-center text-2xl font-bold text-ink outline-none",
                mfaError ? "border-danger" : digit ? "border-primary-accent" : "border-line",
              )}
            />
          ))}
        </div>
        {mfaError && (
          <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-danger">
            <Icon.alert size={14} />
            Invalid code. Try again.
          </div>
        )}
        <Button full size="lg" busy={mfaBusy} onClick={() => submitMfa(digits.join(""))} disabled={digits.join("").length !== 6}>
          Verify &amp; continue
        </Button>
      </Stage>
    );
  }

  return (
    <Stage>
      <Brand />
      <h1 className="mb-1 text-2xl font-bold">Sign in</h1>
      <p className="mb-5 text-sm text-muted">Staff access to the Edifice admin console.</p>
      <form onSubmit={handleSubmit(onLogin)} noValidate>
        <Field label="Work email" htmlFor="admin-email" error={errors.email?.message}>
          <Input
            id="admin-email"
            type="email"
            leftIcon={<Icon.mail size={16} />}
            placeholder="name@edifice.ng"
            autoComplete="email"
            error={!!errors.email}
            {...register("email")}
          />
        </Field>
        <Field label="Password" htmlFor="admin-password" error={errors.password?.message}>
          <Input
            id="admin-password"
            type={showPassword ? "text" : "password"}
            leftIcon={<Icon.lock size={16} />}
            placeholder="••••••••"
            autoComplete="current-password"
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
        {loginError && (
          <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-danger">
            <Icon.alert size={14} />
            {loginError}
          </div>
        )}
        <Button full size="lg" type="submit" busy={isSubmitting}>
          Sign in
        </Button>
      </form>
      <button
        onClick={() => setMode("denied")}
        className="mt-4 w-full text-xs font-semibold text-muted"
      >
        Not on the office network?
      </button>
    </Stage>
  );
}
