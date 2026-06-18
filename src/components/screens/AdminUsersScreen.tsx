"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  Table,
  Modal,
  PageHead,
  Toggle,
  RoleBadge,
  type Column,
} from "@/components/admin/primitives";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Skeleton, EmptyState, ErrorState } from "@/components/ui/feedback";
import { Icon } from "@/components/icons";
import { Field, Input } from "@/components/ui/Field";
import { cx } from "@/lib/cx";
import { shortDateTime } from "@/lib/txn";
import {
  useAdminUsers,
  useInviteAdmin,
  useResendAdminInvite,
  useUpdateAdmin,
} from "@/lib/api/queries";
import { useScreenState } from "@/lib/api/use-resource";
import { useToast } from "@/providers/ToastProvider";
import { ApiError } from "@/lib/api/http";
import type { AdminUserRow } from "@/lib/api/types";
import type { AdminRole } from "@/stores/admin-store";
import { ROLES } from "@/lib/roles";
import {
  inviteAdminSchema,
  type InviteAdminValues,
  ADMIN_ROLE_OPTIONS,
} from "@/lib/schemas";

// ============================================================
// PRD A9 — Admin users. SUPER-only console-access management: invite admins,
// assign least-privilege roles, enforce MFA, and suspend / reinstate access.
// This screen is nav-gated to SUPER, so there's no read-only handling here.
// ============================================================

