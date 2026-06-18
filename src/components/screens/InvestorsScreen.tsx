"use client";
import { useMemo, useState } from "react";
import {
  AInput,
  Card,
  Drawer,
  Modal,
  PageHead,
  Segmented,
  Table,
  type Column,
} from "@/components/admin/primitives";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import {
  ContentSkeleton,
  EmptyState,
  ErrorState,
  Placeholder,
  Skeleton,
} from "@/components/ui/feedback";
import { Pill } from "@/components/ui/Pill";
import { useInvestor, useInvestorAction, useInvestors } from "@/lib/api/queries";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import type { Investor, InvestorDetail, VerificationStep } from "@/lib/api/types";
import { useScreenState } from "@/lib/api/use-resource";
import { fmtNGN } from "@/lib/money";
import { isReadOnly } from "@/lib/roles";
import { shortDateTime } from "@/lib/txn";
import { useToast } from "@/providers/ToastProvider";
import { useAdminStore } from "@/stores/admin-store";

const STATUS_FILTERS = ["All", "Active", "Unverified", "Suspended"] as const;
const DETAIL_TABS = ["Overview", "Transactions"] as const;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function matchesStatusFilter(investor: Investor, filter: string): boolean {
  switch (filter) {
    case "Active":
      return investor.status === "Active";
    case "Unverified":
      return investor.verified !== "Verified";
    case "Suspended":
      return investor.status === "Suspended";
    default:
      return true;
  }
}

