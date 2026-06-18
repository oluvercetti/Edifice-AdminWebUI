"use client";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, PageHead, RoleBadge } from "@/components/admin/primitives";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Pill } from "@/components/ui/Pill";
import { Icon } from "@/components/icons";
import { MfaSetup } from "@/components/MfaSetup";
import { ApiError } from "@/lib/api/http";
import {
  changeAdminPassword,
  disableMfa,
  updateAdminProfile,
} from "@/lib/api/client";
import { logout } from "@/lib/auth";
import { useAdminStore, type AdminRole } from "@/stores/admin-store";
import {
  changePasswordSchema,
  type ChangePasswordValues,
} from "@/lib/schemas";
import { useToast } from "@/providers/ToastProvider";

// ============================================================
// Account & security — self-service profile, password, and MFA. Reached from
// the Shell account menu.
// ============================================================

function SettingsCard({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <div className="mb-4">
        <h2 className="m-0 text-base font-bold tracking-[-.01em] text-ink">
          {title}
        </h2>
        {desc && <p className="mt-1 mb-0 text-sm text-muted">{desc}</p>}
      </div>
      {children}
    </Card>
  );
}

function ProfileSection() {
  const toast = useToast();
  const admin = useAdminStore((s) => s.admin);
  const setAdmin = useAdminStore((s) => s.setAdmin);
  const [name, setName] = useState(admin?.name ?? "");
  const [busy, setBusy] = useState(false);
  if (!admin) return null;
  const dirty = name.trim().length > 0 && name.trim() !== admin.name;

  const save = async () => {
    setBusy(true);
    try {
      setAdmin(await updateAdminProfile(name.trim()));
      toast("Profile updated");
    } catch (error) {
      toast(
        error instanceof ApiError ? error.message : "Couldn’t update profile.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsCard title="Profile" desc="Your details across the console.">
      <Field label="Name">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          leftIcon={<Icon.user size={16} />}
        />
      </Field>
      <Field label="Email" hint="Email is your sign-in identity and can’t be changed here.">
        <Input value={admin.email} disabled leftIcon={<Icon.mail size={16} />} />
      </Field>
      <div className="mb-4">
        <div className="mb-1.5 text-xs font-semibold text-ink">Roles</div>
        <div className="flex flex-wrap gap-1.5">
          {admin.roles.map((role) => (
            <RoleBadge key={role} role={role as AdminRole} size="sm" />
          ))}
        </div>
      </div>
      <Button onClick={() => void save()} busy={busy} disabled={!dirty}>
        Save changes
      </Button>
    </SettingsCard>
  );
}

function PasswordSection() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    mode: "onTouched",
  });

  const onSubmit = handleSubmit(async (values) => {
    setBusy(true);
    try {
      await changeAdminPassword(values.currentPassword, values.newPassword);
      toast("Password changed — please sign in again", "success");
      // The server revoked all sessions; logout() hard-redirects to sign-in.
      await logout();
    } catch (error) {
      toast(
        error instanceof ApiError ? error.message : "Couldn’t change password.",
        "error",
      );
      setBusy(false);
    }
  });

  return (
    <SettingsCard
      title="Password"
      desc="Changing your password signs you out of all sessions."
    >
      <form onSubmit={onSubmit} noValidate>
        <Field label="Current password" error={errors.currentPassword?.message}>
          <Input
            type="password"
            leftIcon={<Icon.lock size={16} />}
            error={!!errors.currentPassword}
            {...register("currentPassword")}
          />
        </Field>
        <Field label="New password" error={errors.newPassword?.message}>
          <Input
            type="password"
            leftIcon={<Icon.lock size={16} />}
            placeholder="At least 8 characters"
            error={!!errors.newPassword}
            {...register("newPassword")}
          />
        </Field>
        <Field label="Confirm new password" error={errors.confirm?.message}>
          <Input
            type="password"
            leftIcon={<Icon.lock size={16} />}
            error={!!errors.confirm}
            {...register("confirm")}
          />
        </Field>
        <Button type="submit" busy={busy}>
          Change password
        </Button>
      </form>
    </SettingsCard>
  );
}

function MfaSection() {
  const toast = useToast();
  const admin = useAdminStore((s) => s.admin);
  const setAdmin = useAdminStore((s) => s.setAdmin);
  const [enrolling, setEnrolling] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  if (!admin) return null;

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

  return (
    <SettingsCard
      title="Two-factor authentication"
      desc="Protect your sign-in with a one-time code from an authenticator app."
    >
      {admin.mfaEnabled ? (
        <>
          <div className="mb-4 flex items-center gap-2">
            <Pill color="var(--success)" background="#E6F3EC" icon="check">
              Enabled
            </Pill>
            <span className="text-sm text-muted">
              A code is required at every sign-in.
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
            variant="outlineDanger"
            busy={busy}
            disabled={code.length !== 6}
            onClick={() => void disable()}
          >
            Disable MFA
          </Button>
        </>
      ) : enrolling ? (
        <MfaSetup
          onComplete={(updated) => {
            setAdmin(updated);
            setEnrolling(false);
            toast("MFA enabled");
          }}
        />
      ) : (
        <>
          <div className="mb-4 flex items-center gap-2">
            <Pill color="var(--muted)" background="var(--canvas)" icon="alert">
              Off
            </Pill>
          </div>
          <Button onClick={() => setEnrolling(true)}>Set up MFA</Button>
        </>
      )}
    </SettingsCard>
  );
}

export function AccountSettingsScreen() {
  return (
    <div>
      <PageHead
        title="Account &amp; security"
        sub="Manage your profile, password, and two-factor authentication."
      />
      <div className="flex max-w-180 flex-col gap-5">
        <ProfileSection />
        <PasswordSection />
        <MfaSection />
      </div>
    </div>
  );
}
