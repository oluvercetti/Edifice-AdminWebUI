"use client";
import { useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { AInput } from "@/components/admin/primitives";
import { ApiError } from "@/lib/api/http";
import { login, verifyMfa } from "@/lib/auth";

// ============================================================
// A0 — Admin authentication: login → TOTP MFA → console; plus access-denied.
// Distinct, internal-use framing on the brand-green stage.
// ============================================================

type Mode = "login" | "mfa" | "denied";

function Stage({ children }: { children: React.ReactNode }) {
  return (
    <div className="ed-auth-stage" style={{ minHeight: "100vh", display: "flex" }}>
      <div className="ed-auth-grid" style={{ flex: 1, display: "none" }} />
      <div style={{ display: "grid", placeItems: "center", width: "100%", padding: 24 }}>
        <div style={{ width: 420, maxWidth: "100%", background: "#fff", borderRadius: 18, boxShadow: "var(--sh-pop)", padding: 32 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
      <span style={{ width: 34, height: 34, borderRadius: 9, background: "var(--brand)", display: "grid", placeItems: "center", flex: "none" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M5 20V7l7-3.5L19 7v13" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M9 20v-4h6v4M9.5 9.5h5M9.5 13h5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </span>
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-.01em" }}>Edifice</div>
        <div style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 700, letterSpacing: ".05em" }}>ADMIN CONSOLE · INTERNAL USE</div>
      </div>
    </div>
  );
}

export function AuthScreens() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("tunde.b@edifice.ng");
  const [password, setPassword] = useState("Admin123!");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | undefined>();

  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [mfaError, setMfaError] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  async function submitLogin() {
    setBusy(true);
    setError(null);
    try {
      const result = await login(email, password);
      setDevCode(result.devCode);
      setDigits(Array(6).fill(""));
      setMode("mfa");
      setTimeout(() => inputs.current[0]?.focus(), 50);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function submitMfa(code: string) {
    setBusy(true);
    setMfaError(false);
    try {
      await verifyMfa(code);
      // On success the gate re-renders to the console.
    } catch {
      setMfaError(true);
      setDigits(Array(6).fill(""));
      setTimeout(() => inputs.current[0]?.focus(), 50);
    } finally {
      setBusy(false);
    }
  }

  function onDigit(i: number, v: string) {
    const ch = v.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = ch;
    setDigits(next);
    setMfaError(false);
    if (ch && i < 5) inputs.current[i + 1]?.focus();
    if (next.every((d) => d) && next.join("").length === 6) {
      void submitMfa(next.join(""));
    }
  }

  function onDigitKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
  }

  if (mode === "denied") {
    return (
      <Stage>
        <div style={{ textAlign: "center" }}>
          <span style={{ width: 56, height: 56, borderRadius: 14, background: "#FDECEA", color: "var(--danger)", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
            <Icon.lock size={26} />
          </span>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>Access denied</h1>
          <p style={{ fontSize: 13.5, color: "var(--muted)", margin: "0 0 18px", lineHeight: 1.5 }}>
            The admin console can only be reached from an approved office network or VPN.
          </p>
          <div style={{ border: "1px solid var(--line)", borderRadius: 10, background: "var(--canvas)", padding: 14, textAlign: "left", marginBottom: 18 }}>
            {[["Your IP", "102.89.34.117"], ["Network", "Unrecognised"], ["Required", "Office / VPN"]].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "3px 0" }}>
                <span style={{ color: "var(--muted)" }}>{k}</span>
                <span style={{ fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
          <Button full variant="secondary" size="lg" onClick={() => setMode("login")}>Back to sign in</Button>
          <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 14 }}>This attempt has been logged. Contact IT to request access.</p>
        </div>
      </Stage>
    );
  }

  if (mode === "mfa") {
    return (
      <Stage>
        <button onClick={() => setMode("login")} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 600, marginBottom: 14, padding: 0 }}>
          <Icon.chevL size={16} />Back
        </button>
        <span style={{ width: 46, height: 46, borderRadius: 12, background: "var(--primary-tint)", color: "var(--primary-strong)", display: "grid", placeItems: "center", marginBottom: 14 }}>
          <Icon.shieldCheck size={22} />
        </span>
        <h1 style={{ fontSize: 21, fontWeight: 700, margin: "0 0 6px" }}>Two-factor authentication</h1>
        <p style={{ fontSize: 13.5, color: "var(--muted)", margin: "0 0 18px" }}>
          Enter the 6-digit code from your authenticator app.
        </p>
        <div className={mfaError ? "ed-shake" : ""} style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { inputs.current[i] = el; }}
              value={d}
              onChange={(e) => onDigit(i, e.target.value)}
              onKeyDown={(e) => onDigitKey(i, e)}
              inputMode="numeric"
              maxLength={1}
              style={{
                width: 48, height: 56, textAlign: "center", fontSize: 22, fontWeight: 700, fontFamily: "var(--font)",
                borderRadius: 10, border: `1.5px solid ${mfaError ? "var(--danger)" : d ? "var(--primary-accent)" : "var(--line)"}`,
                outline: "none", color: "var(--ink)",
              }}
            />
          ))}
        </div>
        {mfaError && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--danger)", fontSize: 12.5, fontWeight: 600, marginBottom: 12 }}>
            <Icon.alert size={14} />Invalid code. Try again.
          </div>
        )}
        {devCode && (
          <div style={{ fontSize: 12, color: "var(--muted)", background: "var(--canvas)", border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px", marginBottom: 14 }}>
            Dev hint — current code: <strong style={{ color: "var(--ink)" }}>{devCode}</strong>
          </div>
        )}
        <Button full size="lg" busy={busy} onClick={() => submitMfa(digits.join(""))} disabled={digits.join("").length !== 6}>
          Verify &amp; continue
        </Button>
      </Stage>
    );
  }

  return (
    <Stage>
      <Brand />
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>Sign in</h1>
      <p style={{ fontSize: 13.5, color: "var(--muted)", margin: "0 0 20px" }}>Staff access to the Edifice admin console.</p>
      <form onSubmit={(e) => { e.preventDefault(); void submitLogin(); }}>
        <div style={{ marginBottom: 14 }}>
          <AInput value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Work email" leftIcon={<Icon.mail size={16} />} width="100%" style={{ height: 44 }} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <AInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            type={showPw ? "text" : "password"}
            leftIcon={<Icon.lock size={16} />}
            width="100%"
            style={{ height: 44 }}
            rightSlot={
              <button type="button" onClick={() => setShowPw((s) => !s)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--muted)", padding: "0 10px", display: "flex" }}>
                {showPw ? <Icon.eyeOff size={16} /> : <Icon.eye size={16} />}
              </button>
            }
          />
        </div>
        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--danger)", fontSize: 12.5, fontWeight: 600, margin: "6px 0 12px" }}>
            <Icon.alert size={14} />{error}
          </div>
        )}
        <div style={{ marginTop: 14 }}>
          <Button full size="lg" type="submit" busy={busy}>Sign in</Button>
        </div>
      </form>
      <button onClick={() => setMode("denied")} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--muted)", fontSize: 12.5, fontWeight: 600, marginTop: 16, width: "100%" }}>
        Not on the office network?
      </button>
    </Stage>
  );
}
