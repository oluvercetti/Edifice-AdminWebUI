"use client";
import { useState, type ReactNode } from "react";
import {
  Card,
  Table,
  Drawer,
  Segmented,
  Chip,
  PageHead,
  type Column,
} from "@/components/admin/primitives";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Skeleton, EmptyState, ErrorState } from "@/components/ui/feedback";
import { Icon } from "@/components/icons";
import { cx } from "@/lib/cx";
import { useCases, useCaseAction } from "@/lib/api/queries";
import { useScreenState } from "@/lib/api/use-resource";
import { useToast } from "@/providers/ToastProvider";
import { useAdminStore } from "@/stores/admin-store";
import { isReadOnly } from "@/lib/roles";
import type { CaseRow } from "@/lib/api/types";

// ============================================================
// PRD A7 — Cases & complaints. A unified queue of investor complaints and
// flagged-transaction cases, with a triage drawer (assign / resolve).
// ============================================================

/** ISO → coarse relative age: "12m" / "3h" / "1d". */
function relativeAge(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

const TYPE_DOT: Record<string, string> = {
  Complaint: "#7A5AF8",
  "Flagged txn": "var(--danger)",
};

const PRIORITY_PILL: Record<string, { color: string; background: string }> = {
  High: { color: "var(--danger)", background: "#FDECEA" },
  Med: { color: "var(--warning)", background: "#FCF3D9" },
  Low: { color: "var(--muted)", background: "#EEF0F2" },
};

const STATUS_FLOW = ["Open", "Investigating", "Resolved"] as const;

/** Initials from a person/company name, max 2 characters. */
function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function CasesScreen() {
  const readOnly = isReadOnly(useAdminStore((state) => state.viewAs));
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { state, data, retry } = useScreenState<CaseRow[]>(useCases(), {
    isEmpty: (rows) => rows.length === 0,
  });

  const cases = data ?? [];
  const openCount = cases.filter((c) => c.status !== "Resolved").length;

  const rows = cases.filter((c) => {
    if (statusFilter !== "All" && c.status !== statusFilter) return false;
    if (typeFilter !== "All" && c.type !== typeFilter) return false;
    return true;
  });

  // Re-derive the selected case from the latest list so the drawer reflects
  // assign / resolve mutations as soon as they land.
  const selected = selectedId
    ? cases.find((c) => c.id === selectedId) ?? null
    : null;

  const columns: Column<CaseRow>[] = [
    {
      key: "id",
      label: "Case",
      w: 90,
      render: (c) => <span className="font-mono text-[12.5px] font-bold">{c.id}</span>,
    },
    {
      key: "type",
      label: "Type",
      w: 120,
      render: (c) => (
        <span className="inline-flex items-center gap-1.75 text-[12.5px] font-semibold text-ink">
          <span
            className="h-2 w-2 flex-none rounded-full"
            style={{ background: TYPE_DOT[c.type] ?? "var(--muted)" }}
          />
          {c.type}
        </span>
      ),
    },
    {
      key: "subject",
      label: "Subject",
      w: 260,
      wrap: true,
      render: (c) => <span className="text-ink">{c.subject}</span>,
    },
    {
      key: "investor",
      label: "Investor",
      w: 140,
      render: (c) => <span className="text-muted">{c.investor ?? "—"}</span>,
    },
    {
      key: "priority",
      label: "Priority",
      w: 96,
      render: (c) => {
        const meta = PRIORITY_PILL[c.priority] ?? PRIORITY_PILL.Low;
        return (
          <Pill color={meta.color} background={meta.background}>
            {c.priority}
          </Pill>
        );
      },
    },
    {
      key: "age",
      label: "Age",
      w: 64,
      render: (c) => <span className="text-muted">{relativeAge(c.createdAt)}</span>,
    },
    {
      key: "owner",
      label: "Owner",
      w: 80,
      render: (c) =>
        c.assignee ? (
          <span className="grid h-6.5 w-6.5 place-items-center rounded-full bg-primary-tint text-[11px] font-bold text-brand">
            {initialsOf(c.assignee)}
          </span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      key: "status",
      label: "Status",
      w: 116,
      render: (c) => <Pill status={c.status} />,
    },
  ];

  return (
    <div>
      <PageHead
        title="Cases & complaints"
        sub={`${openCount} open · unified queue of complaints and flagged-transaction cases.`}
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
            icon="inbox"
            title="No cases"
            body="Complaints and flagged-transaction cases will appear here."
          />
        </Card>
      )}

      {state === "ready" && (
        <div>
          {/* Toolbar */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Segmented
              size="sm"
              options={["All", "Open", "Investigating", "Resolved"]}
              value={statusFilter}
              onChange={setStatusFilter}
            />
            <span className="h-6 w-px bg-line" />
            <div className="flex gap-2">
              {(["All", "Complaint", "Flagged txn"] as const).map((type) => (
                <Chip
                  key={type}
                  active={typeFilter === type}
                  onClick={() => setTypeFilter(type)}
                >
                  {type}
                </Chip>
              ))}
            </div>
          </div>

          <Card pad={0}>
            <Table
              columns={columns}
              rows={rows}
              activeId={selectedId}
              onRowClick={(c) => setSelectedId(c.id)}
              empty={<EmptyState icon="inbox" title="No cases match these filters" />}
            />
          </Card>
        </div>
      )}

      <CaseDrawer
        caseRow={selected}
        readOnly={readOnly}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}

function CaseDrawer({
  caseRow,
  readOnly,
  onClose,
}: {
  caseRow: CaseRow | null;
  readOnly: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const caseAction = useCaseAction();

  const assign = () => {
    if (!caseRow) return;
    caseAction.mutate(
      { id: caseRow.id, action: "assign" },
      {
        onSuccess: () => toast("Assigned to you"),
        onError: () => toast("Couldn't assign case", "error"),
      },
    );
  };

  const resolve = () => {
    if (!caseRow) return;
    caseAction.mutate(
      { id: caseRow.id, action: "resolve" },
      {
        onSuccess: () => {
          toast("Case resolved");
          onClose();
        },
        onError: () => toast("Couldn't resolve case", "error"),
      },
    );
  };

  const reachedIndex = caseRow ? STATUS_FLOW.indexOf(caseRow.status as (typeof STATUS_FLOW)[number]) : -1;
  const priorityMeta = caseRow
    ? PRIORITY_PILL[caseRow.priority] ?? PRIORITY_PILL.Low
    : PRIORITY_PILL.Low;

  const footer =
    caseRow && !readOnly ? (
      <>
        {!caseRow.assignee && (
          <Button
            variant="secondary"
            size="sm"
            busy={caseAction.isPending}
            onClick={assign}
          >
            Assign to me
          </Button>
        )}
        {caseRow.status !== "Resolved" && (
          <Button
            variant="primary"
            size="sm"
            busy={caseAction.isPending}
            onClick={resolve}
          >
            Resolve case
          </Button>
        )}
      </>
    ) : caseRow ? (
      <div className="flex items-center gap-1.5 text-[12.5px] text-muted">
        <Icon.eye size={15} /> Read-only
      </div>
    ) : undefined;

  return (
    <Drawer
      open={caseRow != null}
      onClose={onClose}
      width={540}
      title={caseRow ? `${caseRow.id} · ${caseRow.type}` : ""}
      sub={caseRow?.subject}
      footer={footer}
    >
      {caseRow && (
        <div className="flex flex-col gap-5">
          {/* Status flow */}
          <div className="flex items-center">
            {STATUS_FLOW.map((step, index) => {
              const reached = reachedIndex >= index;
              return (
                <div key={step} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center gap-1.5">
                    <span
                      className={cx(
                        "grid h-7 w-7 place-items-center rounded-full",
                        reached
                          ? "bg-success text-white"
                          : "bg-canvas text-muted border border-line",
                      )}
                    >
                      {reached ? (
                        <Icon.check size={15} />
                      ) : (
                        <span className="h-1.75 w-1.75 rounded-full bg-current" />
                      )}
                    </span>
                    <span
                      className={cx(
                        "text-[11.5px] font-semibold",
                        reached ? "text-ink" : "text-muted",
                      )}
                    >
                      {step}
                    </span>
                  </div>
                  {index < STATUS_FLOW.length - 1 && (
                    <span
                      className={cx(
                        "mx-1 mb-5 h-px flex-1",
                        reachedIndex > index ? "bg-success" : "bg-line",
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Mini grid */}
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="Investor" value={caseRow.investor ?? "—"} />
            <MiniStat
              label="Priority"
              value={
                <Pill color={priorityMeta.color} background={priorityMeta.background}>
                  {caseRow.priority}
                </Pill>
              }
            />
          </div>

          {/* Activity */}
          <div>
            <div className="mb-2.5 text-[11.5px] font-bold tracking-[.04em] text-muted uppercase">
              Activity
            </div>
            <div className="flex flex-col gap-3">
              {caseRow.body && (
                <NoteCard
                  author="Investor"
                  age={relativeAge(caseRow.createdAt)}
                  body={caseRow.body}
                />
              )}
              {caseRow.assignee && (
                <NoteCard
                  author="System"
                  age={relativeAge(caseRow.createdAt)}
                  body={`Assigned to ${caseRow.assignee}`}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}

function MiniStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-md border border-line px-3 py-2.5">
      <div className="mb-1 text-[11px] font-semibold text-muted">{label}</div>
      <div className="text-[13.5px] font-bold text-ink">{value}</div>
    </div>
  );
}

function NoteCard({
  author,
  age,
  body,
}: {
  author: string;
  age: string;
  body: string;
}) {
  return (
    <div className="flex gap-3 rounded-lg border border-line bg-canvas px-3.5 py-3">
      <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-primary-tint text-brand">
        <Icon.user size={15} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-ink">{author}</span>
          <span className="text-[11.5px] text-muted">{age}</span>
        </div>
        <p className="mt-1 mb-0 text-[13px] leading-relaxed text-muted">{body}</p>
      </div>
    </div>
  );
}
