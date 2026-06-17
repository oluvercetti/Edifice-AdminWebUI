"use client";
import type { CSSProperties, ReactNode } from "react";
import {
  Card,
  Stat,
  Table,
  RoleBadge,
  TypeBadge,
  type Column,
} from "@/components/admin/primitives";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/feedback";
import { ErrorState } from "@/components/ui/feedback";
import { useDashboard } from "@/lib/api/queries";
import type { DashboardData, Txn } from "@/lib/api/types";
import { fmtNGN, fmtNGNCompact } from "@/lib/money";
import { clockTime, TXN_TYPES } from "@/lib/txn";
import { ROLES } from "@/lib/roles";
import { useScreenState } from "@/lib/api/use-resource";
import { useToast } from "@/providers/ToastProvider";
import { useAdminStore } from "@/stores/admin-store";
import type { AdminRole } from "@/stores/admin-store";

// ============================================================
// PRD A1 — role-aware dashboard. The widget composition is keyed on the active
// "view as" role lens; the same reusable pieces (statRow, FUM, live activity,
// catalogue) are arranged differently per role.
// ============================================================

type StatKey =
  | "volume"
  | "flags"
  | "approvals"
  | "recon"
  | "published"
  | "investors";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

// ---------- Loading skeleton ----------
function DashboardSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={104} radius={12} />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18 }}>
        <Skeleton height={320} radius={12} />
        <Skeleton height={320} radius={12} />
      </div>
    </div>
  );
}

