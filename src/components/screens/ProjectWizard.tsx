"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/icons";
import { Card, Segmented, AInput, ALabel } from "@/components/admin/primitives";
import { nairaToKobo } from "@/lib/money";
import { useCreateProject } from "@/lib/api/queries";
import { useToast } from "@/providers/ToastProvider";
import { ApiError } from "@/lib/api/http";
import type { CreateProjectInput } from "@/lib/api/client";

const STEPS = ["Basics", "Offer terms", "Milestones", "Media", "Documents", "Review"] as const;

type SecurityType = "EQUITY_SHARES" | "DEBT_NOTE" | "PROFIT_PARTICIPATION";

interface MilestoneRow {
  title: string;
  weight: number;
  tranchePct: number;
  dateLabel: string;
}

const DEFAULT_MILESTONES: MilestoneRow[] = [
  { title: "Foundation & substructure", weight: 25, tranchePct: 25, dateLabel: "" },
  { title: "Superstructure", weight: 35, tranchePct: 35, dateLabel: "" },
  { title: "Finishing & fit-out", weight: 25, tranchePct: 25, dateLabel: "" },
  { title: "Handover", weight: 15, tranchePct: 15, dateLabel: "" },
];

const DEFAULT_USE_OF_PROCEEDS: [string, number][] = [
  ["Construction", 60],
  ["Land & title", 20],
  ["Fit-out", 12],
  ["Contingency", 8],
];

const textareaStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--line)",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 13.5,
  fontFamily: "var(--font)",
  outline: "none",
  resize: "vertical",
  color: "var(--ink)",
};

function Field({ label, children, optional }: { label: string; children: React.ReactNode; optional?: boolean }) {
  return (
    <div>
      <ALabel optional={optional}>{label}</ALabel>
      {children}
    </div>
  );
}

function DashedBox({ label, height = 120 }: { label: string; height?: number }) {
  return (
    <div
      style={{
        height,
        border: "1.5px dashed var(--line)",
        borderRadius: 10,
        display: "grid",
        placeItems: "center",
        color: "var(--muted)",
        fontSize: 12.5,
        fontWeight: 600,
        gap: 6,
        textAlign: "center",
        padding: 12,
      }}
    >
      {label}
    </div>
  );
}

