"use client";
import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Progress } from "@/components/ui/Progress";
import { Skeleton, ErrorState, Placeholder } from "@/components/ui/feedback";
import { Field, Textarea } from "@/components/ui/Field";
import { Icon } from "@/components/icons";
import { Card, Modal } from "@/components/admin/primitives";
import { cx } from "@/lib/cx";
import { fmtNGN } from "@/lib/money";
import {
  useProject,
  usePublishProject,
  useUnpublishProject,
  useFeatureProject,
  usePostUpdate,
} from "@/lib/api/queries";
import { useScreenState } from "@/lib/api/use-resource";
import { useToast } from "@/providers/ToastProvider";
import { ApiError } from "@/lib/api/http";
import { useAdminStore } from "@/stores/admin-store";
import { isReadOnly } from "@/lib/roles";
import { postUpdateSchema, type PostUpdateValues, type PostUpdateInput } from "@/lib/schemas";
import type { CatalogueDetail, AdminMilestone } from "@/lib/api/types";

const LIFECYCLE = ["Draft", "Ready", "Approved", "Published"] as const;

function lifecycleIndex(status: string): number {
  if (status === "Draft") return 0;
  if (status === "Ready") return 1;
  if (status === "Approved") return 2;
  return 3; // Published / In construction
}

export function ProjectDetailScreen({ id }: { id: string }) {
  const toast = useToast();
  const admin = useAdminStore((store) => store.admin);
  const viewAs = useAdminStore((store) => store.viewAs);
  const readOnly = isReadOnly(viewAs);
  const isSuper = !!admin?.roles.includes("SUPER");

  const { state, data, retry } = useScreenState(useProject(id));

  const publish = usePublishProject(id);
  const unpublish = useUnpublishProject(id);
  const feature = useFeatureProject(id);
  const post = usePostUpdate(id);

  const [confirm, setConfirm] = useState<null | "publish" | "unpublish">(null);
  const [updateOpen, setUpdateOpen] = useState(false);

  if (state === "loading") {
    return (
      <div>
        <Skeleton height={28} style={{ width: 280, marginBottom: 18 }} />
        <div className="grid grid-cols-[1.5fr_1fr] gap-5">
          <Skeleton height={320} />
          <Skeleton height={320} />
        </div>
      </div>
    );
  }
  if (state === "error" || !data) {
    return (
      <Card>
        <ErrorState onRetry={retry} />
      </Card>
    );
  }

  const project: CatalogueDetail = data;
  const currentStep = lifecycleIndex(project.status);
  const splitTotal = project.escrowed + project.disbursed || 1;

  return (
    <div>
      {/* Header */}
      <div className="mb-4.5">
        <Link
          href="/catalogue"
          className="mb-2.5 inline-flex items-center gap-1 text-sm font-semibold text-muted"
        >
          <Icon.chevL size={16} />
          Catalogue
        </Link>
        <div className="flex flex-wrap items-center gap-3.5">
          <h1 className="m-0 text-2xl font-bold tracking-[-.02em]">{project.title}</h1>
          <span className="inline-flex items-center gap-1 text-sm text-muted">
            <Icon.pin size={15} />
            {project.location}
          </span>
          <Pill status={project.status} />
        </div>
      </div>

      <div className="grid grid-cols-[1.5fr_1fr] items-start gap-5">
        {/* LEFT */}
        <div className="flex flex-col gap-5">
          {/* Lifecycle */}
          <Card title="Lifecycle">
            <div className="flex items-center">
              {LIFECYCLE.map((step, index) => {
                const done = index < currentStep;
                const isCurrent = index === currentStep;
                return (
                  <div
                    key={step}
                    className="flex items-center"
                    style={{ flex: index < 3 ? 1 : "none" }}
                  >
                    <div className="flex flex-col items-center gap-1.5">
                      <span
                        className="grid h-7 w-7 flex-none place-items-center rounded-full"
                        style={{
                          background: done
                            ? "var(--success)"
                            : isCurrent
                              ? "var(--primary-accent)"
                              : "#fff",
                          border: done || isCurrent ? "none" : "1.5px solid var(--line)",
                          color: done || isCurrent ? "#fff" : "var(--muted)",
                        }}
                      >
                        {done ? (
                          <Icon.check size={15} />
                        ) : (
                          <span className="text-xs font-bold">{index + 1}</span>
                        )}
                      </span>
                      <span
                        className={cx(
                          "text-xs font-semibold",
                          done || isCurrent ? "text-ink" : "text-muted",
                        )}
                      >
                        {step}
                      </span>
                    </div>
                    {index < 3 && (
                      <div
                        className="-mt-5 mx-1.5 h-0.5 flex-1"
                        style={{
                          background: index < currentStep ? "var(--success)" : "var(--line)",
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Live funding */}
          <Card title="Live funding">
            <div className="mb-3.5 flex gap-7">
              <div>
                <div className="text-xs font-semibold text-muted">Raised</div>
                <div className="ngn text-xl font-extrabold">{fmtNGN(project.raised)}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted">Target</div>
                <div className="ngn text-xl font-extrabold">{fmtNGN(project.target)}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted">% Funded</div>
                <div className="text-xl font-extrabold">{project.pctFunded}%</div>
              </div>
            </div>
            <Progress value={project.pctFunded} height={8} />

            {/* Escrow vs disbursed split bar */}
            <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-[#E9EDEA]">
              <div
                className="bg-m-escrowed"
                style={{ width: `${(project.escrowed / splitTotal) * 100}%` }}
              />
              <div
                className="bg-m-disbursed"
                style={{ width: `${(project.disbursed / splitTotal) * 100}%` }}
              />
            </div>
            <div className="mt-2.5 flex gap-4.5 text-xs">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.25 w-2.25 rounded-full bg-m-escrowed" />
                <span className="text-muted">In escrow</span>
                <strong>{fmtNGN(project.escrowed)}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.25 w-2.25 rounded-full bg-m-disbursed" />
                <span className="text-muted">Disbursed</span>
                <strong>{fmtNGN(project.disbursed)}</strong>
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2.5">
              <Button variant="ghost" size="sm" leftIcon={<Icon.pulse size={15} />} href="/monitoring">
                View transactions
              </Button>
              {!readOnly && (
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Icon.camera size={15} />}
                  onClick={() => setUpdateOpen(true)}
                >
                  Post progress update
                </Button>
              )}
            </div>
          </Card>

          {/* Use of proceeds */}
          <Card title="Use of proceeds">
            <div className="flex flex-col gap-3">
              {project.useOfProceeds.map(([label, pct]) => (
                <div key={label}>
                  <div className="mb-1.25 flex justify-between text-xs">
                    <span className="font-semibold text-ink">{label}</span>
                    <span className="text-muted">{pct}%</span>
                  </div>
                  <Progress value={pct} height={6} />
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* RIGHT */}
        <div className="flex flex-col gap-5">
          {!readOnly && (
            <Card title="Publish controls">
              <div className="flex flex-col gap-3">
                {!isSuper && (
                  <div className="flex items-center gap-2 rounded-md bg-canvas px-3 py-2.5 text-xs text-muted">
                    <Icon.lock size={15} />
                    Publish &amp; approve actions require a Super Admin.
                  </div>
                )}

                {project.status !== "Published" ? (
                  <Button
                    variant="primary"
                    full
                    leftIcon={<Icon.check size={16} />}
                    disabled={!isSuper}
                    onClick={() => setConfirm("publish")}
                  >
                    Publish
                  </Button>
                ) : (
                  <Button
                    variant="outlineDanger"
                    full
                    disabled={!isSuper}
                    onClick={() => setConfirm("unpublish")}
                  >
                    Unpublish
                  </Button>
                )}

                <Button
                  variant="secondary"
                  full
                  leftIcon={<Icon.star size={16} />}
                  busy={feature.isPending}
                  onClick={() =>
                    feature.mutate(!project.featured, {
                      onSuccess: () =>
                        toast(project.featured ? "Removed from Discover" : "Featured on Discover"),
                      onError: (error) =>
                        toast(error instanceof ApiError ? error.message : "Failed", "error"),
                    })
                  }
                >
                  {project.featured ? "Remove feature" : "Feature on Discover"}
                </Button>
              </div>
            </Card>
          )}

          {/* SPV card */}
          <Card title="Developer / SPV">
            <div className="text-sm font-bold">{project.spvName}</div>
            <div className="mt-0.75 text-xs text-muted">
              {project.rcNumber ? `RC ${project.rcNumber}` : "RC number pending"}
            </div>
          </Card>
        </div>
      </div>

      {/* Publish / unpublish confirm modal */}
      <Modal open={confirm !== null} onClose={() => setConfirm(null)}>
        <div className="p-5.5">
          <h3 className="m-0 text-lg font-bold">
            {confirm === "unpublish" ? "Unpublish this project?" : "Publish this project?"}
          </h3>
          <p className="mt-2 mb-0 text-sm leading-normal text-muted">
            {confirm === "unpublish"
              ? "This removes the project from Discover. Investors will no longer see it."
              : "This makes the project visible to investors on Discover."}
          </p>
          <div className="mt-5 flex justify-end gap-2.5">
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            {confirm === "unpublish" ? (
              <Button
                variant="outlineDanger"
                busy={unpublish.isPending}
                onClick={() =>
                  unpublish.mutate(undefined, {
                    onSuccess: () => {
                      toast("Project unpublished");
                      setConfirm(null);
                    },
                    onError: (error) =>
                      toast(error instanceof ApiError ? error.message : "Failed", "error"),
                  })
                }
              >
                Unpublish
              </Button>
            ) : (
              <Button
                variant="primary"
                busy={publish.isPending}
                onClick={() =>
                  publish.mutate(undefined, {
                    onSuccess: () => {
                      toast("Project published");
                      setConfirm(null);
                    },
                    onError: (error) =>
                      toast(error instanceof ApiError ? error.message : "Failed", "error"),
                  })
                }
              >
                Publish
              </Button>
            )}
          </div>
        </div>
      </Modal>

      <PostUpdateModal
        open={updateOpen}
        onClose={() => setUpdateOpen(false)}
        milestones={project.milestones}
        pending={post.isPending}
        onSubmit={(values) =>
          post.mutate(values, {
            onSuccess: (res) => {
              toast(
                res.disbursementProposed
                  ? "Update posted · disbursement requested"
                  : "Progress update published",
              );
              setUpdateOpen(false);
            },
            onError: (error) =>
              toast(error instanceof ApiError ? error.message : "Failed", "error"),
          })
        }
      />
    </div>
  );
}

// ── Post-update modal ────────────────────────────────────────────────────────

function PostUpdateModal({
  open,
  onClose,
  milestones,
  pending,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  milestones: AdminMilestone[];
  pending: boolean;
  onSubmit: (values: PostUpdateValues) => void;
}) {
  const first = milestones[0];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PostUpdateInput, unknown, PostUpdateValues>({
    resolver: zodResolver(postUpdateSchema),
    defaultValues: {
      milestoneId: first?.id ?? "",
      completion: first?.completion ?? 0,
      caption: "",
    },
  });

  const milestoneId = watch("milestoneId");
  const completion = Number(watch("completion")) || 0;
  const selected = milestones.find((milestone) => milestone.id === milestoneId) ?? first;

  function selectMilestone(milestone: AdminMilestone) {
    setValue("milestoneId", milestone.id);
    setValue("completion", milestone.completion ?? 0);
  }

  return (
    <Modal open={open} onClose={onClose} width={520}>
      <form onSubmit={handleSubmit(onSubmit)} className="p-5.5">
        <h3 className="m-0 text-lg font-bold">Post progress update</h3>

        {/* Milestone selector */}
        <div className="mt-4 flex flex-col gap-2">
          {milestones.map((milestone, index) => {
            const selectedRow = milestone.id === milestoneId;
            return (
              <button
                key={milestone.id}
                type="button"
                onClick={() => selectMilestone(milestone)}
                className={cx(
                  "flex cursor-pointer items-center gap-2.75 rounded-md border px-3 py-2.5 text-left",
                  selectedRow
                    ? "border-primary-accent bg-primary-tint"
                    : "border-line bg-surface",
                )}
              >
                <span
                  className={cx(
                    "grid h-6 w-6 flex-none place-items-center rounded-sm text-xs font-bold",
                    selectedRow
                      ? "bg-primary-accent text-white"
                      : "bg-[#EEF1EF] text-muted",
                  )}
                >
                  {index + 1}
                </span>
                <span className="flex-1 text-sm font-semibold">{milestone.title}</span>
                <span className="text-xs text-muted">tranche {milestone.tranchePct}%</span>
              </button>
            );
          })}
        </div>

        {/* Completion */}
        <div className="mt-4">
          <div className="mb-2 text-xs font-semibold">Completion — {completion}%</div>
          <input
            type="range"
            min={0}
            max={100}
            className="w-full accent-(--primary-accent)"
            {...register("completion", { valueAsNumber: true })}
          />
        </div>

        {/* Caption */}
        <div className="mt-4">
          <Field label="" error={errors.caption?.message}>
            <Textarea
              placeholder="Describe what progressed on site…"
              rows={3}
              error={!!errors.caption}
              {...register("caption")}
            />
          </Field>
        </div>

        {/* Media */}
        <div className="mt-3 flex gap-2.5">
          <Placeholder icon="camera" height={70} style={{ flex: 1 }} />
          <Placeholder icon="camera" height={70} style={{ flex: 1 }} />
          <div className="grid h-17.5 flex-1 place-items-center rounded-md border-[1.5px] border-dashed border-line text-xs font-semibold text-muted">
            Add photos
          </div>
        </div>

        {/* Disbursement warning */}
        {completion >= 100 && (
          <div className="mt-3.5 flex items-start gap-2.25 rounded-md bg-[#FCF3D9] px-3.25 py-2.75 text-xs leading-normal text-[#7A5A00]">
            <Icon.alert size={16} style={{ flex: "none", marginTop: 1 }} />
            <span>
              Marking complete requests a disbursement of tranche {selected?.tranchePct ?? 0}% for
              this milestone — sent to Finance for two-person approval before any funds are
              released.
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="mt-5 flex justify-end gap-2.5">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" busy={pending}>
            {completion >= 100 ? "Publish & request disbursement" : "Publish update"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