export function InvestorsScreen() {
  const readOnly = isReadOnly(useAdminStore((s) => s.viewAs));

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Name/email search runs server-side (spans all investors, not just the
  // loaded page), debounced. The status filter stays client-side over the rows
  // already loaded.
  const debouncedQuery = useDebouncedValue(query.trim());
  const investorsQuery = useInvestors(debouncedQuery || undefined);
  const { state, data, retry } = useScreenState(investorsQuery, {
    isEmpty: (investors) => investors.length === 0,
  });

  const investors = useMemo(() => data ?? [], [data]);

  const visibleInvestors = useMemo(
    () =>
      investors.filter((investor) =>
        matchesStatusFilter(investor, statusFilter),
      ),
    [investors, statusFilter],
  );

  const columns: Column<Investor>[] = [
    {
      key: "investor",
      label: "Investor",
      w: 220,
      render: (investor) => (
        <div className="flex items-center gap-2.5">
          <span className="grid h-8.5 w-8.5 flex-none place-items-center rounded-full bg-primary-tint text-xs font-bold text-brand">
            {initials(investor.name)}
          </span>
          <div className="min-w-0">
            <div className="truncate font-bold">{investor.name}</div>
            <div className="truncate text-xs text-muted">{investor.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: "verified",
      label: "Verification",
      w: 130,
      render: (investor) => <Pill status={investor.verified} />,
    },
    {
      key: "invested",
      label: "Total invested",
      w: 140,
      align: "right",
      render: (investor) => <span className="font-bold">{fmtNGN(investor.invested)}</span>,
    },
    {
      key: "holdings",
      label: "Holdings",
      w: 90,
      align: "center",
      render: (investor) => investor.holdings,
    },
    {
      key: "status",
      label: "Status",
      w: 110,
      render: (investor) => <Pill status={investor.status} />,
    },
    {
      key: "joined",
      label: "Joined",
      w: 110,
      render: (investor) => <span className="text-muted">{shortDateTime(investor.joined)}</span>,
    },
  ];

  return (
    <>
      <PageHead
        title="Investors"
        sub={`${investors.length} accounts · search, verify and manage investor accounts.`}
      />

      {state === "loading" && (
        <div className="flex flex-col gap-4">
          <Skeleton height={120} />
          <Skeleton height={120} />
          <Skeleton height={120} />
        </div>
      )}

      {state === "error" && <ErrorState onRetry={retry} />}

      {state === "empty" && (
        <Card>
          <EmptyState
            icon="user"
            title="No investors yet"
            body="Investor accounts will appear here once people sign up."
          />
        </Card>
      )}

      {state === "ready" && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <AInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name or email"
              leftIcon={<Icon.search size={15} />}
              width={280}
              ariaLabel="Search investors"
            />
            <Segmented
              size="sm"
              options={[...STATUS_FILTERS]}
              value={statusFilter}
              onChange={setStatusFilter}
            />
          </div>
          <Card pad={0}>
            <Table
              columns={columns}
              rows={visibleInvestors}
              getId={(investor) => investor.id}
              activeId={selectedId}
              onRowClick={(investor) => setSelectedId(investor.id)}
              empty={
                <EmptyState
                  icon="inbox"
                  title="Nothing here"
                  body="No investors match this filter."
                />
              }
            />
          </Card>
          {investorsQuery.hasNextPage && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void investorsQuery.fetchNextPage()}
                disabled={investorsQuery.isFetchingNextPage}
              >
                {investorsQuery.isFetchingNextPage ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}

      <InvestorDrawer
        investorId={selectedId}
        readOnly={readOnly}
        onClose={() => setSelectedId(null)}
      />
    </>
  );
}

function InvestorDrawer({
  investorId,
  readOnly,
  onClose,
}: {
  investorId: string | null;
  readOnly: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const detailQuery = useInvestor(investorId ?? "");
  const action = useInvestorAction(investorId ?? "");

  const [tab, setTab] = useState<string>("Overview");
  const [reviewOpen, setReviewOpen] = useState(false);

  const detail = detailQuery.data ?? null;
  const isOpen = investorId != null;

  const closeAll = () => {
    setReviewOpen(false);
    onClose();
  };

  const runAction = (
    operation: "suspend" | "reinstate" | "approveIdentity" | "rejectIdentity",
    successMessage: string,
  ) => {
    action.mutate(operation, {
      onSuccess: () => {
        toast(successMessage);
        closeAll();
      },
      onError: () => toast("Action failed. Please try again.", "error"),
    });
  };

  const footer =
    detail &&
    (readOnly ? (
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted">
        <Icon.eye size={14} />
        Read-only
      </div>
    ) : (
      <>
        {detail.verified !== "Verified" && (
          <Button variant="secondary" onClick={() => setReviewOpen(true)}>
            Review identity
          </Button>
        )}
        {detail.status === "Suspended" ? (
          <Button
            variant="secondary"
            busy={action.isPending}
            onClick={() => runAction("reinstate", "Investor reinstated")}
          >
            Reinstate
          </Button>
        ) : (
          <Button
            variant="outlineDanger"
            busy={action.isPending}
            onClick={() => runAction("suspend", "Investor suspended")}
          >
            Suspend
          </Button>
        )}
      </>
    ));

  return (
    <>
      <Drawer
        open={isOpen}
        onClose={closeAll}
        width={540}
        title={detail ? detail.name : "Investor"}
        footer={footer}
      >
        {detailQuery.isPending ? (
          <div className="py-4">
            <ContentSkeleton />
          </div>
        ) : detail ? (
          <InvestorDrawerBody detail={detail} tab={tab} onTabChange={setTab} />
        ) : null}
      </Drawer>

      <IdentityReviewModal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        busy={action.isPending}
        onReject={() => runAction("rejectIdentity", "Verification rejected")}
        onApprove={() => runAction("approveIdentity", "Identity approved")}
      />
    </>
  );
}

function InvestorDrawerBody({
  detail,
  tab,
  onTabChange,
}: {
  detail: InvestorDetail;
  tab: string;
  onTabChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3.5">
        <span className="grid h-12 w-12 flex-none place-items-center rounded-full bg-primary-tint text-base font-bold text-brand">
          {initials(detail.name)}
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm text-muted">{detail.email}</div>
          <div className="mt-1.5 flex items-center gap-2">
            <Pill status={detail.verified} />
            <Pill status={detail.status} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <MiniStat label="Total invested" value={fmtNGN(detail.invested)} />
        <MiniStat label="Holdings" value={String(detail.holdings)} />
      </div>

      <Segmented options={[...DETAIL_TABS]} value={tab} onChange={onTabChange} />

      {tab === "Overview" ? (
        <OverviewTab steps={detail.verification} />
      ) : (
        <TransactionsTab transactions={detail.transactions} />
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-canvas px-3.5 py-3">
      <div className="text-xs font-semibold text-muted">{label}</div>
      <div className="mt-1 text-xl font-extrabold tracking-[-.02em]">{value}</div>
    </div>
  );
}

function OverviewTab({ steps }: { steps: VerificationStep[] }) {
  return (
    <div>
      <div className="mb-2.5 text-xs font-bold tracking-[.04em] text-muted uppercase">
        Identity verification history
      </div>
      <div className="flex flex-col gap-3">
        {steps.map((step) => (
          <div key={step.label} className="flex items-start gap-2.5">
            <span className="mt-0.5 flex-none">
              {step.status === "passed" ? (
                <Icon.check size={16} className="text-success" />
              ) : step.status === "pending" ? (
                <Icon.clock size={16} className="text-warning" />
              ) : step.status === "failed" ? (
                <Icon.alert size={16} className="text-danger" />
              ) : (
                <span className="block h-2 w-2 translate-y-1.5 rounded-full bg-muted" />
              )}
            </span>
            <div className="min-w-0">
              <div className="text-sm font-bold text-ink">{step.label}</div>
              <div className="text-xs text-muted">{step.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TransactionsTab({ transactions }: { transactions: InvestorDetail["transactions"] }) {
  const columns: Column<InvestorDetail["transactions"][number]>[] = [
    {
      key: "occurredAt",
      label: "Time",
      w: 150,
      render: (txn) => <span className="text-muted">{shortDateTime(txn.occurredAt)}</span>,
    },
    { key: "type", label: "Type", w: 120, render: (txn) => txn.type },
    {
      key: "amount",
      label: "Amount",
      w: 130,
      align: "right",
      render: (txn) => <span className="font-bold">{fmtNGN(txn.amount)}</span>,
    },
  ];

  if (transactions.length === 0) {
    return <div className="py-6 text-center text-sm text-muted">No transactions yet.</div>;
  }

  return <Table dense columns={columns} rows={transactions} getId={(txn) => txn.id} />;
}

function IdentityReviewModal({
  open,
  onClose,
  busy,
  onReject,
  onApprove,
}: {
  open: boolean;
  onClose: () => void;
  busy: boolean;
  onReject: () => void;
  onApprove: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} width={460}>
      <div>
        <div className="px-5 pt-4.5">
          <div className="text-base font-bold">Identity review</div>
        </div>
        <div className="px-5 pt-4">
          <div className="grid grid-cols-2 gap-2.5">
            <Placeholder icon="user" label="ID photo" height={110} />
            <Placeholder icon="camera" label="Selfie" height={110} />
          </div>
          <div className="mt-4 flex flex-col">
            <ProviderRow label="Provider" value="Smile ID" />
            <ProviderRow label="Name match" value="Exact" />
            <ProviderRow label="Face match" value="76%" />
          </div>
        </div>
        <div className="mt-1.5 flex justify-end gap-2.5 px-5 py-4.5">
          <Button variant="outlineDanger" busy={busy} onClick={onReject}>
            Reject
          </Button>
          <Button variant="primary" busy={busy} onClick={onApprove}>
            Approve
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ProviderRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[#EEF1EF] py-2.5 text-sm">
      <span className="font-semibold text-muted">{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}
