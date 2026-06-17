"use client";
import { useState } from "react";
import { Card, AInput, PageHead, RoleBadge } from "@/components/admin/primitives";
import { Button } from "@/components/ui/Button";
import { Skeleton, EmptyState, ErrorState } from "@/components/ui/feedback";
import { Icon } from "@/components/icons";
import { shortDateTime } from "@/lib/txn";
import { useAudit } from "@/lib/api/queries";
import { useScreenState } from "@/lib/api/use-resource";
import { useToast } from "@/providers/ToastProvider";
import { ROLES } from "@/lib/roles";
import { cx } from "@/lib/cx";
import type { AdminRole } from "@/stores/admin-store";
import type { AuditEntry } from "@/lib/api/types";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

function AuditRow({
  entry,
  first,
  open,
  onToggle,
}: {
  entry: AuditEntry;
  first: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const roleColor = entry.role ? ROLES[entry.role as AdminRole].color : "var(--muted)";
  const label = entry.actor ?? "System";

  return (
    <div className={cx(!first && "border-t border-[#EEF1EF]")}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3.5 px-4.5 py-3.25 text-left transition-colors hover:bg-canvas"
      >
        <span
          className="grid h-8.5 w-8.5 flex-none place-items-center rounded-md text-xs font-bold"
          style={{ background: `${roleColor}14`, color: roleColor }}
        >
          {initials(label)}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm">
            <span className="font-bold">{label}</span>{" "}
            <span className="text-muted">{entry.action}</span>
          </span>
          <span className="block truncate text-xs text-muted">{entry.entity}</span>
        </span>

        {entry.role && <RoleBadge role={entry.role as AdminRole} size="sm" />}

        <span className="w-24 flex-none text-right font-mono text-xs text-muted">
          {shortDateTime(entry.at)}
        </span>

        <Icon.chevD
          size={16}
          className={cx("flex-none text-muted transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="pr-4.5 pb-4 pl-17">
          <div className="mb-2 text-xs font-bold tracking-[.06em] text-muted uppercase">
            Before → After
          </div>
          {entry.diff.length === 0 ? (
            <div className="text-xs text-muted">No field-level changes recorded.</div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-line">
              {entry.diff.map((field, index) => (
                <div
                  key={field.field}
                  className={cx(
                    "flex items-center gap-2.5 px-3 py-2.25 text-xs",
                    index > 0 && "border-t border-[#EEF1EF]",
                  )}
                >
                  <span className="w-32 flex-none font-mono text-muted">{field.field}</span>
                  <span className="text-danger line-through opacity-70">{field.from}</span>
                  <Icon.arrowR size={14} className="flex-none text-muted" />
                  <span className="font-bold text-success">{field.to}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AuditScreen() {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const { state, data, retry } = useScreenState(useAudit(), {
    isEmpty: (d) => d.length === 0,
  });

  const entries = data ?? [];
  const term = query.trim().toLowerCase();
  const filtered = term
    ? entries.filter((entry) =>
        [entry.actor, entry.action, entry.entity]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLowerCase().includes(term)),
      )
    : entries;

  return (
    <div>
      <PageHead
        title="Audit log"
        sub="Immutable record of every admin action and system state change."
        actions={
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Icon.download size={15} />}
            onClick={() => toast("Audit log exported")}
          >
            Export
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-1.5 text-xs text-muted">
        <Icon.lock size={13} />
        Read-only by definition
      </div>

      <div className="mb-4">
        <AInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          width={300}
          leftIcon={<Icon.search size={15} />}
          placeholder="Search actor, action, entity…"
          ariaLabel="Search audit log"
        />
      </div>

      {state === "loading" && (
        <Card pad={0}>
          <div className="flex flex-col gap-3 p-4.5">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3.5">
                <Skeleton width={34} height={34} radius={8} />
                <div className="flex-1">
                  <Skeleton width="40%" height={13} />
                  <Skeleton width="60%" height={11} style={{ marginTop: 6 }} />
                </div>
                <Skeleton width={72} height={12} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {state === "error" && <ErrorState onRetry={retry} />}

      {state === "empty" && (
        <Card pad={0}>
          <EmptyState icon="doc" title="No audit entries yet" />
        </Card>
      )}

      {state === "ready" && (
        <Card pad={0}>
          {filtered.length === 0 ? (
            <EmptyState icon="doc" title="No matching entries" />
          ) : (
            filtered.map((entry, index) => (
              <AuditRow
                key={entry.id}
                entry={entry}
                first={index === 0}
                open={openId === entry.id}
                onToggle={() => setOpenId((current) => (current === entry.id ? null : entry.id))}
              />
            ))
          )}
        </Card>
      )}
    </div>
  );
}