/** Initials from a person's name, max 2 characters. */
function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AdminUsersScreen() {
  const { state, data, retry } = useScreenState<AdminUserRow[]>(useAdminUsers(), {
    isEmpty: (rows) => rows.length === 0,
  });

  const admins = data ?? [];

  // The invite/edit modal is open when either flag is set.
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUserRow | null>(null);

  const openInvite = () => {
    setEditing(null);
    setInviteOpen(true);
  };
  const close = () => {
    setInviteOpen(false);
    setEditing(null);
  };

  const columns: Column<AdminUserRow>[] = [
    {
      key: "admin",
      label: "Admin",
      w: 230,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <span className="grid h-8.5 w-8.5 flex-none place-items-center rounded-md bg-brand text-xs font-bold text-white">
            {initialsOf(row.name)}
          </span>
          <div className="min-w-0">
            <div className="truncate font-bold text-ink">{row.name}</div>
            <div className="truncate text-xs text-muted">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: "roles",
      label: "Roles",
      w: 220,
      render: (row) => (
        <div className="flex flex-wrap gap-1.5">
          {row.roles.map((role) => (
            <RoleBadge key={role} role={role as AdminRole} size="sm" />
          ))}
        </div>
      ),
    },
    {
      key: "mfa",
      label: "MFA",
      w: 90,
      render: (row) => (
        <Pill
          color={row.mfaEnabled ? "var(--success)" : "var(--danger)"}
          background={row.mfaEnabled ? "#E6F3EC" : "#FDECEA"}
          icon={row.mfaEnabled ? "check" : "alert"}
        >
          {row.mfaEnabled ? "On" : "Off"}
        </Pill>
      ),
    },
    {
      key: "status",
      label: "Status",
      w: 130,
      render: (row) =>
        row.pending ? (
          <Pill color="var(--muted)" background="var(--canvas)" icon="mail">
            Invite pending
          </Pill>
        ) : (
          <Pill status={row.status === "ACTIVE" ? "Active" : "Suspended"} />
        ),
    },
    {
      key: "lastActive",
      label: "Last active",
      w: 130,
      render: (row) => (
        <span className="text-muted">
          {row.lastActive ? shortDateTime(row.lastActive) : "—"}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHead
        title="Admin users"
        sub="Manage console access. Assign least-privilege roles and enforce MFA."
        actions={
          <Button leftIcon={<Icon.plus size={16} />} onClick={openInvite}>
            Invite admin
          </Button>
        }
      />

      {state === "loading" && <Skeleton height={440} />}

      {state === "error" && (
        <Card>
          <ErrorState onRetry={retry} />
        </Card>
      )}

      {state === "empty" && (
        <Card>
          <EmptyState
            icon="shield"
            title="No admins yet"
            body="Invite a teammate to grant console access."
            action={
              <Button leftIcon={<Icon.plus size={16} />} onClick={openInvite}>
                Invite admin
              </Button>
            }
          />
        </Card>
      )}

      {state === "ready" && (
        <Card pad={0}>
          <Table
            columns={columns}
            rows={admins}
            activeId={editing?.id ?? null}
            onRowClick={(row) => {
              setInviteOpen(false);
              setEditing(row);
            }}
            empty={<EmptyState icon="shield" title="No admins" />}
          />
        </Card>
      )}

      <AdminModal
        open={inviteOpen || editing != null}
        editing={editing}
        onClose={close}
      />
    </div>
  );
}

function AdminModal({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  editing: AdminUserRow | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const invite = useInviteAdmin();
  const update = useUpdateAdmin();
  const resend = useResendAdminInvite();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InviteAdminValues>({
    resolver: zodResolver(inviteAdminSchema),
    defaultValues: editing
      ? {
          email: editing.email,
          name: editing.name,
          roles: editing.roles as InviteAdminValues["roles"],
          mfaEnabled: editing.mfaEnabled,
        }
      : { email: "", name: "", roles: [], mfaEnabled: false },
  });

  // Re-seed the form whenever the modal target changes (invite ⇄ edit ⇄ row).
  useEffect(() => {
    reset(
      editing
        ? {
            email: editing.email,
            name: editing.name,
            roles: editing.roles as InviteAdminValues["roles"],
            mfaEnabled: editing.mfaEnabled,
          }
        : { email: "", name: "", roles: [], mfaEnabled: false },
    );
  }, [editing, reset]);

  const selectedRoles = watch("roles");
  const mfaEnabled = watch("mfaEnabled");

  const toggleRole = (value: InviteAdminValues["roles"][number]) => {
    const next = selectedRoles.includes(value)
      ? selectedRoles.filter((role) => role !== value)
      : [...selectedRoles, value];
    setValue("roles", next, { shouldValidate: true });
  };

  const onError = (error: unknown) =>
    toast(error instanceof ApiError ? error.message : "Failed", "error");

  const onSubmit = handleSubmit((values) => {
    if (editing) {
      update.mutate(
        {
          id: editing.id,
          body: {
            name: values.name,
            roles: values.roles,
            mfaEnabled: values.mfaEnabled,
          },
        },
        {
          onSuccess: () => {
            toast("Admin updated");
            onClose();
          },
          onError,
        },
      );
    } else {
      invite.mutate(values, {
        onSuccess: () => {
          toast("Invite sent");
          onClose();
        },
        onError,
      });
    }
  });

  const toggleStatus = () => {
    if (!editing) return;
    const nextStatus = editing.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    update.mutate(
      { id: editing.id, body: { status: nextStatus } },
      {
        onSuccess: () => {
          toast(nextStatus === "SUSPENDED" ? "Admin suspended" : "Admin reinstated");
          onClose();
        },
        onError,
      },
    );
  };

  const busy = editing ? update.isPending : invite.isPending;

  return (
    <Modal open={open} onClose={onClose} width={480}>
      <div className="p-5">
        <div className="mb-4 flex items-start justify-between">
          <h2 className="m-0 text-base font-bold tracking-[-.01em] text-ink">
            {editing ? `Edit ${editing.name}` : "Invite admin"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md bg-canvas text-muted"
            aria-label="Close"
          >
            <Icon.close size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <Field label="Name" error={errors.name?.message}>
            <Input
              leftIcon={<Icon.user size={16} />}
              placeholder="Full name"
              {...register("name")}
              error={!!errors.name}
            />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <Input
              leftIcon={<Icon.mail size={16} />}
              placeholder="name@edifice.ng"
              disabled={!!editing}
              {...register("email")}
              error={!!errors.email}
            />
          </Field>

          <div className="mb-4">
            <div className="mb-2 text-xs font-semibold text-ink">
              Roles ·{" "}
              <span className="font-medium text-muted">
                least-privilege — assign only what&apos;s needed
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {ADMIN_ROLE_OPTIONS.map((option) => {
                const selected = selectedRoles.includes(option.value);
                const color = ROLES[option.value].color;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleRole(option.value)}
                    className={cx(
                      "flex items-start gap-3 rounded-lg border p-3 text-left transition",
                      selected ? "bg-primary-tint" : "border-line bg-surface",
                    )}
                    style={selected ? { borderColor: color } : undefined}
                  >
                    <span
                      className={cx(
                        "mt-0.5 grid h-5 w-5 flex-none place-items-center rounded",
                        selected
                          ? "bg-primary-accent text-white"
                          : "border border-line",
                      )}
                    >
                      {selected && <Icon.check size={14} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-ink">
                        {option.label}
                      </span>
                      <span className="block text-xs text-muted">
                        Can access: {option.powers}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            {errors.roles && (
              <p className="mt-1.5 mb-0 text-xs font-medium text-danger">
                Assign at least one role.
              </p>
            )}
          </div>

          <div className="mb-4 flex items-center gap-3 rounded-lg border border-line p-3">
            <span className="grid h-9 w-9 flex-none place-items-center rounded-md bg-primary-tint text-primary-strong">
              <Icon.shieldCheck size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-ink">Require MFA</div>
              <div className="text-xs text-muted">
                Enforce TOTP at every sign-in
              </div>
            </div>
            <Toggle
              on={mfaEnabled}
              onChange={(value) => setValue("mfaEnabled", value)}
            />
          </div>

          <div className="mt-5 flex items-center justify-between gap-2.5">
            <div className="flex gap-2.5">
              {editing && editing.pending && (
                <Button
                  type="button"
                  variant="secondary"
                  busy={resend.isPending}
                  onClick={() =>
                    resend.mutate(editing.id, {
                      onSuccess: () => {
                        toast("Invite resent");
                        onClose();
                      },
                      onError,
                    })
                  }
                >
                  Resend invite
                </Button>
              )}
              {editing && (
                <Button
                  type="button"
                  variant={editing.status === "ACTIVE" ? "outlineDanger" : "secondary"}
                  busy={update.isPending}
                  onClick={toggleStatus}
                >
                  {editing.status === "ACTIVE" ? "Suspend" : "Reinstate"}
                </Button>
              )}
            </div>
            <div className="flex gap-2.5">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" busy={busy}>
                {editing ? "Save" : "Send invite"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
}
