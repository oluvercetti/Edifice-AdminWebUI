"use client";
import { useState } from "react";
import { Card, PageHead, Stat } from "@/components/admin/primitives";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { ErrorState, Skeleton } from "@/components/ui/feedback";
import type { Reconciliation } from "@/lib/api/types";
import { useReconciliation } from "@/lib/api/queries";
import { useScreenState } from "@/lib/api/use-resource";
import { cx } from "@/lib/cx";
import { fmtNGN } from "@/lib/money";
import { isReadOnly } from "@/lib/roles";
import { shortDateTime } from "@/lib/txn";
import { useToast } from "@/providers/ToastProvider";
import { useAdminStore } from "@/stores/admin-store";

// ============================================================
// PRD A5 — reconciliation console. Proves the books balance across three
// sources (internal ledger · escrow account · payment provider). The freeze
// control is representational only (no backend mutation).
// ============================================================

export function ReconciliationScreen() {
  const toast = useToast();
  const readOnly = isReadOnly(useAdminStore((s) => s.viewAs));
  const { state, data, retry } = useScreenState(useReconciliation());

  return (
    <div>
      <PageHead
        title="Reconciliation"
        sub="Prove the books balance — internal ledger vs escrow account vs payment provider."
        actions={
          <Button
            variant="secondary"
            leftIcon={<Icon.refresh size={16} />}
            onClick={() => {
              retry();
              toast("Reconciliation re-run");
            }}
          >
            Re-run check
          </Button>
        }
      />

      {state === "loading" && (
        <div className="flex flex-col gap-4.5">
          <Skeleton height={140} />
          <Skeleton height={220} />
        </div>
      )}

      {state === "error" && <ErrorState onRetry={retry} />}

      {state === "ready" && data && (
        <ReconciliationConsole data={data} readOnly={readOnly} toast={toast} />
      )}
    </div>
  );
}

function ReconciliationConsole({
  data,
  readOnly,
  toast,
}: {
  data: Reconciliation;
  readOnly: boolean;
  toast: (msg: string, kind?: "success" | "error" | "info") => void;
}) {
  const [disbursementsFrozen, setDisbursementsFrozen] = useState<boolean>(data.frozen);
  const isBalanced = data.status === "balanced";

  return (
    <div className="flex flex-col gap-4.5">
      {disbursementsFrozen && (
        <div className="sticky top-0 z-20 flex items-center gap-2.5 rounded-md bg-[#FDECEA] px-4 py-3 text-sm font-bold text-danger border border-danger">
          <Icon.lock size={16} />
          Disbursements are frozen pending reconciliation.
        </div>
      )}

      {/* Status banner */}
      <div
        className={cx(
          "flex items-start gap-3.5 rounded-lg px-5.5 py-5 border",
          isBalanced
            ? "bg-m-disbursed-tint border-success"
            : "bg-[#FDECEA] border-danger",
        )}
      >
        <span
          className={cx(
            "grid h-10 w-10 flex-none place-items-center rounded-md bg-surface",
            isBalanced ? "text-success" : "text-danger",
          )}
        >
          {isBalanced ? <Icon.shieldCheck size={22} /> : <Icon.alert size={22} />}
        </span>
        <div>
          <div
            className={cx(
              "text-lg font-extrabold tracking-[-.01em]",
              isBalanced ? "text-success" : "text-danger",
            )}
          >
            {isBalanced ? "Balanced" : "Drift detected"}
          </div>
          <div className="mt-0.75 text-sm text-muted">
            {isBalanced
              ? `All three sources agree. Last checked ${shortDateTime(data.checkedAt)}.`
              : "Sources disagree — disbursements are frozen until resolved."}
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3.5">
        <Stat label="Total escrow-in" value={fmtNGN(data.escrowIn)} icon="trend" tone="#1570EF" />
        <Stat label="Disbursed" value={fmtNGN(data.disbursed)} icon="check" tone="#198754" />
        <Stat
          label="Net in escrow"
          value={fmtNGN(data.netEscrow)}
          icon="lock"
          tone="#146C43"
          money="var(--m-escrowed)"
        />
      </div>

      {/* Three-way comparison */}
      <Card
        title="Three-way comparison"
        sub="Internal ledger · escrow account · payment provider"
      >
        <div>
          {data.lines.map((line, index) => (
            <div
              key={line.label}
              className={cx(
                "flex items-center justify-between gap-4 px-0.5 py-3.25",
                index !== 0 && "border-t border-line",
              )}
            >
              <span className="flex-1 text-sm font-semibold text-ink">
                {line.label}
              </span>
              <span className="ngn text-right text-sm font-bold text-ink">
                {fmtNGN(line.amount)}
              </span>
              <span
                className={cx(
                  "inline-flex w-24 items-center justify-end gap-1.5 text-xs font-bold",
                  line.ok ? "text-success" : "text-danger",
                )}
              >
                {line.ok ? <Icon.check size={15} /> : <Icon.alert size={15} />}
                {line.ok ? "Matches" : "Drift"}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Freeze control */}
      {readOnly ? (
        <div className="inline-flex items-center gap-1.75 text-xs font-semibold text-muted">
          <Icon.eye size={14} />
          Read-only — viewing only
        </div>
      ) : (
        <Card title="Disbursement freeze">
          <div className="flex flex-col gap-3.5">
            <p className="m-0 text-sm leading-relaxed text-muted">
              Freeze all disbursements while a discrepancy is investigated. A banner
              appears across the console while frozen.
            </p>
            <div>
              <Button
                variant={disbursementsFrozen ? "secondary" : "outlineDanger"}
                leftIcon={<Icon.lock size={16} />}
                onClick={() => {
                  const nextFrozen = !disbursementsFrozen;
                  setDisbursementsFrozen(nextFrozen);
                  toast(nextFrozen ? "Disbursements frozen" : "Freeze lifted");
                }}
              >
                {disbursementsFrozen ? "Lift freeze" : "Freeze disbursements"}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
