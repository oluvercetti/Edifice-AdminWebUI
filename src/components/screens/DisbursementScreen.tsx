"use client";
import { useMemo, useState } from "react";
import { Card, Drawer, Modal, PageHead, Segmented, Table, type Column } from "@/components/admin/primitives";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, Placeholder, Skeleton } from "@/components/ui/feedback";
import { Pill } from "@/components/ui/Pill";
import { ApiError } from "@/lib/api/http";
import { useApproveDisbursement, useDisbursements, useRejectDisbursement } from "@/lib/api/queries";
import type { Disbursement } from "@/lib/api/types";
import { useScreenState } from "@/lib/api/use-resource";
import { fmtNGN } from "@/lib/money";
import { isReadOnly } from "@/lib/roles";
import { shortDateTime } from "@/lib/txn";
import { useToast } from "@/providers/ToastProvider";
import { useAdminStore } from "@/stores/admin-store";

const FILTERS = ["All", "Awaiting approval", "Executed", "Rejected"] as const;

export function DisbursementScreen() {
  const toast = useToast();
  const admin = useAdminStore((s) => s.admin);
  const readOnly = isReadOnly(useAdminStore((s) => s.viewAs));

  const { state, data, retry } = useScreenState(useDisbursements(), {
    isEmpty: (d) => d.length === 0,
  });

  const approve = useApproveDisbursement();
  const reject = useRejectDisbursement();

  const [filter, setFilter] = useState<string>("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const rows = useMemo(() => data ?? [], [data]);

  // Re-derive the live row from the latest data so the drawer reflects updates.
  const selected = useMemo(
    () => rows.find((d) => d.id === selectedId) ?? null,
    [rows, selectedId],
  );

  const filtered = useMemo(
    () => (filter === "All" ? rows : rows.filter((d) => d.status === filter)),
    [rows, filter],
  );

  const closeDrawer = () => {
    setSelectedId(null);
    setConfirmOpen(false);
  };
  const closeModal = () => setConfirmOpen(false);

  const onApproveError = (e: unknown) =>
    toast(e instanceof ApiError ? e.message : "Failed to release disbursement.", "error");
  const onRejectError = (e: unknown) =>
    toast(e instanceof ApiError ? e.message : "Failed to reject disbursement.", "error");

  const columns: Column<Disbursement>[] = [
    {
      key: "project",
      label: "Project",
      render: (d) => (
        <div>
          <div style={{ fontWeight: 600 }}>{d.projectTitle ?? "—"}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{d.milestoneTitle ?? "—"}</div>
        </div>
      ),
    },
    { key: "tranche", label: "Tranche", w: 90, render: (d) => `${d.tranchePct}%` },
    {
      key: "amount",
      label: "Amount",
      w: 140,
      align: "right",
      render: (d) => <span style={{ fontWeight: 700 }}>{fmtNGN(d.amount)}</span>,
    },
    { key: "proposedBy", label: "Proposed by", w: 150, render: (d) => d.proposedBy ?? "—" },
    { key: "proposedAt", label: "Proposed", w: 140, render: (d) => shortDateTime(d.proposedAt) },
    { key: "status", label: "Status", w: 150, render: (d) => <Pill status={d.status} /> },
    {
      key: "escrow",
      label: "Escrow",
      w: 140,
      align: "right",
      render: (d) => <span style={{ color: "var(--muted)" }}>{fmtNGN(d.escrowBalance)}</span>,
    },
  ];

  return (
    <>
      <PageHead
        title="Disbursements"
        sub="Maker-checker approval — no funds leave escrow without a verified milestone and a second admin."
      />

      {state === "loading" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
          <div style={{ marginBottom: 16 }}>
            <Segmented size="sm" options={[...FILTERS]} value={filter} onChange={setFilter} />
          </div>
          <Card pad={0}>
            <Table
              columns={columns}
              rows={filtered}
              getId={(d) => d.id}
              activeId={selectedId}
              onRowClick={(d) => setSelectedId(d.id)}
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
        disbursement={selected}
        admin={admin}
        readOnly={readOnly}
        onClose={closeDrawer}
        confirmOpen={confirmOpen}
        openConfirm={() => setConfirmOpen(true)}
        closeModal={closeModal}
        approve={{
          isPending: approve.isPending,
          run: (id) =>
            approve.mutate(id, {
              onSuccess: () => {
                toast("Disbursement released");
                closeModal();
                closeDrawer();
              },
              onError: onApproveError,
            }),
        }}
        reject={{
          run: (id) =>
            reject.mutate(id, {
              onSuccess: () => {
                toast("Disbursement rejected");
                closeDrawer();
              },
              onError: onRejectError,
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
  confirmOpen,
  openConfirm,
  closeModal,
  approve,
  reject,
}: {
  disbursement: Disbursement | null;
  admin: AdminLike | null;
  readOnly: boolean;
  onClose: () => void;
  confirmOpen: boolean;
  openConfirm: () => void;
  closeModal: () => void;
  approve: { isPending: boolean; run: (id: string) => void };
  reject: { run: (id: string) => void };
}) {
  const open = disbursement != null;
  const isPending = disbursement?.status === "Awaiting approval";
  const isOwn = !!admin && disbursement?.proposedById === admin.id;
  const covered = disbursement != null && disbursement.escrowBalance >= disbursement.amount;

  const showActions = !readOnly && isPending;

  const footer = disbursement && (
    showActions ? (
      <>
        <Button
          variant="outlineDanger"
          onClick={() => reject.run(disbursement.id)}
        >
          Reject
        </Button>
        <Button
          variant="primary"
          disabled={isOwn}
          onClick={isOwn ? undefined : openConfirm}
        >
          Approve &amp; release
        </Button>
      </>
    ) : (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12.5,
          color: "var(--muted)",
          fontWeight: 600,
        }}
      >
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
        open={open}
        onClose={onClose}
        width={520}
        title="Disbursement review"
        sub={disbursement ? `${disbursement.projectTitle ?? "—"} · ${disbursement.milestoneTitle ?? "—"}` : undefined}
        footer={footer}
      >
        {disbursement && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Prominent amount box */}
            <div
              style={{
                border: "1px solid var(--line)",
                borderRadius: 12,
                padding: 18,
                background: "var(--canvas)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 600 }}>Releasing</div>
                <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-.02em", marginTop: 4 }}>
                  {fmtNGN(disbursement.amount)}
                </div>
              </div>
              <Pill status={disbursement.status} />
            </div>

            {/* Milestone evidence */}
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 8 }}>Milestone evidence</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Placeholder icon="camera" label="Progress photo" height={120} />
                <Placeholder icon="camera" label="Progress photo" height={120} />
              </div>
            </div>

            {/* Detail rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              <DetailRow label="Tranche" value={`${disbursement.tranchePct}%`} />
              <DetailRow label="Project escrow balance" value={fmtNGN(disbursement.escrowBalance)} />
              <DetailRow label="Proposed by" value={disbursement.proposedBy ?? "—"} />
              <DetailRow label="Proposed at" value={shortDateTime(disbursement.proposedAt)} />
            </div>

            {/* Escrow check */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                fontWeight: 600,
                padding: "10px 12px",
                borderRadius: 10,
                color: covered ? "var(--success)" : "var(--danger)",
                background: covered ? "#E6F3EC" : "#FDECEA",
              }}
            >
              {covered ? <Icon.checkCircle size={15} /> : <Icon.alert size={15} />}
              {covered
                ? "Escrow balance covers this disbursement."
                : "Insufficient escrow balance."}
            </div>

            {/* Maker-checker guardrail note */}
            {showActions && isOwn && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12.5,
                  fontWeight: 600,
                  padding: "10px 12px",
                  borderRadius: 10,
                  color: "var(--danger)",
                  background: "#FCF3D9",
                }}
              >
                <Icon.lock size={15} />
                You cannot approve your own proposal (maker-checker).
              </div>
            )}
          </div>
        )}
      </Drawer>

      <Modal open={confirmOpen} onClose={closeModal}>
        {disbursement && (
          <div>
            <div style={{ padding: "18px 20px 0" }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Release this disbursement?</div>
              <p style={{ margin: "8px 0 0", fontSize: 13.5, color: "var(--muted)", lineHeight: 1.5 }}>
                This releases {fmtNGN(disbursement.amount)} from escrow to the developer for{" "}
                {disbursement.projectTitle ?? "—"}. This cannot be undone.
              </p>
            </div>
            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
                padding: "18px 20px",
                marginTop: 6,
              }}
            >
              <Button variant="secondary" onClick={closeModal}>
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
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 0",
        borderBottom: "1px solid #EEF1EF",
        fontSize: 13,
      }}
    >
      <span style={{ color: "var(--muted)", fontWeight: 600 }}>{label}</span>
      <span style={{ color: "var(--ink)", fontWeight: 600 }}>{value}</span>
    </div>
  );
}
