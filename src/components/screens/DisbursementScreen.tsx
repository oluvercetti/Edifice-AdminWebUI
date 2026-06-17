"use client";
import { useMemo, useState } from "react";
import { Card, Drawer, Modal, PageHead, Segmented, Table, type Column } from "@/components/admin/primitives";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, Placeholder, Skeleton } from "@/components/ui/feedback";
import { Pill } from "@/components/ui/Pill";
import { cx } from "@/lib/cx";
import { ApiError } from "@/lib/api/http";
import { useApproveDisbursement, useDisbursements, useRejectDisbursement } from "@/lib/api/queries";
import type { Disbursement } from "@/lib/api/types";
import { useScreenState } from "@/lib/api/use-resource";
import { fmtNGN } from "@/lib/money";
import { isReadOnly } from "@/lib/roles";
import { shortDateTime } from "@/lib/txn";
import { useToast } from "@/providers/ToastProvider";
import { useAdminStore } from "@/stores/admin-store";

const STATUS_FILTERS = ["All", "Awaiting approval", "Executed", "Rejected"] as const;

export function DisbursementScreen() {
  const toast = useToast();
  const admin = useAdminStore((s) => s.admin);
  const readOnly = isReadOnly(useAdminStore((s) => s.viewAs));

  const { state, data, retry } = useScreenState(useDisbursements(), {
    isEmpty: (d) => d.length === 0,
  });

  const approveMutation = useApproveDisbursement();
  const rejectMutation = useRejectDisbursement();

  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [selectedDisbursementId, setSelectedDisbursementId] = useState<string | null>(null);
  const [confirmReleaseOpen, setConfirmReleaseOpen] = useState(false);

  const disbursements = useMemo(() => data ?? [], [data]);

  // Re-derive the live row from the latest data so the drawer reflects updates.
  const selectedDisbursement = useMemo(
    () => disbursements.find((d) => d.id === selectedDisbursementId) ?? null,
    [disbursements, selectedDisbursementId],
  );

  const visibleDisbursements = useMemo(
    () =>
      statusFilter === "All"
        ? disbursements
        : disbursements.filter((d) => d.status === statusFilter),
    [disbursements, statusFilter],
  );

  const closeDrawer = () => {
    setSelectedDisbursementId(null);
    setConfirmReleaseOpen(false);
  };
  const closeConfirm = () => setConfirmReleaseOpen(false);

  const handleApproveError = (error: unknown) =>
    toast(error instanceof ApiError ? error.message : "Failed to release disbursement.", "error");
  const handleRejectError = (error: unknown) =>
    toast(error instanceof ApiError ? error.message : "Failed to reject disbursement.", "error");

  const columns: Column<Disbursement>[] = [
    {
      key: "project",
      label: "Project",
      render: (d) => (
        <div>
          <div className="font-semibold">{d.projectTitle ?? "—"}</div>
          <div className="mt-0.5 text-xs text-muted">{d.milestoneTitle ?? "—"}</div>
        </div>
      ),
    },
    { key: "tranche", label: "Tranche", w: 90, render: (d) => `${d.tranchePct}%` },
    {
      key: "amount",
      label: "Amount",
      w: 140,
      align: "right",
      render: (d) => <span className="font-bold">{fmtNGN(d.amount)}</span>,
    },
    { key: "proposedBy", label: "Proposed by", w: 150, render: (d) => d.proposedBy ?? "—" },
    { key: "proposedAt", label: "Proposed", w: 140, render: (d) => shortDateTime(d.proposedAt) },
    { key: "status", label: "Status", w: 150, render: (d) => <Pill status={d.status} /> },
    {
      key: "escrow",
      label: "Escrow",
      w: 140,
      align: "right",
      render: (d) => <span className="text-muted">{fmtNGN(d.escrowBalance)}</span>,
    },
  ];

  return (
    <>
      <PageHead
        title="Disbursements"
        sub="Maker-checker approval — no funds leave escrow without a verified milestone and a second admin."
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
            icon="checkCircle"
            title="No disbursements yet"
            body="Completed milestones will appear here for two-person approval."
          />
        </Card>
      )}

      {state === "ready" && (
        <>
          <div className="mb-4">
            <Segmented size="sm" options={[...STATUS_FILTERS]} value={statusFilter} onChange={setStatusFilter} />
          </div>
          <Card pad={0}>
            <Table
              columns={columns}
              rows={visibleDisbursements}
              getId={(d) => d.id}
              activeId={selectedDisbursementId}
              onRowClick={(d) => setSelectedDisbursementId(d.id)}
              empty={
                <EmptyState
                  icon="inbox"
                  title="Nothing here"
                  body="No disbursements match this filter."
                />
              }
            />
          </Card>
        </>
      )}

      <ReviewDrawer
        disbursement={selectedDisbursement}
        admin={admin}
        readOnly={readOnly}
        onClose={closeDrawer}
        confirmReleaseOpen={confirmReleaseOpen}
        openConfirmRelease={() => setConfirmReleaseOpen(true)}
        closeConfirmRelease={closeConfirm}
        approve={{
          isPending: approveMutation.isPending,
          run: (id) =>
            approveMutation.mutate(id, {
              onSuccess: () => {
                toast("Disbursement released");
                closeConfirm();
                closeDrawer();
              },
              onError: handleApproveError,
            }),
        }}
        reject={{
          run: (id) =>
            rejectMutation.mutate(id, {
              onSuccess: () => {
                toast("Disbursement rejected");
                closeDrawer();
              },
              onError: handleRejectError,
            }),
        }}
      />
    </>
  );
}

