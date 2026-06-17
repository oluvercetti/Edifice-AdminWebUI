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
  const queryClient = useQueryClient();
  const viewAs = useAdminStore((store) => store.viewAs);
  const readOnly = isReadOnly(viewAs);

  const [filter, setFilter] = useState("All");

  const { state, data, retry } = useScreenState(useCatalogue(), {
    isEmpty: (rows) => rows.length === 0,
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
          {[0, 1, 2, 3, 4].map((index) => (
            <Skeleton key={index} height={42} style={{ marginBottom: 8 }} />
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

  const projects = data ?? [];
  const filtered =
    filter === "All" ? projects : projects.filter((project) => project.status === filter);

  function toggleFeature(project: CatalogueRow) {
    featureProject(project.id, !project.featured)
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.catalogue });
        toast(project.featured ? "Unfeatured" : "Featured on Discover");
      })
      .catch(() => toast("Failed to update featuring", "error"));
  }

  const columns: Column<CatalogueRow>[] = [
    {
      key: "title",
      label: "Project",
      w: 230,
      render: (project) => (
        <div className="flex items-center gap-2.75">
          <span className="h-7.5 w-10 flex-none rounded-sm bg-primary-tint" />
          <div className="min-w-0">
            <div className="font-bold text-ink">{project.title}</div>
            <div className="text-xs text-muted">{project.location}</div>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      w: 130,
      render: (project) => <Pill status={project.status} />,
    },
    {
      key: "pctFunded",
      label: "% Funded",
      w: 120,
      render: (project) => (
        <div className="flex items-center gap-2">
          <Progress value={project.pctFunded} height={5} style={{ width: 56 }} />
          <span className="text-xs text-muted">{project.pctFunded}%</span>
        </div>
      ),
    },
    {
      key: "raised",
      label: "Raised",
      w: 130,
      align: "right",
      render: (project) => <span className="font-bold">{fmtNGN(project.raised)}</span>,
    },
    {
      key: "target",
      label: "Target",
      w: 130,
      align: "right",
      render: (project) => <span className="text-muted">{fmtNGN(project.target)}</span>,
    },
    {
      key: "featured",
      label: "Featured",
      w: 80,
      align: "center",
      render: (project) =>
        readOnly ? (
          <Icon.star size={18} color={project.featured ? "var(--warning)" : "var(--line)"} />
        ) : (
          <button
            onClick={(event) => {
              event.stopPropagation();
              toggleFeature(project);
            }}
            title={project.featured ? "Remove feature" : "Feature on Discover"}
            className="inline-flex cursor-pointer border-none bg-transparent p-1"
          >
            <Icon.star size={18} color={project.featured ? "var(--warning)" : "var(--line)"} />
          </button>
        ),
    },
    {
      key: "updatedAt",
      label: "Updated",
      w: 150,
      render: (project) => (
        <span className="text-xs text-muted">{shortDateTime(project.updatedAt)}</span>
      ),
    },
  ];

  return (
    <div>
      {head}
      <div className="mb-3.5">
        <Segmented options={FILTERS} value={filter} onChange={setFilter} />
      </div>
      <Card pad={0}>
        <Table
          columns={columns}
          rows={filtered}
          getId={(project) => project.id}
          onRowClick={(project) => router.push(`/catalogue/${project.id}`)}
          empty={
            <div className="px-3.5 py-2 text-sm text-muted">
              No projects match this filter.
            </div>
          }
        />
      </Card>
      <div className="mt-3 flex items-center gap-1.75 text-xs text-muted">
        <Icon.layers size={14} />
        Published projects appear on Discover in this order.
      </div>
    </div>
  );
}
