"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Skeleton, EmptyState, ErrorState } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/Field";
import { Icon } from "@/components/icons";
import {
  Card,
  Table,
  Drawer,
  Modal,
  Segmented,
  Chip,
  Toggle,
  Severity,
  TypeBadge,
  PageHead,
  type Column,
} from "@/components/admin/primitives";
import { cx } from "@/lib/cx";
import { fmtNGN } from "@/lib/money";
import { clockTime, shortDateTime, TXN_TYPES } from "@/lib/txn";
import {
  useTransactions,
  useFlags,
  useRules,
  useUpdateFlag,
  useUpdateRule,
} from "@/lib/api/queries";
import { useScreenState } from "@/lib/api/use-resource";
import { useToast } from "@/providers/ToastProvider";
import { useAdminStore } from "@/stores/admin-store";
import { isReadOnly } from "@/lib/roles";
import { ruleEditSchema, type RuleEditValues } from "@/lib/schemas";
import type { Txn, Flag, Rule } from "@/lib/api/types";

// ============================================================
// Transactions / monitoring (PRD A3) — live feed, review queue, rules.
// ============================================================

const SEVERITY_COLOR: Record<string, string> = {
  high: "#D92D20",
  med: "#E0A800",
  low: "#5F6368",
};

/** ISO → coarse relative age: "12m" / "3h" / "1d". */
function relativeAge(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

type Tab = "Live feed" | "Flags" | "Rules";

export function MonitoringScreen() {
  const readOnly = isReadOnly(useAdminStore((state) => state.viewAs));
  const [tab, setTab] = useState<Tab>("Live feed");

  return (
    <div>
      <PageHead
        title="Transactions"
        sub="Real-time monitoring across every money movement."
      />
      <div className="mb-5">
        <Segmented
          size="sm"
          options={["Live feed", "Flags", "Rules"]}
          value={tab}
          onChange={(value) => setTab(value as Tab)}
        />
      </div>

      {tab === "Live feed" && <LiveFeedPanel />}
      {tab === "Flags" && <FlagsPanel readOnly={readOnly} />}
      {tab === "Rules" && <RulesPanel readOnly={readOnly} />}
    </div>
  );
}

// ------------------------------------------------------------
// PANEL 1 — Live feed
// ------------------------------------------------------------

function LiveFeedPanel() {
  const [streaming, setStreaming] = useState(true);
  const [typeTab, setTypeTab] = useState("All");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [selected, setSelected] = useState<Txn | null>(null);

  const type = typeTab === "All" ? undefined : typeTab;
  const query = useTransactions(
    { type, flaggedOnly },
    { refetchInterval: streaming ? 4000 : undefined },
  );
  const { state, data, retry } = useScreenState<Txn[]>(query, {
    isEmpty: (rows) => rows.length === 0,
  });

  const flagsQuery = useFlags();
  const flags = flagsQuery.data ?? [];
  const severityCount = (level: Flag["severity"]) =>
    flags.filter((flag) => flag.severity === level).length;

  const rows = data ?? [];
  const flaggedCount = rows.filter((row) => row.flagged).length;

  const columns: Column<Txn>[] = [
    {
      key: "time",
      label: "Time",
      w: 90,
      render: (row) => (
        <span className="text-muted [font-variant-numeric:tabular-nums]">
          {clockTime(row.occurredAt)}
        </span>
      ),
    },
    {
      key: "id",
      label: "Txn",
      w: 96,
      render: (row) => (
        <span className="font-mono text-xs font-bold">{row.id}</span>
      ),
    },
    {
      key: "type",
      label: "Type",
      w: 128,
      render: (row) => <TypeBadge map={TXN_TYPES} value={row.type} />,
    },
    {
      key: "amount",
      label: "Amount",
      w: 124,
      align: "right",
      render: (row) => <span className="font-bold">{fmtNGN(row.amount)}</span>,
    },
    {
      key: "project",
      label: "Project",
      w: 170,
      render: (row) => <span className="text-muted">{row.project ?? "—"}</span>,
    },
    {
      key: "party",
      label: "Counterparty",
      render: (row) => row.party ?? "—",
    },
    {
      key: "status",
      label: "Status",
      w: 96,
      render: (row) => <Pill status={row.status} />,
    },
    {
      key: "flag",
      label: "Flag",
      w: 44,
      align: "center",
      render: (row) =>
        row.flagged ? (
          <Icon.flag size={15} color={SEVERITY_COLOR[row.severity ?? "low"]} />
        ) : null,
    },
  ];

  return (
    <div>
      {/* Flag strip */}
      <div className="mb-4.5 grid grid-cols-4 gap-3.5">
        <SeverityCell
          value={severityCount("high")}
          label="High-severity flags"
          color={SEVERITY_COLOR.high}
        />
        <SeverityCell
          value={severityCount("med")}
          label="Medium-severity flags"
          color={SEVERITY_COLOR.med}
        />
        <SeverityCell
          value={severityCount("low")}
          label="Low-severity flags"
          color={SEVERITY_COLOR.low}
        />
        <StreamCell
          streaming={streaming}
          count={rows.length}
          onToggle={() => setStreaming((value) => !value)}
        />
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented
          size="sm"
          options={["All", "Pay-in", "Escrow hold", "Disbursement"]}
          value={typeTab}
          onChange={setTypeTab}
        />
        <Chip
          icon="flag"
          active={flaggedOnly}
          onClick={() => setFlaggedOnly((value) => !value)}
          count={flaggedCount}
        >
          Flagged only
        </Chip>
      </div>

      {state === "loading" && <Skeleton height={420} />}
      {state === "error" && (
        <Card>
          <ErrorState onRetry={retry} />
        </Card>
      )}
      {state === "empty" && (
        <Card>
          <EmptyState icon="pulse" title="No transactions in range" />
        </Card>
      )}
      {state === "ready" && (
        <Card pad={0}>
          <Table
            dense
            columns={columns}
            rows={rows}
            onRowClick={setSelected}
            rowStyle={(row) =>
              row.flagged
                ? {
                    background: "#FEF6F5",
                    boxShadow: `inset 3px 0 0 ${SEVERITY_COLOR[row.severity ?? "low"]}`,
                  }
                : {}
            }
          />
        </Card>
      )}

      <TxnDrawer txn={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function SeverityCell({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  return (
    <Card>
      <div className="text-3xl font-extrabold tracking-[-.02em]" style={{ color }}>
        {value}
      </div>
      <div className="mt-1 text-xs font-semibold text-muted">{label}</div>
    </Card>
  );
}

function StreamCell({
  streaming,
  count,
  onToggle,
}: {
  streaming: boolean;
  count: number;
  onToggle: () => void;
}) {
  return (
    <div
      className={cx(
        "flex flex-col justify-between rounded-xl border border-line px-4.5 py-4 shadow-1",
        !streaming && "bg-surface",
      )}
      style={streaming ? { background: "#0D1F17" } : undefined}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={cx(
              "h-2.25 w-2.25 flex-none rounded-full",
              streaming ? "animate-[ed-pulse_1.6s_infinite] bg-[#3FCF8E]" : "bg-[#CDD4D0]",
            )}
          />
          <span
            className={cx(
              "text-sm font-bold",
              streaming ? "text-white" : "text-ink",
            )}
          >
            {streaming ? "Streaming" : "Paused"}
          </span>
        </div>
        <button
          onClick={onToggle}
          className={cx(
            "grid h-7 w-7 cursor-pointer place-items-center rounded-sm border-none",
            streaming ? "bg-white/12 text-white" : "bg-canvas text-muted",
          )}
          title={streaming ? "Pause stream" : "Resume stream"}
        >
          {streaming ? <Icon.lock size={14} /> : <Icon.refresh size={14} />}
        </button>
      </div>
      <div
        className={cx(
          "mt-2.5 text-xs font-semibold",
          streaming ? "text-white/70" : "text-muted",
        )}
      >
        {count} in view
      </div>
    </div>
  );
}

function TxnDrawer({ txn, onClose }: { txn: Txn | null; onClose: () => void }) {
  return (
    <Drawer
      open={txn != null}
      onClose={onClose}
      width={480}
      title={txn ? `Transaction ${txn.id}` : ""}
      sub={txn ? `${txn.type} · ${txn.status}` : ""}
    >
      {txn && (
        <div className="flex flex-col gap-4.5">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-canvas p-4">
            <div className="ngn text-2xl font-extrabold tracking-[-.02em]">
              {fmtNGN(txn.amount)}
            </div>
            <TypeBadge map={TXN_TYPES} value={txn.type} />
          </div>

          <div className="flex flex-col">
            <DetailRow label="Counterparty" value={txn.party ?? "—"} />
            <DetailRow label="Project" value={txn.project ?? "—"} />
            <DetailRow label="Status" value={<Pill status={txn.status} />} />
            <DetailRow label="When" value={shortDateTime(txn.occurredAt)} />
          </div>

          {txn.flagged && (
            <div className="flex items-center gap-2.5 rounded-md border border-[#F4C4BF] bg-[#FDECEA] px-3.5 py-3 text-danger">
              <Icon.flag size={16} color={SEVERITY_COLOR[txn.severity ?? "low"]} />
              <span className="text-sm font-bold">
                {txn.severity === "high"
                  ? "High"
                  : txn.severity === "med"
                    ? "Medium"
                    : "Low"}{" "}
                severity flag
              </span>
            </div>
          )}

          <div>
            <div className="mb-2 text-xs font-bold tracking-[.04em] text-muted uppercase">
              Ledger entries
            </div>
            <div className="overflow-hidden rounded-md border border-line">
              <LedgerRow label="Debit — Escrow" amount={fmtNGN(txn.amount)} border />
              <LedgerRow
                label={`Credit — ${txn.party ?? "Counterparty"}`}
                amount={fmtNGN(txn.amount)}
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Icon.eye size={14} /> Read-only — transactions are immutable.
          </div>
        </div>
      )}
    </Drawer>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-[#EEF1EF] py-2.5 text-sm">
      <span className="font-semibold text-muted">{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}

function LedgerRow({
  label,
  amount,
  border,
}: {
  label: string;
  amount: string;
  border?: boolean;
}) {
  return (
    <div
      className={cx(
        "flex items-center justify-between px-3.5 py-2.75 text-sm",
        border && "border-b border-line",
      )}
    >
      <span className="font-semibold text-ink">{label}</span>
      <span className="ngn font-bold">{amount}</span>
    </div>
  );
}

// ------------------------------------------------------------
// PANEL 2 — Flags / review queue
// ------------------------------------------------------------

function FlagsPanel({ readOnly }: { readOnly: boolean }) {
  const [statusTab, setStatusTab] = useState("All");
  const [severity, setSeverity] = useState("All");
  const [selected, setSelected] = useState<Flag | null>(null);

  const query = useFlags();
  const { state, data, retry } = useScreenState<Flag[]>(query, {
    isEmpty: (rows) => rows.length === 0,
  });

  const allFlags = data ?? [];
  const rows = allFlags.filter((flag) => {
    if (statusTab !== "All" && flag.status !== statusTab) return false;
    if (severity !== "All" && flag.severity !== severity) return false;
    return true;
  });

  const columns: Column<Flag>[] = [
    {
      key: "severity",
      label: "Severity",
      w: 110,
      render: (flag) => <Severity level={flag.severity} />,
    },
    { key: "rule", label: "Rule", w: 240, render: (flag) => flag.rule },
    {
      key: "txn",
      label: "Transaction",
      w: 110,
      render: (flag) => <span className="font-bold">{flag.txn ?? "—"}</span>,
    },
    {
      key: "project",
      label: "Project",
      w: 150,
      render: (flag) => <span className="text-muted">{flag.project ?? "—"}</span>,
    },
    {
      key: "amount",
      label: "Amount",
      w: 120,
      align: "right",
      render: (flag) => (flag.amount != null ? fmtNGN(flag.amount) : "—"),
    },
    {
      key: "age",
      label: "Age",
      w: 70,
      render: (flag) => <span className="text-muted">{relativeAge(flag.createdAt)}</span>,
    },
    {
      key: "status",
      label: "Status",
      w: 116,
      render: (flag) => <Pill status={flag.status} />,
    },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented
          size="sm"
          options={["All", "Open", "Investigating", "Resolved"]}
          value={statusTab}
          onChange={setStatusTab}
        />
        <div className="flex gap-2">
          {(
            [
              ["All", "All"],
              ["high", "High"],
              ["med", "Medium"],
              ["low", "Low"],
            ] as const
          ).map(([value, label]) => (
            <Chip
              key={value}
              active={severity === value}
              onClick={() => setSeverity(value)}
            >
              {label}
            </Chip>
          ))}
        </div>
      </div>

      {state === "loading" && <Skeleton height={420} />}
      {state === "error" && (
        <Card>
          <ErrorState onRetry={retry} />
        </Card>
      )}
      {state === "empty" && (
        <Card>
          <EmptyState icon="checkCircle" title="No open flags — all clear" />
        </Card>
      )}
      {state === "ready" && (
        <Card pad={0}>
          <Table
            dense
            columns={columns}
            rows={rows}
            onRowClick={setSelected}
            empty={<EmptyState icon="checkCircle" title="No flags match these filters" />}
          />
        </Card>
      )}

      <FlagDrawer flag={selected} readOnly={readOnly} onClose={() => setSelected(null)} />
    </div>
  );
}

function FlagDrawer({
  flag,
  readOnly,
  onClose,
}: {
  flag: Flag | null;
  readOnly: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const updateFlag = useUpdateFlag();

  const triage = (status: string, message: string) => {
    if (!flag) return;
    updateFlag.mutate(
      { id: flag.id, status },
      {
        onSuccess: () => {
          toast(message);
          onClose();
        },
        onError: () => toast("Couldn't update flag", "error"),
      },
    );
  };

  const footer =
    flag && !readOnly ? (
      <>
        <Button variant="secondary" size="sm" onClick={() => triage("CLOSED", "Flag dismissed")}>
          Dismiss
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => triage("REVIEWING", "Marked for investigation")}
        >
          Investigate
        </Button>
        <Button variant="primary" size="sm" onClick={() => triage("CLOSED", "Flag resolved")}>
          Resolve
        </Button>
      </>
    ) : flag ? (
      <div className="flex items-center gap-1.5 text-xs text-muted">
        <Icon.eye size={15} /> Read-only
      </div>
    ) : undefined;

  return (
    <Drawer
      open={flag != null}
      onClose={onClose}
      width={520}
      title={flag ? `Flag · ${flag.rule}` : ""}
      footer={footer}
    >
      {flag && (
        <div className="flex flex-col gap-4.5">
          <div className="flex items-center gap-2.5">
            <Severity level={flag.severity} />
            <Pill status={flag.status} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <MiniStat label="Transaction" value={flag.txn ?? "—"} />
            <MiniStat label="Amount" value={flag.amount != null ? fmtNGN(flag.amount) : "—"} />
            <MiniStat label="Project" value={flag.project ?? "—"} />
          </div>

          <div>
            <div className="mb-2 text-xs font-bold tracking-[.04em] text-muted uppercase">
              Investigation notes
            </div>
            <div className="flex items-center gap-2 rounded-md border border-line bg-canvas px-3.5 py-3 text-sm text-muted">
              <Icon.info size={15} /> Rule fired automatically.
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
      <div className="mb-1 text-xs font-semibold text-muted">{label}</div>
      <div className="text-sm font-bold text-ink">{value}</div>
    </div>
  );
}

// ------------------------------------------------------------
// PANEL 3 — Monitoring rules
// ------------------------------------------------------------

function RulesPanel({ readOnly }: { readOnly: boolean }) {
  const toast = useToast();
  const query = useRules();
  const updateRule = useUpdateRule();
  const [editing, setEditing] = useState<Rule | null>(null);

  const { state, data } = useScreenState<Rule[]>(query, {
    isEmpty: (rows) => rows.length === 0,
  });
  const rules = data ?? [];

  const toggleRule = (rule: Rule, enabled: boolean) => {
    updateRule.mutate({ id: rule.id, patch: { enabled } });
    toast(enabled ? "Rule enabled" : "Rule disabled");
  };

  return (
    <div>
      <div className="mb-4.5 flex items-center gap-3 rounded-xl border border-line bg-primary-tint px-4.5 py-3.5 text-brand">
        <Icon.info size={18} />
        <span className="text-sm font-semibold">
          Tune anomaly rules without engineering. Changes apply to the live stream immediately.
        </span>
      </div>

      {(state === "loading" || state === "error") && (
        <Card pad={0}>
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={cx("p-4", index !== 0 && "border-t border-line")}
            >
              <Skeleton height={20} />
            </div>
          ))}
        </Card>
      )}

      {state === "empty" && (
        <Card>
          <EmptyState icon="filter" title="No monitoring rules configured" />
        </Card>
      )}

      {state === "ready" && (
        <Card pad={0}>
          {rules.map((rule, index) => (
            <div
              key={rule.id}
              className={cx(
                "flex items-center gap-3 px-4.5 py-3.5",
                index !== 0 && "border-t border-line",
                !rule.enabled && "opacity-55",
              )}
            >
              <Severity level={rule.severity} label={false} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-ink">{rule.name}</span>
                  <span className="inline-flex h-5 items-center rounded-sm border border-line px-2 text-xs font-bold text-muted">
                    {rule.type}
                  </span>
                </div>
                <div className="mt-0.75 font-mono text-xs text-muted">{rule.params}</div>
              </div>

              {readOnly ? (
                <Pill status={rule.enabled ? "Active" : "Suspended"}>
                  {rule.enabled ? "Enabled" : "Disabled"}
                </Pill>
              ) : (
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Icon.settings size={15} />}
                    onClick={() => setEditing(rule)}
                  >
                    Edit
                  </Button>
                  <Toggle on={rule.enabled} onChange={(enabled) => toggleRule(rule, enabled)} />
                </div>
              )}
            </div>
          ))}
        </Card>
      )}

      <RuleEditModal rule={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function RuleEditModal({
  rule,
  onClose,
}: {
  rule: Rule | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const updateRule = useUpdateRule();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RuleEditValues>({
    resolver: zodResolver(ruleEditSchema),
    defaultValues: {
      name: rule?.name ?? "",
      params: rule?.params ?? "",
      severity: rule?.severity ?? "med",
    },
  });

  // Reseed the form whenever a different rule is opened.
  useEffect(() => {
    if (rule) {
      reset({ name: rule.name, params: rule.params, severity: rule.severity });
    }
  }, [rule, reset]);

  if (!rule) return <Modal open={false} onClose={onClose}>{null}</Modal>;

  const onSubmit = handleSubmit((values) => {
    updateRule.mutate({ id: rule.id, patch: values });
    toast("Rule updated");
    onClose();
  });

  return (
    <Modal open onClose={onClose} width={460}>
      <form onSubmit={onSubmit}>
        <div className="border-b border-line px-5 py-4">
          <div className="text-base font-bold">Edit rule</div>
        </div>
        <div className="flex flex-col gap-4 p-5">
          <Field label="Name" className="mb-0">
            <Input {...register("name")} placeholder="Rule name" error={!!errors.name} />
          </Field>
          <Field label="Condition" className="mb-0">
            <Input
              {...register("params")}
              placeholder="amount > 10000000"
              error={!!errors.params}
            />
          </Field>
          <div>
            <div className="mb-1.5 text-xs font-semibold text-ink">Severity</div>
            <Segmented
              options={[
                { value: "high", label: "High" },
                { value: "med", label: "Medium" },
                { value: "low", label: "Low" },
              ]}
              value={watch("severity")}
              onChange={(value) => setValue("severity", value as RuleEditValues["severity"])}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2.5 border-t border-line px-5 py-3.5">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" busy={updateRule.isPending}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
