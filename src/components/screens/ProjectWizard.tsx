"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Icon } from "@/components/icons";
import { Card, Segmented } from "@/components/admin/primitives";
import { cx } from "@/lib/cx";
import { nairaToKobo } from "@/lib/money";
import { useCreateProject } from "@/lib/api/queries";
import { useToast } from "@/providers/ToastProvider";
import { ApiError } from "@/lib/api/http";
import {
  projectWizardSchema,
  type ProjectWizardValues,
  type ProjectWizardInput,
  SECURITY_OPTIONS,
} from "@/lib/schemas";
import type { CreateProjectInput } from "@/lib/api/client";

const STEPS = ["Basics", "Offer terms", "Milestones", "Media", "Documents", "Review"] as const;

const DEFAULT_USE_OF_PROCEEDS: [string, number][] = [
  ["Construction", 60],
  ["Land & title", 20],
  ["Fit-out", 12],
  ["Contingency", 8],
];

function DashedBox({ label, height = 120 }: { label: string; height?: number }) {
  return (
    <div
      className="grid place-items-center gap-1.5 rounded-md border-[1.5px] border-dashed border-line p-3 text-center text-[12.5px] font-semibold text-muted"
      style={{ height }}
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

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProjectWizardInput, unknown, ProjectWizardValues>({
    resolver: zodResolver(projectWizardSchema),
    mode: "onTouched",
    defaultValues: {
      title: "",
      summary: "",
      location: "",
      category: "",
      spvName: "",
      rcNumber: "",
      tenor: "",
      securityType: "EQUITY_SHARES",
      milestones: [
        { title: "Foundation & substructure", weight: 25, tranchePct: 25, dateLabel: "" },
        { title: "Superstructure", weight: 35, tranchePct: 35, dateLabel: "" },
        { title: "Finishing & fit-out", weight: 25, tranchePct: 25, dateLabel: "" },
        { title: "Handover", weight: 15, tranchePct: 15, dateLabel: "" },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "milestones" });

  const securityType = watch("securityType");
  const milestones = watch("milestones");
  const weightTotal = milestones.reduce((sum, milestone) => sum + Number(milestone.weight || 0), 0);
  const trancheTotal = milestones.reduce(
    (sum, milestone) => sum + Number(milestone.tranchePct || 0),
    0,
  );
  const weightsOk = weightTotal === 100;
  const tranchesOk = trancheTotal === 100;
  const totalsOk = weightsOk && tranchesOk;

  const onSubmit = handleSubmit((values) => {
    const payload = {
      title: values.title,
      summary: values.summary,
      location: values.location,
      category: values.category,
      spvName: values.spvName,
      rcNumber: values.rcNumber || undefined,
      useOfProceeds: DEFAULT_USE_OF_PROCEEDS,
      offer: {
        targetMinor: nairaToKobo(values.targetNaira),
        totalShares: values.totalShares,
        minShares: values.minShares || undefined,
        securityType: values.securityType,
        tenor: values.tenor,
        projectedReturn: String(values.projectedReturn),
      },
      milestones: values.milestones.map((milestone) => ({
        title: milestone.title,
        weight: Number(milestone.weight),
        tranchePct: Number(milestone.tranchePct),
        dateLabel: milestone.dateLabel,
      })),
    } as unknown as CreateProjectInput;

    create.mutate(payload, {
      onSuccess: (detail) => {
        toast("Draft created");
        router.push(`/catalogue/${detail.id}`);
      },
      onError: (error) => toast(error instanceof ApiError ? error.message : "Create failed", "error"),
    });
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-4.5">
        <Link
          href="/catalogue"
          className="mb-2.5 inline-flex items-center gap-1 text-[13px] font-semibold text-muted"
        >
          <Icon.chevL size={16} />
          Catalogue
        </Link>
        <h1 className="m-0 text-[23px] font-bold tracking-[-.02em]">New project</h1>
      </div>

      {/* Stepper */}
      <div className="mb-5 flex flex-wrap gap-2">
        {STEPS.map((label, index) => {
          const on = index === step;
          const done = index < step;
          return (
            <button
              key={label}
              onClick={() => setStep(index)}
              className={cx(
                "inline-flex cursor-pointer items-center gap-2 rounded-[9px] border px-3.25 py-2 text-[12.5px] font-bold",
                on ? "border-primary-accent bg-primary-tint text-brand" : "border-line bg-surface text-muted",
              )}
            >
              <span
                className={cx(
                  "grid h-5 w-5 flex-none place-items-center rounded-full text-[11px]",
                  done
                    ? "bg-success text-white"
                    : on
                      ? "bg-primary-accent text-white"
                      : "bg-[#EEF1EF] text-muted",
                )}
              >
                {done ? <Icon.check size={12} /> : index + 1}
              </span>
              {label}
            </button>
          );
        })}
      </div>

      <Card>
        {/* Step: Basics */}
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <Field label="Project title" error={errors.title?.message}>
              <Input placeholder="e.g. Lekki Heights Residences" error={!!errors.title} {...register("title")} />
            </Field>
            <Field label="Summary" error={errors.summary?.message}>
              <Textarea placeholder="One-line investor summary" error={!!errors.summary} {...register("summary")} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Location" error={errors.location?.message}>
                <Input placeholder="e.g. Lekki, Lagos" error={!!errors.location} {...register("location")} />
              </Field>
              <Field label="Category" error={errors.category?.message}>
                <Input placeholder="e.g. Residential" error={!!errors.category} {...register("category")} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Developer / SPV name" error={errors.spvName?.message}>
                <Input placeholder="e.g. Edifice SPV 14 Ltd" error={!!errors.spvName} {...register("spvName")} />
              </Field>
              <Field label="RC number" optional error={errors.rcNumber?.message}>
                <Input placeholder="e.g. RC 1234567" error={!!errors.rcNumber} {...register("rcNumber")} />
              </Field>
            </div>
          </div>
        )}

        {/* Step: Offer terms */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Target raise (NGN)" error={errors.targetNaira?.message}>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="e.g. 250000000"
                  error={!!errors.targetNaira}
                  {...register("targetNaira")}
                />
              </Field>
              <Field label="Total shares" error={errors.totalShares?.message}>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="e.g. 250000"
                  error={!!errors.totalShares}
                  {...register("totalShares")}
                />
              </Field>
            </div>
            <Field label="Minimum shares per investor" optional error={errors.minShares?.message}>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="e.g. 10"
                error={!!errors.minShares}
                {...register("minShares")}
              />
            </Field>
            <Field label="Security type">
              <Segmented
                options={SECURITY_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
                value={securityType}
                onChange={(value) =>
                  setValue("securityType", value as ProjectWizardValues["securityType"])
                }
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Tenor" error={errors.tenor?.message}>
                <Input placeholder="e.g. 36 months" error={!!errors.tenor} {...register("tenor")} />
              </Field>
              <Field label="Projected return (%)" error={errors.projectedReturn?.message}>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 22"
                  error={!!errors.projectedReturn}
                  {...register("projectedReturn")}
                />
              </Field>
            </div>
            <div className="flex items-start gap-2.25 rounded-[9px] bg-[#FCF3D9] px-3.25 py-2.75 text-[12.5px] leading-normal text-[#7A5A00]">
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
            {!totalsOk && (
              <div className="mb-4 flex items-start gap-2.25 rounded-[9px] bg-[#FDECEA] px-3.25 py-2.75 text-[12.5px] leading-normal text-danger">
                <Icon.alert size={16} style={{ flex: "none", marginTop: 1 }} />
                <span>
                  Weights total {weightTotal}% and tranches total {trancheTotal}%. Both must equal
                  100% before this project can be created.
                </span>
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid grid-cols-[1fr_90px_90px_120px_36px] items-center gap-2.5"
                >
                  <Input placeholder="Milestone title" {...register(`milestones.${index}.title`)} />
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="Weight"
                    {...register(`milestones.${index}.weight`)}
                  />
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="Tranche"
                    {...register(`milestones.${index}.tranchePct`)}
                  />
                  <Input placeholder="Date label" {...register(`milestones.${index}.dateLabel`)} />
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    title="Remove"
                    className="grid h-9 cursor-pointer place-items-center rounded-md border border-line bg-surface text-danger"
                  >
                    <Icon.close size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-3.5 flex items-center justify-between">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Icon.plus size={15} />}
                onClick={() => append({ title: "", weight: 0, tranchePct: 0, dateLabel: "" })}
              >
                Add milestone
              </Button>
              <div className="flex gap-4.5 text-[12.5px] font-semibold">
                <span
                  className={cx(
                    "inline-flex items-center gap-1.5",
                    weightsOk ? "text-success" : "text-danger",
                  )}
                >
                  {weightsOk && <Icon.check size={14} />}
                  Weight = {weightTotal}%
                </span>
                <span
                  className={cx(
                    "inline-flex items-center gap-1.5",
                    tranchesOk ? "text-success" : "text-danger",
                  )}
                >
                  {tranchesOk && <Icon.check size={14} />}
                  Tranche = {trancheTotal}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Step: Media */}
        {step === 3 && (
          <div className="flex flex-col gap-3.5">
            <DashedBox label="Drag & drop project photos here, or click to upload" height={160} />
            <div className="text-[12.5px] text-muted">
              Tip: the first image becomes the cover. Set cover by reordering once uploaded.
            </div>
            <div className="grid grid-cols-4 gap-2.5">
              <DashedBox label="Set cover" height={90} />
              <DashedBox label="+ Photo" height={90} />
              <DashedBox label="+ 3D render" height={90} />
              <DashedBox label="+ 360° tour" height={90} />
            </div>
          </div>
        )}

        {/* Step: Documents */}
        {step === 4 && (
          <div className="flex flex-col gap-3.5">
            <DashedBox label="Upload offer documents (PDF)" height={140} />
            <div className="flex flex-col gap-2">
              {["Information memorandum", "SPV incorporation certificate", "Title documents", "Independent valuation"].map(
                (document) => (
                  <div
                    key={document}
                    className="flex items-center gap-2.5 rounded-[9px] border border-line px-3 py-2.5 text-[13px]"
                  >
                    <Icon.doc size={16} color="var(--muted)" />
                    <span className="flex-1">{document}</span>
                    <span className="text-xs text-muted">Not uploaded</span>
                  </div>
                ),
              )}
            </div>
          </div>
        )}

        {/* Step: Review */}
        {step === 5 && (
          <div className="flex flex-col gap-3.5">
            <div className="text-[14.5px] font-bold">Completeness checklist</div>
            <div className="flex flex-col gap-2">
              {[
                { label: "Basics (title & location)", ok: !errors.title && !errors.location },
                { label: "Offer terms (target & return)", ok: !errors.targetNaira && !errors.projectedReturn },
                { label: `Milestone weights = 100% (${weightTotal}%)`, ok: weightsOk },
                { label: `Milestone tranches = 100% (${trancheTotal}%)`, ok: tranchesOk },
                { label: "Cover image set", ok: true },
                { label: "3D / 360° media", ok: true },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2.5 rounded-[9px] border border-line px-3 py-2.5 text-[13px]"
                >
                  <span
                    className={cx(
                      "grid h-5.5 w-5.5 flex-none place-items-center rounded-full",
                      item.ok ? "bg-success text-white" : "bg-[#EEF1EF] text-muted",
                    )}
                  >
                    {item.ok ? <Icon.check size={13} /> : <Icon.close size={13} />}
                  </span>
                  <span className="flex-1 font-semibold">{item.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-1">
              <Button
                variant="primary"
                leftIcon={<Icon.check size={16} />}
                disabled={!totalsOk}
                busy={isSubmitting || create.isPending}
                onClick={onSubmit}
              >
                Create draft
              </Button>
              {!totalsOk && (
                <div className="mt-2 text-xs text-muted">
                  Complete the required fields and ensure milestone weights and tranches each total
                  100% to create the draft.
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Bottom nav */}
      <div className="mt-4 flex justify-between">
        <Button
          variant="secondary"
          disabled={step === 0}
          onClick={() => setStep((current) => Math.max(0, current - 1))}
        >
          Back
        </Button>
        {step < STEPS.length - 1 && (
          <Button
            variant="primary"
            rightIcon={<Icon.arrowR size={16} />}
            onClick={() => setStep((current) => Math.min(STEPS.length - 1, current + 1))}
          >
            Continue
          </Button>
        )}
      </div>
    </div>
  );
}
