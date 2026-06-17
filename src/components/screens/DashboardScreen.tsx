"use client";
import type { ReactNode } from "react";
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
// "view as" role lens; the same reusable pieces (StatRow, FumCard, live activity,
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
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// ---------- Loading skeleton ----------
function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4.5">
      <div className="grid grid-cols-4 gap-3.5">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={104} radius={12} />
        ))}
      </div>
      <div className="grid grid-cols-[1.4fr_1fr] gap-4.5">
        <Skeleton height={320} radius={12} />
        <Skeleton height={320} radius={12} />
      </div>
    </div>
  );
}

// ---------- Reusable pieces ----------
function StatRow({ keys, data }: { keys: StatKey[]; data: DashboardData }) {
  const cells: Record<StatKey, ReactNode> = {
    volume: (
      <Stat
        label="Today's volume"
        value={fmtNGNCompact(data.todayVolume)}
        sub={`${data.todayCount} transactions`}
        icon="pulse"
        tone="#1570EF"
        trend
      />
    ),
    flags: (
      <Stat
        label="Open flags"
        value={data.openFlags}
        sub={`${data.flagsHigh} high severity`}
        icon="flag"
        tone="#D92D20"
      />
    ),
    approvals: (
      <Stat
        label="Pending approvals"
        value={data.pendingApprovals}
        sub="Disbursements awaiting a checker"
        icon="check"
        tone="#7A5AF8"
      />
    ),
    recon: (
      <Stat
        label="Reconciliation"
        value={data.reconStatus === "balanced" ? "Balanced" : "Drift"}
        sub="Ledger = escrow = provider"
        icon="shieldCheck"
        tone={data.reconStatus === "balanced" ? "#198754" : "#D92D20"}
        money={data.reconStatus === "balanced" ? "#198754" : "#D92D20"}
      />
    ),
    published: (
      <Stat
        label="Published projects"
        value={data.publishedProjects}
        sub={`${data.draftProjects} in draft`}
        icon="building"
        tone="#146C43"
      />
    ),
    investors: (
      <Stat
        label="Active investors"
        value={data.activeInvestors}
        sub="on the platform"
        icon="user"
        tone="#0F5132"
      />
    ),
  };
  return (
    <div
      className="grid gap-3.5"
      style={{ gridTemplateColumns: `repeat(${keys.length}, 1fr)` }}
    >
      {keys.map((key) => (
        <div key={key}>{cells[key]}</div>
      ))}
    </div>
  );
}

function FumCard({ data }: { data: DashboardData }) {
  const total = data.escrowed + data.disbursed;
  const escrowPct = total > 0 ? (data.escrowed / total) * 100 : 0;
  const disbursePct = total > 0 ? (data.disbursed / total) * 100 : 0;
  return (
    <Card title="Funds under management" sub="Across all live projects">
      <div className="ngn text-[30px] font-extrabold tracking-[-.02em] text-ink">
        {fmtNGNCompact(data.fum)}
      </div>
      <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-[#EEF1EF]">
        <div className="bg-m-escrowed" style={{ width: `${escrowPct}%` }} />
        <div className="bg-m-disbursed" style={{ width: `${disbursePct}%` }} />
      </div>
      <div className="mt-3.5 flex gap-6">
        <LegendItem color="var(--m-escrowed)" label="In escrow" value={fmtNGN(data.escrowed)} />
        <LegendItem color="var(--m-disbursed)" label="Disbursed" value={fmtNGN(data.disbursed)} />
      </div>
    </Card>
  );
}

function LegendItem({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2.25 w-2.25 flex-none rounded-full" style={{ background: color }} />
      <span className="text-[12.5px] font-semibold text-muted">{label}</span>
      <span className="ngn text-[13px] font-bold text-ink">{value}</span>
    </div>
  );
}

function LiveIndicator() {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="h-1.5 w-1.5 rounded-full bg-[#3ddc84]"
        style={{ animation: "ed-pulse 1.6s infinite" }}
      />
      <span className="text-[11px] font-extrabold tracking-[.06em] text-success">
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
    render: (row) => (
      <span className="ngn text-muted [font-variant-numeric:tabular-nums]">
        {clockTime(row.occurredAt)}
      </span>
    ),
  },
  {
    key: "type",
    label: "Type",
    w: 120,
    render: (row) => <TypeBadge map={TXN_TYPES} value={row.type} />,
  },
  {
    key: "amount",
    label: "Amount",
    w: 120,
    align: "right",
    render: (row) => (
      <span className="ngn font-bold">
        {fmtNGN(row.amount)}
      </span>
    ),
  },
  {
    key: "party",
    label: "Counterparty",
    render: (row) => row.party ?? "—",
  },
];

