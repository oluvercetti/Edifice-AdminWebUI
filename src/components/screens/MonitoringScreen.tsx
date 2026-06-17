"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Skeleton, EmptyState, ErrorState } from "@/components/ui/feedback";
import { Icon } from "@/components/icons";
import {
  Card,
  Table,
  Drawer,
  Modal,
  Segmented,
  Chip,
  Toggle,
  AInput,
  Severity,
  TypeBadge,
  PageHead,
  type Column,
} from "@/components/admin/primitives";
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
import type { Txn, Flag, Rule } from "@/lib/api/types";

// ============================================================
// Transactions / monitoring (PRD A3) — live feed, review queue, rules.
// ============================================================

const SEV_COLOR: Record<string, string> = {
  high: "#D92D20",
  med: "#E0A800",
  low: "#5F6368",
};

/** ISO → coarse relative age: "12m" / "3h" / "1d". */
function ago(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.floor(diff / 60000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

type Tab = "Live feed" | "Flags" | "Rules";

export function MonitoringScreen() {
  const readOnly = isReadOnly(useAdminStore((s) => s.viewAs));
  const [tab, setTab] = useState<Tab>("Live feed");

  return (
    <div>
      <PageHead
        title="Transactions"
        sub="Real-time monitoring across every money movement."
      />
      <div style={{ marginBottom: 20 }}>
        <Segmented
          size="sm"
          options={["Live feed", "Flags", "Rules"]}
          value={tab}
          onChange={(v) => setTab(v as Tab)}
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
  const [live, setLive] = useState(true);
  const [typeTab, setTypeTab] = useState("All");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [selected, setSelected] = useState<Txn | null>(null);

  const type = typeTab === "All" ? undefined : typeTab;
  const query = useTransactions(
    { type, flaggedOnly },
    { refetchInterval: live ? 4000 : undefined },
  );
  const { state, data, retry } = useScreenState<Txn[]>(query, {
    isEmpty: (d) => d.length === 0,
  });

  const flagsQuery = useFlags();
  const flags = flagsQuery.data ?? [];
  const sevCount = (level: Flag["severity"]) =>
    flags.filter((f) => f.severity === level).length;

  const rows = data ?? [];
  const flaggedCount = rows.filter((r) => r.flagged).length;

  const columns: Column<Txn>[] = [
    {
      key: "time",
      label: "Time",
      w: 90,
      render: (r) => (
        <span style={{ color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
          {clockTime(r.occurredAt)}
        </span>
      ),
    },
    {
      key: "id",
      label: "Txn",
      w: 96,
      render: (r) => (
        <span style={{ fontWeight: 700, fontFamily: "ui-monospace, monospace", fontSize: 12.5 }}>
          {r.id}
        </span>
      ),
    },
    {
      key: "type",
      label: "Type",
      w: 128,
      render: (r) => <TypeBadge map={TXN_TYPES} value={r.type} />,
    },
    {
      key: "amount",
      label: "Amount",
      w: 124,
      align: "right",
      render: (r) => <span style={{ fontWeight: 700 }}>{fmtNGN(r.amount)}</span>,
    },
    {
      key: "project",
      label: "Project",
      w: 170,
      render: (r) => <span style={{ color: "var(--muted)" }}>{r.project ?? "—"}</span>,
    },
    {
      key: "party",
      label: "Counterparty",
      render: (r) => r.party ?? "—",
    },
    {
      key: "status",
      label: "Status",
      w: 96,
      render: (r) => <Pill status={r.status} />,
    },
    {
      key: "flag",
      label: "Flag",
      w: 44,
      align: "center",
      render: (r) =>
        r.flagged ? (
          <Icon.flag size={15} color={SEV_COLOR[r.severity ?? "low"]} />
        ) : null,
    },
  ];

  return (
    <div>
      {/* Flag strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          marginBottom: 18,
        }}
      >
        <SevCell value={sevCount("high")} label="High-severity flags" color={SEV_COLOR.high} />
        <SevCell value={sevCount("med")} label="Medium-severity flags" color={SEV_COLOR.med} />
        <SevCell value={sevCount("low")} label="Low-severity flags" color={SEV_COLOR.low} />
        <StreamCell live={live} count={rows.length} onToggle={() => setLive((v) => !v)} />
      </div>

      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <Segmented
          size="sm"
          options={["All", "Pay-in", "Escrow hold", "Disbursement"]}
          value={typeTab}
          onChange={setTypeTab}
        />
        <Chip
          icon="flag"
          active={flaggedOnly}
          onClick={() => setFlaggedOnly((v) => !v)}
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
            rowStyle={(r) =>
              r.flagged
                ? {
                    background: "#FEF6F5",
                    boxShadow: `inset 3px 0 0 ${SEV_COLOR[r.severity ?? "low"]}`,
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

function SevCell({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <Card>
      <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-.02em", color }}>{value}</div>
      <div style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 600, marginTop: 4 }}>
        {label}
      </div>
    </Card>
  );
}

function StreamCell({
  live,
  count,
  onToggle,
}: {
  live: boolean;
  count: number;
  onToggle: () => void;
}) {
  return (
    <div
      style={{
        borderRadius: 12,
        border: "1px solid var(--line)",
        boxShadow: "var(--sh-1)",
        padding: "16px 18px",
        background: live ? "#0D1F17" : "#fff",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: 99,
              background: live ? "#3FCF8E" : "#CDD4D0",
              animation: live ? "ed-pulse 1.6s infinite" : "none",
              flex: "none",
            }}
          />
          <span style={{ fontSize: 13.5, fontWeight: 700, color: live ? "#fff" : "var(--ink)" }}>
            {live ? "Streaming" : "Paused"}
          </span>
        </div>
        <button
          onClick={onToggle}
          style={{
            border: "none",
            cursor: "pointer",
            width: 28,
            height: 28,
            borderRadius: 7,
            display: "grid",
            placeItems: "center",
            background: live ? "rgba(255,255,255,.12)" : "var(--canvas)",
            color: live ? "#fff" : "var(--muted)",
          }}
          title={live ? "Pause stream" : "Resume stream"}
        >
          {live ? <Icon.lock size={14} /> : <Icon.refresh size={14} />}
        </button>
      </div>
      <div
        style={{
          fontSize: 12.5,
          fontWeight: 600,
          marginTop: 10,
          color: live ? "rgba(255,255,255,.7)" : "var(--muted)",
        }}
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
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              background: "var(--canvas)",
              border: "1px solid var(--line)",
              borderRadius: 12,
              padding: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div className="ngn" style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.02em" }}>
              {fmtNGN(txn.amount)}
            </div>
            <TypeBadge map={TXN_TYPES} value={txn.type} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <DetailRow label="Counterparty" value={txn.party ?? "—"} />
            <DetailRow label="Project" value={txn.project ?? "—"} />
            <DetailRow label="Status" value={<Pill status={txn.status} />} />
            <DetailRow label="When" value={shortDateTime(txn.occurredAt)} />
          </div>

          {txn.flagged && (
            <div
              style={{
                background: "#FDECEA",
                border: "1px solid #F4C4BF",
                borderRadius: 10,
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                color: "var(--danger)",
              }}
            >
              <Icon.flag size={16} color={SEV_COLOR[txn.severity ?? "low"]} />
              <span style={{ fontSize: 13, fontWeight: 700 }}>
                {(txn.severity === "high" ? "High" : txn.severity === "med" ? "Medium" : "Low")}{" "}
                severity flag
              </span>
            </div>
          )}

          <div>
            <div
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: ".04em",
                marginBottom: 8,
              }}
            >
              Ledger entries
            </div>
            <div style={{ border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
              <LedgerRow label="Debit — Escrow" amount={fmtNGN(txn.amount)} border />
              <LedgerRow
                label={`Credit — ${txn.party ?? "Counterparty"}`}
                amount={fmtNGN(txn.amount)}
              />
            </div>
          </div>

          <div style={{ fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}>
            <Icon.eye size={14} /> Read-only — transactions are immutable.
          </div>
        </div>
      )}
    </Drawer>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 0",
        borderBottom: "1px solid #EEF1EF",
        fontSize: 13.5,
      }}
    >
      <span style={{ color: "var(--muted)", fontWeight: 600 }}>{label}</span>
      <span style={{ fontWeight: 600, color: "var(--ink)" }}>{value}</span>
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
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "11px 14px",
        borderBottom: border ? "1px solid var(--line)" : "none",
        fontSize: 13,
      }}
    >
      <span style={{ color: "var(--ink)", fontWeight: 600 }}>{label}</span>
      <span className="ngn" style={{ fontWeight: 700 }}>{amount}</span>
    </div>
  );
}

// ------------------------------------------------------------
// PANEL 2 — Flags / review queue
// ------------------------------------------------------------

function FlagsPanel({ readOnly }: { readOnly: boolean }) {
  const [statusTab, setStatusTab] = useState("All");
  const [sev, setSev] = useState("All");
  const [selected, setSelected] = useState<Flag | null>(null);

  const query = useFlags();
  const { state, data, retry } = useScreenState<Flag[]>(query, {
    isEmpty: (d) => d.length === 0,
  });

  const all = data ?? [];
  const rows = all.filter((f) => {
    if (statusTab !== "All" && f.status !== statusTab) return false;
    if (sev !== "All" && f.severity !== sev) return false;
    return true;
  });

  const columns: Column<Flag>[] = [
    {
      key: "severity",
      label: "Severity",
      w: 110,
      render: (f) => <Severity level={f.severity} />,
    },
    { key: "rule", label: "Rule", w: 240, render: (f) => f.rule },
    {
      key: "txn",
      label: "Transaction",
      w: 110,
      render: (f) => <span style={{ fontWeight: 700 }}>{f.txn ?? "—"}</span>,
    },
    {
      key: "project",
      label: "Project",
      w: 150,
      render: (f) => <span style={{ color: "var(--muted)" }}>{f.project ?? "—"}</span>,
    },
    {
      key: "amount",
      label: "Amount",
      w: 120,
      align: "right",
      render: (f) => (f.amount != null ? fmtNGN(f.amount) : "—"),
    },
    {
      key: "age",
      label: "Age",
      w: 70,
      render: (f) => <span style={{ color: "var(--muted)" }}>{ago(f.createdAt)}</span>,
    },
    {
      key: "status",
      label: "Status",
      w: 116,
      render: (f) => <Pill status={f.status} />,
    },
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <Segmented
          size="sm"
          options={["All", "Open", "Investigating", "Resolved"]}
          value={statusTab}
          onChange={setStatusTab}
        />
        <div style={{ display: "flex", gap: 8 }}>
          {(
            [
              ["All", "All"],
              ["high", "High"],
              ["med", "Medium"],
              ["low", "Low"],
            ] as const
          ).map(([v, l]) => (
            <Chip key={v} active={sev === v} onClick={() => setSev(v)}>
              {l}
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

  const act = (status: string, msg: string) => {
    if (!flag) return;
    updateFlag.mutate(
      { id: flag.id, status },
      {
        onSuccess: () => {
          toast(msg);
          onClose();
        },
        onError: () => toast("Couldn't update flag", "error"),
      },
    );
  };

  const footer =
    flag && !readOnly ? (
      <>
        <Button variant="secondary" size="sm" onClick={() => act("CLOSED", "Flag dismissed")}>
          Dismiss
        </Button>
        <Button variant="secondary" size="sm" onClick={() => act("REVIEWING", "Marked for investigation")}>
          Investigate
        </Button>
        <Button variant="primary" size="sm" onClick={() => act("CLOSED", "Flag resolved")}>
          Resolve
        </Button>
      </>
    ) : flag ? (
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--muted)", fontSize: 12.5 }}>
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
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Severity level={flag.severity} />
            <Pill status={flag.status} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <MiniStat label="Transaction" value={flag.txn ?? "—"} />
            <MiniStat label="Amount" value={flag.amount != null ? fmtNGN(flag.amount) : "—"} />
            <MiniStat label="Project" value={flag.project ?? "—"} />
          </div>

          <div>
            <div
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: ".04em",
                marginBottom: 8,
              }}
            >
              Investigation notes
            </div>
            <div
              style={{
                border: "1px solid var(--line)",
                borderRadius: 10,
                padding: "12px 14px",
                background: "var(--canvas)",
                fontSize: 13,
                color: "var(--muted)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Icon.info size={15} /> Rule fired automatically.
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }}>
      <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>{value}</div>
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
    isEmpty: (d) => d.length === 0,
  });
  const rules = data ?? [];

  const toggle = (r: Rule, v: boolean) => {
    updateRule.mutate({ id: r.id, patch: { enabled: v } });
    toast(v ? "Rule enabled" : "Rule disabled");
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "var(--primary-tint)",
          border: "1px solid var(--line)",
          borderRadius: 12,
          padding: "14px 18px",
          marginBottom: 18,
          color: "var(--brand)",
        }}
      >
        <Icon.info size={18} />
        <span style={{ fontSize: 13, fontWeight: 600 }}>
          Tune anomaly rules without engineering. Changes apply to the live stream immediately.
        </span>
      </div>

      {(state === "loading" || state === "error") && (
        <Card pad={0}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                padding: 16,
                borderTop: i === 0 ? "none" : "1px solid var(--line)",
              }}
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
          {rules.map((r, i) => (
            <div
              key={r.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 18px",
                borderTop: i === 0 ? "none" : "1px solid var(--line)",
                opacity: r.enabled ? 1 : 0.55,
              }}
            >
              <Severity level={r.severity} label={false} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{r.name}</span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      height: 20,
                      padding: "0 8px",
                      borderRadius: 6,
                      border: "1px solid var(--line)",
                      color: "var(--muted)",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {r.type}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--muted)",
                    fontFamily: "ui-monospace, monospace",
                    marginTop: 3,
                  }}
                >
                  {r.params}
                </div>
              </div>

              {readOnly ? (
                <Pill status={r.enabled ? "Active" : "Suspended"}>
                  {r.enabled ? "Enabled" : "Disabled"}
                </Pill>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Icon.settings size={15} />}
                    onClick={() => setEditing(r)}
                  >
                    Edit
                  </Button>
                  <Toggle on={r.enabled} onChange={(v) => toggle(r, v)} />
                </div>
              )}
            </div>
          ))}
        </Card>
      )}

      <RuleEditModal
        rule={editing}
        onClose={() => setEditing(null)}
        onSave={(id, patch) => {
          updateRule.mutate({ id, patch });
          toast("Rule updated");
          setEditing(null);
        }}
      />
    </div>
  );
}

function RuleEditModal({
  rule,
  onClose,
  onSave,
}: {
  rule: Rule | null;
  onClose: () => void;
  onSave: (id: string, patch: { name: string; params: string; severity: string }) => void;
}) {
  const [name, setName] = useState("");
  const [params, setParams] = useState("");
  const [severity, setSeverity] = useState<Rule["severity"]>("med");
  const [seeded, setSeeded] = useState<string | null>(null);

  // Seed local form when a new rule is opened.
  if (rule && seeded !== rule.id) {
    setSeeded(rule.id);
    setName(rule.name);
    setParams(rule.params);
    setSeverity(rule.severity);
  }
  if (!rule && seeded !== null) setSeeded(null);

  return (
    <Modal open={rule != null} onClose={onClose} width={460}>
      {rule && (
        <div>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Edit rule</div>
          </div>
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>Name</div>
              <AInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                width="100%"
                placeholder="Rule name"
              />
            </div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>Parameters</div>
              <AInput
                value={params}
                onChange={(e) => setParams(e.target.value)}
                width="100%"
                placeholder="amount > 10000000"
                style={{ fontFamily: "ui-monospace, monospace" }}
              />
            </div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>Severity</div>
              <Segmented
                options={[
                  { value: "high", label: "High" },
                  { value: "med", label: "Medium" },
                  { value: "low", label: "Low" },
                ]}
                value={severity}
                onChange={(v) => setSeverity(v as Rule["severity"])}
              />
            </div>
          </div>
          <div
            style={{
              padding: "14px 20px",
              borderTop: "1px solid var(--line)",
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
            }}
          >
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => onSave(rule.id, { name, params, severity })}>
              Save
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