export function ProjectWizard() {
  const router = useRouter();
  const toast = useToast();
  const create = useCreateProject();

  const [step, setStep] = useState(0);

  // Basics
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [spvName, setSpvName] = useState("");
  const [rcNumber, setRcNumber] = useState("");

  // Offer terms
  const [target, setTarget] = useState("");
  const [totalShares, setTotalShares] = useState("");
  const [minShares, setMinShares] = useState("");
  const [securityType, setSecurityType] = useState<SecurityType>("EQUITY_SHARES");
  const [tenor, setTenor] = useState("");
  const [projectedReturn, setProjectedReturn] = useState("");

  // Milestones
  const [milestones, setMilestones] = useState<MilestoneRow[]>(DEFAULT_MILESTONES);

  const targetNaira = Number(target) || 0;
  const weightTotal = milestones.reduce((s, m) => s + (Number(m.weight) || 0), 0);
  const trancheTotal = milestones.reduce((s, m) => s + (Number(m.tranchePct) || 0), 0);
  const weightsOk = weightTotal === 100;
  const tranchesOk = trancheTotal === 100;

  const basicsOk = title.trim().length > 0 && location.trim().length > 0;
  const offerOk = targetNaira > 0 && projectedReturn.trim().length > 0;
  const canCreate = basicsOk && offerOk && weightsOk && tranchesOk;

  function updateMilestone(i: number, patch: Partial<MilestoneRow>) {
    setMilestones((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addMilestone() {
    setMilestones((rows) => [...rows, { title: "", weight: 0, tranchePct: 0, dateLabel: "" }]);
  }
  function removeMilestone(i: number) {
    setMilestones((rows) => rows.filter((_, idx) => idx !== i));
  }

  function handleCreate() {
    const payload = {
      title,
      summary: summary || description,
      location,
      category,
      spvName,
      rcNumber: rcNumber || undefined,
      useOfProceeds: DEFAULT_USE_OF_PROCEEDS,
      offer: {
        targetMinor: nairaToKobo(targetNaira),
        totalShares: Number(totalShares) || 0,
        minShares: minShares ? Number(minShares) : undefined,
        securityType,
        tenor,
        projectedReturn: String(projectedReturn),
      },
      milestones: milestones.map((r) => ({
        title: r.title,
        weight: Number(r.weight),
        tranchePct: Number(r.tranchePct),
        dateLabel: r.dateLabel || undefined,
      })),
    } as unknown as CreateProjectInput;

    create.mutate(payload, {
      onSuccess: (detail) => {
        toast("Draft created");
        router.push(`/catalogue/${detail.id}`);
      },
      onError: (e) => toast(e instanceof ApiError ? e.message : "Create failed", "error"),
    });
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <Link
          href="/catalogue"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 13,
            color: "var(--muted)",
            fontWeight: 600,
            marginBottom: 10,
          }}
        >
          <Icon.chevL size={16} />
          Catalogue
        </Link>
        <h1 style={{ margin: 0, fontSize: 23, fontWeight: 700, letterSpacing: "-.02em" }}>
          New project
        </h1>
      </div>

      {/* Stepper */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {STEPS.map((s, i) => {
          const on = i === step;
          const done = i < step;
          return (
            <button
              key={s}
              onClick={() => setStep(i)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 13px",
                borderRadius: 9,
                cursor: "pointer",
                fontSize: 12.5,
                fontWeight: 700,
                background: on ? "var(--primary-tint)" : "#fff",
                border: `1px solid ${on ? "var(--primary-accent)" : "var(--line)"}`,
                color: on ? "var(--brand)" : "var(--muted)",
              }}
            >
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 99,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 11,
                  flex: "none",
                  background: done ? "var(--success)" : on ? "var(--primary-accent)" : "#EEF1EF",
                  color: done || on ? "#fff" : "var(--muted)",
                }}
              >
                {done ? <Icon.check size={12} /> : i + 1}
              </span>
              {s}
            </button>
          );
        })}
      </div>

      <Card>
        {/* Step: Basics */}
        {step === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Field label="Project title">
              <AInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Lekki Heights Residences" style={{ width: "100%" }} />
            </Field>
            <Field label="Summary">
              <AInput value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="One-line investor summary" style={{ width: "100%" }} />
            </Field>
            <Field label="Description" optional>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Full project description (optional)" style={textareaStyle} />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Location">
                <AInput value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Lekki, Lagos" style={{ width: "100%" }} />
              </Field>
              <Field label="Category">
                <AInput value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Residential" style={{ width: "100%" }} />
              </Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Developer / SPV name">
                <AInput value={spvName} onChange={(e) => setSpvName(e.target.value)} placeholder="e.g. Edifice SPV 14 Ltd" style={{ width: "100%" }} />
              </Field>
              <Field label="RC number" optional>
                <AInput value={rcNumber} onChange={(e) => setRcNumber(e.target.value)} placeholder="e.g. RC 1234567" style={{ width: "100%" }} />
              </Field>
            </div>
          </div>
        )}

        {/* Step: Offer terms */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Target raise (NGN)">
                <AInput value={target} onChange={(e) => setTarget(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" placeholder="e.g. 250000000" style={{ width: "100%" }} />
              </Field>
              <Field label="Total shares">
                <AInput value={totalShares} onChange={(e) => setTotalShares(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" placeholder="e.g. 250000" style={{ width: "100%" }} />
              </Field>
            </div>
            <Field label="Minimum shares per investor" optional>
              <AInput value={minShares} onChange={(e) => setMinShares(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" placeholder="e.g. 10" style={{ width: "100%" }} />
            </Field>
            <Field label="Security type">
              <Segmented
                options={[
                  { value: "EQUITY_SHARES", label: "Equity shares" },
                  { value: "DEBT_NOTE", label: "Debt note" },
                  { value: "PROFIT_PARTICIPATION", label: "Profit-participation" },
                ]}
                value={securityType}
                onChange={(v) => setSecurityType(v as SecurityType)}
              />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Tenor">
                <AInput value={tenor} onChange={(e) => setTenor(e.target.value)} placeholder="e.g. 36 months" style={{ width: "100%" }} />
              </Field>
              <Field label="Projected return (%)">
                <AInput value={projectedReturn} onChange={(e) => setProjectedReturn(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" placeholder="e.g. 22" style={{ width: "100%" }} />
              </Field>
            </div>
            <div
              style={{
                display: "flex",
                gap: 9,
                alignItems: "flex-start",
                padding: "11px 13px",
                borderRadius: 9,
                background: "#FCF3D9",
                color: "#7A5A00",
                fontSize: 12.5,
                lineHeight: 1.5,
              }}
            >
              <Icon.info size={16} style={{ flex: "none", marginTop: 1 }} />
              <span>
                No maximum investment to configure — Edifice projects accept any amount per investor.
              </span>
            </div>
          </div>
        )}

        {/* Step: Milestones */}
        {step === 2 && (
          <div>
            {!(weightsOk && tranchesOk) && (
              <div
                style={{
                  display: "flex",
                  gap: 9,
                  alignItems: "flex-start",
                  marginBottom: 16,
                  padding: "11px 13px",
                  borderRadius: 9,
                  background: "#FDECEA",
                  color: "var(--danger)",
                  fontSize: 12.5,
                  lineHeight: 1.5,
                }}
              >
                <Icon.alert size={16} style={{ flex: "none", marginTop: 1 }} />
                <span>
                  Weights total {weightTotal}% and tranches total {trancheTotal}%. Both must equal
                  100% before this project can be created.
                </span>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {milestones.map((m, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 90px 90px 120px 36px",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <AInput value={m.title} onChange={(e) => updateMilestone(i, { title: e.target.value })} placeholder="Milestone title" style={{ width: "100%" }} />
                  <AInput
                    value={String(m.weight)}
                    onChange={(e) => updateMilestone(i, { weight: Number(e.target.value.replace(/[^\d]/g, "")) || 0 })}
                    inputMode="numeric"
                    placeholder="Weight"
                    style={{ width: "100%" }}
                  />
                  <AInput
                    value={String(m.tranchePct)}
                    onChange={(e) => updateMilestone(i, { tranchePct: Number(e.target.value.replace(/[^\d]/g, "")) || 0 })}
                    inputMode="numeric"
                    placeholder="Tranche"
                    style={{ width: "100%" }}
                  />
                  <AInput value={m.dateLabel} onChange={(e) => updateMilestone(i, { dateLabel: e.target.value })} placeholder="Date label" style={{ width: "100%" }} />
                  <button
                    onClick={() => removeMilestone(i)}
                    title="Remove"
                    style={{
                      height: 36,
                      border: "1px solid var(--line)",
                      borderRadius: 8,
                      background: "#fff",
                      cursor: "pointer",
                      color: "var(--danger)",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <Icon.close size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
              <Button variant="secondary" size="sm" leftIcon={<Icon.plus size={15} />} onClick={addMilestone}>
                Add milestone
              </Button>
              <div style={{ display: "flex", gap: 18, fontSize: 12.5, fontWeight: 600 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: weightsOk ? "var(--success)" : "var(--danger)" }}>
                  {weightsOk && <Icon.check size={14} />}
                  Weight = {weightTotal}%
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: tranchesOk ? "var(--success)" : "var(--danger)" }}>
                  {tranchesOk && <Icon.check size={14} />}
                  Tranche = {trancheTotal}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Step: Media */}
        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <DashedBox label="Drag & drop project photos here, or click to upload" height={160} />
            <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
              Tip: the first image becomes the cover. Set cover by reordering once uploaded.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              <DashedBox label="Set cover" height={90} />
              <DashedBox label="+ Photo" height={90} />
              <DashedBox label="+ 3D render" height={90} />
              <DashedBox label="+ 360° tour" height={90} />
            </div>
          </div>
        )}

        {/* Step: Documents */}
        {step === 4 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <DashedBox label="Upload offer documents (PDF)" height={140} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {["Information memorandum", "SPV incorporation certificate", "Title documents", "Independent valuation"].map((d) => (
                <div
                  key={d}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    border: "1px solid var(--line)",
                    borderRadius: 9,
                    fontSize: 13,
                  }}
                >
                  <Icon.doc size={16} color="var(--muted)" />
                  <span style={{ flex: 1 }}>{d}</span>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>Not uploaded</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step: Review */}
        {step === 5 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700 }}>Completeness checklist</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "Basics (title & location)", ok: basicsOk },
                { label: "Offer terms (target & return)", ok: offerOk },
                { label: `Milestone weights = 100% (${weightTotal}%)`, ok: weightsOk },
                { label: `Milestone tranches = 100% (${trancheTotal}%)`, ok: tranchesOk },
                { label: "Cover image set", ok: true },
                { label: "3D / 360° media", ok: true },
              ].map((c) => (
                <div
                  key={c.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    border: "1px solid var(--line)",
                    borderRadius: 9,
                    fontSize: 13,
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 99,
                      display: "grid",
                      placeItems: "center",
                      flex: "none",
                      background: c.ok ? "var(--success)" : "#EEF1EF",
                      color: c.ok ? "#fff" : "var(--muted)",
                    }}
                  >
                    {c.ok ? <Icon.check size={13} /> : <Icon.close size={13} />}
                  </span>
                  <span style={{ flex: 1, fontWeight: 600 }}>{c.label}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 4 }}>
              <Button
                variant="primary"
                leftIcon={<Icon.check size={16} />}
                disabled={!canCreate}
                busy={create.isPending}
                onClick={handleCreate}
              >
                Create draft
              </Button>
              {!canCreate && (
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
                  Complete the required fields and ensure milestone weights and tranches each total
                  100% to create the draft.
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Bottom nav */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
        <Button variant="secondary" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
          Back
        </Button>
        {step < STEPS.length - 1 && (
          <Button variant="primary" rightIcon={<Icon.arrowR size={16} />} onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>
            Continue
          </Button>
        )}
      </div>
    </div>
  );
}
