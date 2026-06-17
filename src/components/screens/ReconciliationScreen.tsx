"use client";
import { useState } from "react";
import { Card, PageHead, Stat } from "@/components/admin/primitives";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { ErrorState, Skeleton } from "@/components/ui/feedback";
import type { Reconciliation } from "@/lib/api/types";
import { useReconciliation } from "@/lib/api/queries";
import { useScreenState } from "@/lib/api/use-resource";
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
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Skeleton height={140} />
          <Skeleton height={220} />
        </div>
      )}

      {state === "error" && <ErrorState onRetry={retry} />}

      {state === "ready" && data && (
        <Console data={data} readOnly={readOnly} toast={toast} />
      )}
    </div>
  );
}

function Console({
  data,
  readOnly,
  toast,
}: {
  data: Reconciliation;
  readOnly: boolean;
  toast: (msg: string, kind?: "success" | "error" | "info") => void;
}) {
  const [frozen, setFrozen] = useState<boolean>(data.frozen);
  const balanced = data.status === "balanced";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {frozen && (
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 20,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            borderRadius: 10,
            background: "#FDECEA",
            border: "1px solid var(--danger)",
            color: "var(--danger)",
            fontSize: 13.5,
            fontWeight: 700,
          }}
        >
          <Icon.lock size={16} />
          Disbursements are frozen pending reconciliation.
        </div>
      )}

      {/* Status banner */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 14,
          padding: "20px 22px",
          borderRadius: 12,
          background: balanced ? "var(--m-disbursed-tint)" : "#FDECEA",
          border: `1px solid ${balanced ? "var(--success)" : "var(--danger)"}`,
        }}
      >
        <span
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            display: "grid",
            placeItems: "center",
            background: "#fff",
            color: balanced ? "var(--success)" : "var(--danger)",
            flex: "none",
          }}
        >
          {balanced ? <Icon.shieldCheck size={22} /> : <Icon.alert size={22} />}
        </span>
        <div>
          <div
            style={{
              fontSize: 17,
              fontWeight: 800,
              letterSpacing: "-.01em",
              color: balanced ? "var(--success)" : "var(--danger)",
            }}
          >
            {balanced ? "Balanced" : "Drift detected"}
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 3 }}>
            {balanced
              ? `All three sources agree. Last checked ${shortDateTime(data.checkedAt)}.`
              : "Sources disagree — disbursements are frozen until resolved."}
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
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
          {data.lines.map((line, i) => (
            <div
              key={line.label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                padding: "13px 2px",
                borderTop: i === 0 ? "none" : "1px solid var(--line)",
              }}
            >
              <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", flex: 1 }}>
                {line.label}
              </span>
              <span
                className="ngn"
                style={{ fontSize: 14.5, fontWeight: 700, color: "var(--ink)", textAlign: "right" }}
              >
                {fmtNGN(line.amount)}
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  width: 96,
                  justifyContent: "flex-end",
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: line.ok ? "var(--success)" : "var(--danger)",
                }}
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
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            fontSize: 12.5,
            fontWeight: 600,
            color: "var(--muted)",
          }}
        >
          <Icon.eye size={14} />
          Read-only — viewing only
        </div>
      ) : (
        <Card title="Disbursement freeze">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
              Freeze all disbursements while a discrepancy is investigated. A banner
              appears across the console while frozen.
            </p>
            <div>
              <Button
                variant={frozen ? "secondary" : "outlineDanger"}
                leftIcon={<Icon.lock size={16} />}
                onClick={() => {
                  const next = !frozen;
                  setFrozen(next);
                  toast(next ? "Disbursements frozen" : "Freeze lifted");
                }}
              >
                {frozen ? "Lift freeze" : "Freeze disbursements"}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
