"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Progress } from "@/components/ui/Progress";
import { Skeleton, EmptyState, ErrorState } from "@/components/ui/feedback";
import { Icon } from "@/components/icons";
import { Card, Table, PageHead, Segmented, type Column } from "@/components/admin/primitives";
import { fmtNGN } from "@/lib/money";
import { shortDateTime } from "@/lib/txn";
import { useCatalogue, queryKeys } from "@/lib/api/queries";
import { useScreenState } from "@/lib/api/use-resource";
import { featureProject } from "@/lib/api/client";
import { useToast } from "@/providers/ToastProvider";
import { useAdminStore } from "@/stores/admin-store";
import { isReadOnly } from "@/lib/roles";
import type { CatalogueRow } from "@/lib/api/types";

const FILTERS = ["All", "Draft", "Ready", "Approved", "Published", "In construction"];

export function CatalogueScreen() {
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const viewAs = useAdminStore((s) => s.viewAs);
  const readOnly = isReadOnly(viewAs);

  const [filter, setFilter] = useState("All");

  const { state, data, retry } = useScreenState(useCatalogue(), {
    isEmpty: (d) => d.length === 0,
  });

  const head = (
    <PageHead
      title="Catalogue"
      sub="Upload which projects display, and manage their full lifecycle."
      actions={
        !readOnly && (
          <Button leftIcon={<Icon.plus size={16} />} href="/catalogue/new">
            New project
          </Button>
        )
      }
    />
  );

  if (state === "loading") {
    return (
      <div>
        {head}
        <Card>
          <Skeleton height={34} style={{ marginBottom: 14, width: 320 }} />
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height={42} style={{ marginBottom: 8 }} />
          ))}
        </Card>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div>
        {head}
        <Card>
          <ErrorState onRetry={retry} />
        </Card>
      </div>
    );
  }

  if (state === "empty") {
    return (
      <div>
        {head}
        <Card>
          <EmptyState
            icon="building"
            title="No projects yet"
            body="Create your first project to start building the investor catalogue."
            action={
              !readOnly && <Button href="/catalogue/new">Create your first project</Button>
            }
          />
        </Card>
      </div>
    );
  }

  const rows = data ?? [];
  const filtered = filter === "All" ? rows : rows.filter((r) => r.status === filter);

  function toggleFeature(r: CatalogueRow) {
    featureProject(r.id, !r.featured)
      .then(() => {
        void qc.invalidateQueries({ queryKey: queryKeys.catalogue });
        toast(r.featured ? "Unfeatured" : "Featured on Discover");
      })
      .catch(() => toast("Failed to update featuring", "error"));
  }

  const columns: Column<CatalogueRow>[] = [
    {
      key: "title",
      label: "Project",
      w: 230,
      render: (r) => (
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <span
            style={{
              width: 40,
              height: 30,
              borderRadius: 6,
              background: "var(--primary-tint)",
              flex: "none",
            }}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: "var(--ink)" }}>{r.title}</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>{r.location}</div>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      w: 130,
      render: (r) => <Pill status={r.status} />,
    },
    {
      key: "pctFunded",
      label: "% Funded",
      w: 120,
      render: (r) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Progress value={r.pctFunded} height={5} style={{ width: 56 }} />
          <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{r.pctFunded}%</span>
        </div>
      ),
    },
    {
      key: "raised",
      label: "Raised",
      w: 130,
      align: "right",
      render: (r) => <span style={{ fontWeight: 700 }}>{fmtNGN(r.raised)}</span>,
    },
    {
      key: "target",
      label: "Target",
      w: 130,
      align: "right",
      render: (r) => <span style={{ color: "var(--muted)" }}>{fmtNGN(r.target)}</span>,
    },
    {
      key: "featured",
      label: "Featured",
      w: 80,
      align: "center",
      render: (r) =>
        readOnly ? (
          <Icon.star size={18} color={r.featured ? "var(--warning)" : "var(--line)"} />
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFeature(r);
            }}
            title={r.featured ? "Remove feature" : "Feature on Discover"}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              display: "inline-flex",
              padding: 4,
            }}
          >
            <Icon.star size={18} color={r.featured ? "var(--warning)" : "var(--line)"} />
          </button>
        ),
    },
    {
      key: "updatedAt",
      label: "Updated",
      w: 150,
      render: (r) => (
        <span style={{ color: "var(--muted)", fontSize: 12.5 }}>
          {shortDateTime(r.updatedAt)}
        </span>
      ),
    },
  ];

  return (
    <div>
      {head}
      <div style={{ marginBottom: 14 }}>
        <Segmented options={FILTERS} value={filter} onChange={setFilter} />
      </div>
      <Card pad={0}>
        <Table
          columns={columns}
          rows={filtered}
          getId={(r) => r.id}
          onRowClick={(r) => router.push(`/catalogue/${r.id}`)}
          empty={
            <div style={{ padding: "8px 14px", color: "var(--muted)", fontSize: 13 }}>
              No projects match this filter.
            </div>
          }
        />
      </Card>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          marginTop: 12,
          fontSize: 12.5,
          color: "var(--muted)",
        }}
      >
        <Icon.layers size={14} />
        Published projects appear on Discover in this order.
      </div>
    </div>
  );
}