// ---------- Reusable pieces ----------
function statRow(keys: StatKey[], d: DashboardData): ReactNode {
  const cells: Record<StatKey, ReactNode> = {
    volume: (
      <Stat
        label="Today's volume"
        value={fmtNGNCompact(d.todayVolume)}
        sub={`${d.todayCount} transactions`}
        icon="pulse"
        tone="#1570EF"
        trend
      />
    ),
    flags: (
      <Stat
        label="Open flags"
        value={d.openFlags}
        sub={`${d.flagsHigh} high severity`}
        icon="flag"
        tone="#D92D20"
      />
    ),
    approvals: (
      <Stat
        label="Pending approvals"
        value={d.pendingApprovals}
        sub="Disbursements awaiting a checker"
        icon="check"
        tone="#7A5AF8"
      />
    ),
    recon: (
      <Stat
        label="Reconciliation"
        value={d.reconStatus === "balanced" ? "Balanced" : "Drift"}
        sub="Ledger = escrow = provider"
        icon="shieldCheck"
        tone={d.reconStatus === "balanced" ? "#198754" : "#D92D20"}
        money={d.reconStatus === "balanced" ? "#198754" : "#D92D20"}
      />
    ),
    published: (
      <Stat
        label="Published projects"
        value={d.publishedProjects}
        sub={`${d.draftProjects} in draft`}
        icon="building"
        tone="#146C43"
      />
    ),
    investors: (
      <Stat
        label="Active investors"
        value={d.activeInvestors}
        sub="on the platform"
        icon="user"
        tone="#0F5132"
      />
    ),
  };
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${keys.length}, 1fr)`,
        gap: 14,
      }}
    >
      {keys.map((k) => (
        <div key={k}>{cells[k]}</div>
      ))}
    </div>
  );
}

function FumCard({ d }: { d: DashboardData }) {
  const total = d.escrowed + d.disbursed;
  const escrowPct = total > 0 ? (d.escrowed / total) * 100 : 0;
  const disbursePct = total > 0 ? (d.disbursed / total) * 100 : 0;
  return (
    <Card title="Funds under management" sub="Across all live projects">
      <div className="ngn" style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-.02em", color: "var(--ink)" }}>
        {fmtNGNCompact(d.fum)}
      </div>
      <div
        style={{
          display: "flex",
          height: 12,
          borderRadius: 99,
          background: "#EEF1EF",
          overflow: "hidden",
          marginTop: 16,
        }}
      >
        <div style={{ width: `${escrowPct}%`, background: "var(--m-escrowed)" }} />
        <div style={{ width: `${disbursePct}%`, background: "var(--m-disbursed)" }} />
      </div>
      <div style={{ display: "flex", gap: 24, marginTop: 14 }}>
        <LegendItem color="var(--m-escrowed)" label="In escrow" value={fmtNGN(d.escrowed)} />
        <LegendItem color="var(--m-disbursed)" label="Disbursed" value={fmtNGN(d.disbursed)} />
      </div>
    </Card>
  );
}

function LegendItem({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 9, height: 9, borderRadius: 99, background: color, flex: "none" }} />
      <span style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 600 }}>{label}</span>
      <span className="ngn" style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{value}</span>
    </div>
  );
}

function LiveIndicator() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 99,
          background: "#3ddc84",
          animation: "ed-pulse 1.6s infinite",
        }}
      />
      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".06em", color: "#198754" }}>
        LIVE
      </span>
    </span>
  );
}

const ACTIVITY_COLUMNS: Column<Txn>[] = [
  {
    key: "time",
    label: "Time",
    w: 80,
    render: (r) => (
      <span className="ngn" style={{ color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
        {clockTime(r.occurredAt)}
      </span>
    ),
  },
  {
    key: "type",
    label: "Type",
    w: 120,
    render: (r) => <TypeBadge map={TXN_TYPES} value={r.type} />,
  },
  {
    key: "amount",
    label: "Amount",
    w: 120,
    align: "right",
    render: (r) => (
      <span className="ngn" style={{ fontWeight: 700 }}>
        {fmtNGN(r.amount)}
      </span>
    ),
  },
  {
    key: "party",
    label: "Counterparty",
    render: (r) => r.party ?? "—",
  },
];

function LiveActivityCard({ d }: { d: DashboardData }) {
  return (
    <Card
      title="Live activity"
      sub="Most recent money movements"
      pad={0}
      action={
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <LiveIndicator />
          <Button variant="ghost" size="sm" rightIcon={<Icon.chevR size={15} />} href="/monitoring">
            View all
          </Button>
        </div>
      }
    >
      <Table columns={ACTIVITY_COLUMNS} rows={d.recentActivity} dense />
    </Card>
  );
}

function CatalogueCard({ d }: { d: DashboardData }) {
  return (
    <Card
      title="Catalogue status"
      action={
        <Button variant="ghost" size="sm" rightIcon={<Icon.chevR size={15} />} href="/catalogue">
          Manage
        </Button>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <MiniBox label="Published" value={d.publishedProjects} color="var(--success)" />
        <MiniBox label="Draft" value={d.draftProjects} color="var(--muted)" />
      </div>
    </Card>
  );
}

function MiniBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: 10,
        padding: "14px 16px",
        background: "#fff",
      }}
    >
      <div className="ngn" style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.02em", color }}>
        {value}
      </div>
      <div style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 600, marginTop: 4 }}>
        {label}
      </div>
    </div>
  );
}

function PendingApprovalsCard({ d }: { d: DashboardData }) {
  return (
    <Card title="Pending approvals" sub="Disbursements awaiting a checker">
      <div className="ngn" style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-.02em", color: "var(--ink)" }}>
        {d.pendingApprovals}
      </div>
      <div style={{ marginTop: 16 }}>
        <Button variant="secondary" size="sm" full rightIcon={<Icon.chevR size={15} />} href="/disbursements">
          Review queue
        </Button>
      </div>
    </Card>
  );
}

function OpsCard() {
  return (
    <Card title="Operations">
      <p style={{ margin: 0, fontSize: 13.5, color: "var(--muted)", lineHeight: 1.5 }}>
        Investor accounts &amp; complaints — full tools coming in the next phase.
      </p>
    </Card>
  );
}

function AuditorCard() {
  const toast = useToast();
  return (
    <Card title="Read-only view">
      <div style={{ display: "flex", gap: 12 }}>
        <span
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: "#EEF0F2",
            color: "var(--muted)",
            display: "grid",
            placeItems: "center",
            flex: "none",
          }}
        >
          <Icon.eye size={18} />
        </span>
        <p style={{ margin: 0, fontSize: 13.5, color: "var(--ink)", lineHeight: 1.5 }}>
          You are viewing as Auditor. All data is visible and exportable; mutating controls are
          hidden.
        </p>
      </div>
      <div style={{ marginTop: 16 }}>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Icon.doc size={15} />}
          onClick={() => toast("Snapshot exported")}
        >
          Export snapshot
        </Button>
      </div>
    </Card>
  );
}

// ---------- Per-role layout ----------
const gridStyle = (cols: string): CSSProperties => ({
  display: "grid",
  gridTemplateColumns: cols,
  gap: 18,
  alignItems: "start",
});

const colStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: 18 };

function DashboardBody({ d, role }: { d: DashboardData; role: AdminRole }) {
  if (role === "CATALOGUE") {
    return (
      <>
        {statRow(["published", "volume", "investors"], d)}
        <div style={gridStyle("1fr 1.3fr")}>
          <CatalogueCard d={d} />
          <LiveActivityCard d={d} />
        </div>
      </>
    );
  }

  if (role === "OPS") {
    return (
      <>
        {statRow(["investors", "flags", "volume"], d)}
        <div style={gridStyle("1.4fr 1fr")}>
          <LiveActivityCard d={d} />
          <OpsCard />
        </div>
      </>
    );
  }

  if (role === "AUDITOR") {
    return (
      <>
        {statRow(["volume", "recon", "published"], d)}
        <div style={gridStyle("1.4fr 1fr")}>
          <LiveActivityCard d={d} />
          <AuditorCard />
        </div>
      </>
    );
  }

  // FINANCE or SUPER (fallback)
  return (
    <>
      {statRow(["volume", "flags", "approvals", "recon"], d)}
      <div style={gridStyle("1.4fr 1fr")}>
        <div style={colStyle}>
          <FumCard d={d} />
          <LiveActivityCard d={d} />
        </div>
        <div style={colStyle}>
          <PendingApprovalsCard d={d} />
          {role === "SUPER" && <CatalogueCard d={d} />}
        </div>
      </div>
    </>
  );
}

// ---------- Screen ----------
export function DashboardScreen() {
  const { state, data, retry } = useScreenState(useDashboard());
  const admin = useAdminStore((s) => s.admin);
  const viewAs = useAdminStore((s) => s.viewAs);
  const role: AdminRole = viewAs ?? "SUPER";
  const roleMeta = ROLES[role];

  if (state === "loading") return <DashboardSkeleton />;
  if (state === "error" || !data) {
    return (
      <ErrorState
        title="Couldn't load the dashboard"
        body="We couldn't reach the admin service. Please try again."
        onRetry={retry}
      />
    );
  }

  const firstName = (admin?.name ?? "").trim().split(" ")[0] || "there";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 23, fontWeight: 700, letterSpacing: "-.02em" }}>
            {greeting()}, {firstName}
          </h1>
          <p style={{ margin: "5px 0 0", fontSize: 13.5, color: "var(--muted)" }}>
            Here&apos;s what needs your attention as{" "}
            <span style={{ color: roleMeta.color, fontWeight: 700 }}>{roleMeta.label}</span>.
          </p>
        </div>
        <RoleBadge role={role} />
      </div>

      <DashboardBody d={data} role={role} />
    </div>
  );
}
