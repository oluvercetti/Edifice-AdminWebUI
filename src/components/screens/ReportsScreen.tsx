"use client";
import { useState } from "react";
import {
  Card,
  Table,
  Segmented,
  PageHead,
  type Column,
} from "@/components/admin/primitives";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { Skeleton, ErrorState } from "@/components/ui/feedback";
import { Icon } from "@/components/icons";
import { cx } from "@/lib/cx";
import { fmtNGN, fmtNGNCompact } from "@/lib/money";
import { useReports } from "@/lib/api/queries";
import { useScreenState } from "@/lib/api/use-resource";
import { useToast } from "@/providers/ToastProvider";
import type { Reports, GmvPoint, ProjectPerf } from "@/lib/api/types";

// ============================================================
// PRD A8 — Reports & analytics. Internal, read-only business metrics across the
// platform: KPI cards, a representative GMV-by-month bar chart, an escrow vs
// disbursed donut, and per-project performance. The date range control is local
// state only (representational); no mutations on this screen.
// ============================================================

const RANGE_OPTIONS = ["Last 30 days", "Last 90 days", "Year to date"];

export function ReportsScreen() {
  const toast = useToast();
  const [range, setRange] = useState(RANGE_OPTIONS[0]);
  const { state, data, retry } = useScreenState(useReports());

  return (
    <div>
      <PageHead
        title="Reports & analytics"
        sub="Internal business metrics across the platform."
        actions={
          <>
            <Segmented
              size="sm"
              options={RANGE_OPTIONS}
              value={range}
              onChange={setRange}
            />
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Icon.download size={15} />}
              onClick={() => toast("Report exported")}
            >
              Export
            </Button>
          </>
        }
      />

      {state === "loading" && <ReportsSkeleton />}
      {state === "error" && <ErrorState onRetry={retry} />}
      {state === "ready" && data && <ReportsBody report={data} />}
    </div>
  );
}

// ---------- Loading skeleton ----------
function ReportsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-3.5">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} pad={16}>
            <Skeleton width={120} height={13} />
            <Skeleton width={90} height={26} style={{ marginTop: 12 }} />
            <Skeleton width={140} height={12} style={{ marginTop: 10 }} />
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-[1.4fr_1fr] items-start gap-4">
        <Card title="GMV by month" sub="Representative distribution (₦M)">
          <Skeleton height={176} />
        </Card>
        <Card title="Escrow vs disbursed">
          <Skeleton height={176} />
        </Card>
      </div>
      <Card title="Project performance" pad={0}>
        <div className="p-4.5">
          <Skeleton height={120} />
        </div>
      </Card>
    </div>
  );
}

// ---------- Ready body ----------
function ReportsBody({ report }: { report: Reports }) {
  const escrowTotal = report.escrowed + report.disbursed;
  const escrowPct = escrowTotal > 0 ? (report.escrowed / escrowTotal) * 100 : 0;

  const projectColumns: Column<ProjectPerf>[] = [
    { key: "title", label: "Project", w: 220 },
    {
      key: "raised",
      label: "Raised",
      w: 140,
      align: "right",
      render: (project) => fmtNGN(project.raised),
    },
    {
      key: "investors",
      label: "Investors",
      w: 110,
      align: "right",
      render: (project) => project.investors.toLocaleString("en-NG"),
    },
    {
      key: "pctComplete",
      label: "% Complete",
      w: 150,
      render: (project) => (
        <div className="flex items-center gap-2.5">
          <Progress value={project.pctComplete} height={5} style={{ width: 70 }} />
          <span className="text-muted">{project.pctComplete}%</span>
        </div>
      ),
    },
    {
      key: "projectedReturn",
      label: "Proj. return",
      w: 110,
      align: "right",
      render: (project) => (
        <span className="font-bold text-primary-strong">
          {parseFloat(project.projectedReturn)}%
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-3.5">
        <KpiCard
          label="GMV (all-time)"
          value={fmtNGNCompact(report.gmv)}
          sub="Gross investment volume"
        />
        <KpiCard
          label="Funds under management"
          value={fmtNGNCompact(report.fum)}
          sub="Currently invested"
        />
        <KpiCard
          label="Payout liabilities"
          value={fmtNGNCompact(report.payoutLiabilities)}
          sub="Projected returns owed"
        />
        <KpiCard
          label="Raise success rate"
          value={`${report.raiseSuccessRate}%`}
          sub="Published / total projects"
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-[1.4fr_1fr] items-start gap-4">
        <Card title="GMV by month" sub="Representative distribution (₦M)">
          <GmvChart points={report.gmvByMonth} />
        </Card>
        <Card title="Escrow vs disbursed">
          <EscrowDonut
            escrowPct={escrowPct}
            escrowed={report.escrowed}
            disbursed={report.disbursed}
          />
        </Card>
      </div>

      {/* Project performance */}
      <Card title="Project performance" pad={0}>
        <Table columns={projectColumns} rows={report.projects} getId={(p) => p.id} />
      </Card>
    </div>
  );
}

// ---------- KPI card ----------
function KpiCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card pad={16}>
      <div className="text-xs font-semibold text-muted">{label}</div>
      <div className="ngn mt-2 text-2xl font-extrabold text-ink">{value}</div>
      <div className="mt-1.5 text-xs text-muted">{sub}</div>
    </Card>
  );
}

// ---------- GMV bar chart ----------
function GmvChart({ points }: { points: GmvPoint[] }) {
  const max = Math.max(...points.map((point) => point.amount), 1);
  const maxIndex = points.findIndex((point) => point.amount === max);

  return (
    <div className="flex h-44 items-end gap-2">
      {points.map((point, index) => {
        const pct = (point.amount / max) * 100;
        return (
          <div key={point.month} className="flex h-full flex-1 flex-col justify-end">
            <div
              className="w-full rounded-sm"
              style={{
                height: `${pct}%`,
                background:
                  index === maxIndex ? "var(--primary-accent)" : "#cfe3d8",
              }}
            />
            <div className="mt-1.5 text-center text-xs text-muted">
              {point.month}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Escrow vs disbursed donut ----------
function EscrowDonut({
  escrowPct,
  escrowed,
  disbursed,
}: {
  escrowPct: number;
  escrowed: number;
  disbursed: number;
}) {
  return (
    <div className="flex items-center gap-6">
      <div className="relative h-32 w-32 flex-none">
        <div
          className="h-32 w-32 rounded-full"
          style={{
            background: `conic-gradient(var(--m-escrowed) 0 ${escrowPct}%, var(--m-disbursed) ${escrowPct}% 100%)`,
          }}
        />
        <div className="absolute inset-0 grid place-items-center">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-surface text-center">
            <div>
              <div className="text-lg font-extrabold text-ink">
                {Math.round(escrowPct)}%
              </div>
              <div className="text-xs text-muted">escrowed</div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <LegendRow tone="bg-m-escrowed" label="In escrow" amount={escrowed} />
        <LegendRow tone="bg-m-disbursed" label="Disbursed" amount={disbursed} />
      </div>
    </div>
  );
}

function LegendRow({
  tone,
  label,
  amount,
}: {
  tone: string;
  label: string;
  amount: number;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={cx("h-3 w-3 flex-none rounded-sm", tone)} />
      <div>
        <div className="text-xs font-semibold text-ink">{label}</div>
        <div className="ngn text-xs text-muted">{fmtNGN(amount)}</div>
      </div>
    </div>
  );
}