interface AdminLike {
  id: string;
}

function ReviewDrawer({
  disbursement,
  admin,
  readOnly,
  onClose,
  confirmReleaseOpen,
  openConfirmRelease,
  closeConfirmRelease,
  approve,
  reject,
}: {
  disbursement: Disbursement | null;
  admin: AdminLike | null;
  readOnly: boolean;
  onClose: () => void;
  confirmReleaseOpen: boolean;
  openConfirmRelease: () => void;
  closeConfirmRelease: () => void;
  approve: { isPending: boolean; run: (id: string) => void };
  reject: { run: (id: string) => void };
}) {
  const isOpen = disbursement != null;
  const isAwaitingApproval = disbursement?.status === "Awaiting approval";
  const isOwnProposal = !!admin && disbursement?.proposedById === admin.id;
  const escrowCoversAmount =
    disbursement != null && disbursement.escrowBalance >= disbursement.amount;

  const showActions = !readOnly && isAwaitingApproval;

  const footer = disbursement && (
    showActions ? (
      <>
        <Button variant="outlineDanger" onClick={() => reject.run(disbursement.id)}>
          Reject
        </Button>
        <Button
          variant="primary"
          disabled={isOwnProposal}
          onClick={isOwnProposal ? undefined : openConfirmRelease}
        >
          Approve &amp; release
        </Button>
      </>
    ) : (
      <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-muted">
        {readOnly ? (
          <>
            <Icon.eye size={14} />
            Read-only
          </>
        ) : (
          <>This disbursement is {disbursement.status}.</>
        )}
      </div>
    )
  );

  return (
    <>
      <Drawer
        open={isOpen}
        onClose={onClose}
        width={520}
        title="Disbursement review"
        sub={disbursement ? `${disbursement.projectTitle ?? "—"} · ${disbursement.milestoneTitle ?? "—"}` : undefined}
        footer={footer}
      >
        {disbursement && (
          <div className="flex flex-col gap-5">
            {/* Prominent amount box */}
            <div className="flex items-center justify-between gap-3 rounded-md border border-line bg-canvas p-4.5">
              <div>
                <div className="text-[12.5px] font-semibold text-muted">Releasing</div>
                <div className="mt-1 text-[30px] font-extrabold tracking-[-.02em]">
                  {fmtNGN(disbursement.amount)}
                </div>
              </div>
              <Pill status={disbursement.status} />
            </div>

            {/* Milestone evidence */}
            <div>
              <div className="mb-2 text-[12.5px] font-bold">Milestone evidence</div>
              <div className="grid grid-cols-2 gap-2.5">
                <Placeholder icon="camera" label="Progress photo" height={120} />
                <Placeholder icon="camera" label="Progress photo" height={120} />
              </div>
            </div>

            {/* Detail rows */}
            <div className="flex flex-col">
              <DetailRow label="Tranche" value={`${disbursement.tranchePct}%`} />
              <DetailRow label="Project escrow balance" value={fmtNGN(disbursement.escrowBalance)} />
              <DetailRow label="Proposed by" value={disbursement.proposedBy ?? "—"} />
              <DetailRow label="Proposed at" value={shortDateTime(disbursement.proposedAt)} />
            </div>

            {/* Escrow check */}
            <div
              className={cx(
                "flex items-center gap-2 rounded-md px-3 py-2.5 text-[13px] font-semibold",
                escrowCoversAmount
                  ? "bg-m-disbursed-tint text-success"
                  : "bg-[#FDECEA] text-danger",
              )}
            >
              {escrowCoversAmount ? <Icon.checkCircle size={15} /> : <Icon.alert size={15} />}
              {escrowCoversAmount
                ? "Escrow balance covers this disbursement."
                : "Insufficient escrow balance."}
            </div>

            {/* Maker-checker guardrail note */}
            {showActions && isOwnProposal && (
              <div className="flex items-center gap-2 rounded-md bg-[#FCF3D9] px-3 py-2.5 text-[12.5px] font-semibold text-[#9a7b00]">
                <Icon.lock size={15} />
                You cannot approve your own proposal (maker-checker).
              </div>
            )}
          </div>
        )}
      </Drawer>

      <Modal open={confirmReleaseOpen} onClose={closeConfirmRelease}>
        {disbursement && (
          <div>
            <div className="px-5 pt-4.5">
              <div className="text-base font-bold">Release this disbursement?</div>
              <p className="mt-2 text-[13.5px] leading-normal text-muted">
                This releases {fmtNGN(disbursement.amount)} from escrow to the developer for{" "}
                {disbursement.projectTitle ?? "—"}. This cannot be undone.
              </p>
            </div>
            <div className="mt-1.5 flex justify-end gap-2.5 px-5 py-4.5">
              <Button variant="secondary" onClick={closeConfirmRelease}>
                Cancel
              </Button>
              <Button
                variant="primary"
                busy={approve.isPending}
                onClick={() => approve.run(disbursement.id)}
              >
                Release now
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[#EEF1EF] py-2.5 text-[13px]">
      <span className="font-semibold text-muted">{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}