function LiveActivityCard({ data }: { data: DashboardData }) {
  return (
    <Card
      title="Live activity"
      sub="Most recent money movements"
      pad={0}
      action={
        <div className="flex items-center gap-3">
          <LiveIndicator />
          <Button variant="ghost" size="sm" rightIcon={<Icon.chevR size={15} />} href="/monitoring">
            View all
          </Button>
        </div>
      }
    >
      <Table columns={ACTIVITY_COLUMNS} rows={data.recentActivity} dense />
    </Card>
  );
}

function CatalogueCard({ data }: { data: DashboardData }) {
  return (
    <Card
      title="Catalogue status"
      action={
        <Button variant="ghost" size="sm" rightIcon={<Icon.chevR size={15} />} href="/catalogue">
          Manage
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <MiniBox label="Published" value={data.publishedProjects} color="var(--success)" />
        <MiniBox label="Draft" value={data.draftProjects} color="var(--muted)" />
      </div>
    </Card>
  );
}

function MiniBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-md border border-line bg-surface px-4 py-3.5">
      <div className="ngn text-2xl font-extrabold tracking-[-.02em]" style={{ color }}>
        {value}
      </div>
      <div className="mt-1 text-[12.5px] font-semibold text-muted">
        {label}
      </div>
    </div>
  );
}

function PendingApprovalsCard({ data }: { data: DashboardData }) {
  return (
    <Card title="Pending approvals" sub="Disbursements awaiting a checker">
      <div className="ngn text-4xl font-extrabold tracking-[-.02em] text-ink">
        {data.pendingApprovals}
      </div>
      <div className="mt-4">
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
      <p className="m-0 text-[13.5px] leading-normal text-muted">
        Investor accounts &amp; complaints — full tools coming in the next phase.
      </p>
    </Card>
  );
}

function AuditorCard() {
  const toast = useToast();
  return (
    <Card title="Read-only view">
      <div className="flex gap-3">
        <span className="grid h-9.5 w-9.5 flex-none place-items-center rounded-md bg-[#EEF0F2] text-muted">
          <Icon.eye size={18} />
        </span>
        <p className="m-0 text-[13.5px] leading-normal text-ink">
          You are viewing as Auditor. All data is visible and exportable; mutating controls are
          hidden.
        </p>
      </div>
      <div className="mt-4">
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
function DashboardBody({ data, role }: { data: DashboardData; role: AdminRole }) {
  if (role === "CATALOGUE") {
    return (
      <>
        <StatRow keys={["published", "volume", "investors"]} data={data} />
        <div className="grid grid-cols-[1fr_1.3fr] items-start gap-4.5">
          <CatalogueCard data={data} />
          <LiveActivityCard data={data} />
        </div>
      </>
    );
  }

  if (role === "OPS") {
    return (
      <>
        <StatRow keys={["investors", "flags", "volume"]} data={data} />
        <div className="grid grid-cols-[1.4fr_1fr] items-start gap-4.5">
          <LiveActivityCard data={data} />
          <OpsCard />
        </div>
      </>
    );
  }

  if (role === "AUDITOR") {
    return (
      <>
        <StatRow keys={["volume", "recon", "published"]} data={data} />
        <div className="grid grid-cols-[1.4fr_1fr] items-start gap-4.5">
          <LiveActivityCard data={data} />
          <AuditorCard />
        </div>
      </>
    );
  }

  // FINANCE or SUPER (fallback)
  return (
    <>
      <StatRow keys={["volume", "flags", "approvals", "recon"]} data={data} />
      <div className="grid grid-cols-[1.4fr_1fr] items-start gap-4.5">
        <div className="flex flex-col gap-4.5">
          <FumCard data={data} />
          <LiveActivityCard data={data} />
        </div>
        <div className="flex flex-col gap-4.5">
          <PendingApprovalsCard data={data} />
          {role === "SUPER" && <CatalogueCard data={data} />}
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
    <div className="flex flex-col gap-4.5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="m-0 text-[23px] font-bold tracking-[-.02em]">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-1.25 mb-0 text-[13.5px] text-muted">
            Here&apos;s what needs your attention as{" "}
            <span className="font-bold" style={{ color: roleMeta.color }}>{roleMeta.label}</span>.
          </p>
        </div>
        <RoleBadge role={role} />
      </div>

      <DashboardBody data={data} role={role} />
    </div>
  );
}
