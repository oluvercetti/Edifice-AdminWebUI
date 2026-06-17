"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Progress } from "@/components/ui/Progress";
import { Skeleton, ErrorState, Placeholder } from "@/components/ui/feedback";
import { Icon } from "@/components/icons";
import { Card, Modal } from "@/components/admin/primitives";
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
  const admin = useAdminStore((s) => s.admin);
  const viewAs = useAdminStore((s) => s.viewAs);
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
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20 }}>
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

  const p: CatalogueDetail = data;
  const current = lifecycleIndex(p.status);
  const splitTotal = p.escrowed + p.disbursed || 1;

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
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <h1 style={{ margin: 0, fontSize: 23, fontWeight: 700, letterSpacing: "-.02em" }}>
            {p.title}
          </h1>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 13,
              color: "var(--muted)",
            }}
          >
            <Icon.pin size={15} />
            {p.location}
          </span>
          <Pill status={p.status} />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.5fr 1fr",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* LEFT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Lifecycle */}
          <Card title="Lifecycle">
            <div style={{ display: "flex", alignItems: "center" }}>
              {LIFECYCLE.map((step, i) => {
                const done = i < current;
                const isCurrent = i === current;
                return (
                  <div
                    key={step}
                    style={{ display: "flex", alignItems: "center", flex: i < 3 ? 1 : "none" }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <span
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 99,
                          display: "grid",
                          placeItems: "center",
                          flex: "none",
                          background: done
                            ? "var(--success)"
                            : isCurrent
                              ? "var(--primary-accent)"
                              : "#fff",
                          border: done || isCurrent ? "none" : "1.5px solid var(--line)",
                          color: done || isCurrent ? "#fff" : "var(--muted)",
                        }}
                      >
                        {done ? <Icon.check size={15} /> : <span style={{ fontSize: 12, fontWeight: 700 }}>{i + 1}</span>}
                      </span>
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 600,
                          color: done || isCurrent ? "var(--ink)" : "var(--muted)",
                        }}
                      >
                        {step}
                      </span>
                    </div>
                    {i < 3 && (
                      <div
                        style={{
                          flex: 1,
                          height: 2,
                          margin: "0 6px",
                          marginTop: -20,
                          background: i < current ? "var(--success)" : "var(--line)",
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
            <div style={{ display: "flex", gap: 28, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600 }}>Raised</div>
                <div className="ngn" style={{ fontSize: 19, fontWeight: 800 }}>{fmtNGN(p.raised)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600 }}>Target</div>
                <div className="ngn" style={{ fontSize: 19, fontWeight: 800 }}>{fmtNGN(p.target)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600 }}>% Funded</div>
                <div style={{ fontSize: 19, fontWeight: 800 }}>{p.pctFunded}%</div>
              </div>
            </div>
            <Progress value={p.pctFunded} height={8} />

            {/* Escrow vs disbursed split bar */}
            <div
              style={{
                display: "flex",
                height: 8,
                borderRadius: 99,
                overflow: "hidden",
                marginTop: 16,
                background: "#E9EDEA",
              }}
            >
              <div style={{ width: `${(p.escrowed / splitTotal) * 100}%`, background: "var(--m-escrowed)" }} />
              <div style={{ width: `${(p.disbursed / splitTotal) * 100}%`, background: "var(--m-disbursed)" }} />
            </div>
            <div style={{ display: "flex", gap: 18, marginTop: 10, fontSize: 12.5 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 9, height: 9, borderRadius: 99, background: "var(--m-escrowed)" }} />
                <span style={{ color: "var(--muted)" }}>In escrow</span>
                <strong>{fmtNGN(p.escrowed)}</strong>
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 9, height: 9, borderRadius: 99, background: "var(--m-disbursed)" }} />
                <span style={{ color: "var(--muted)" }}>Disbursed</span>
                <strong>{fmtNGN(p.disbursed)}</strong>
              </span>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
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
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {p.useOfProceeds.map(([label, pct]) => (
                <div key={label}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12.5,
                      marginBottom: 5,
                    }}
                  >
                    <span style={{ color: "var(--ink)", fontWeight: 600 }}>{label}</span>
                    <span style={{ color: "var(--muted)" }}>{pct}%</span>
                  </div>
                  <Progress value={pct} height={6} />
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* RIGHT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {!readOnly && (
            <Card title="Publish controls">
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {!isSuper && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 12px",
                      borderRadius: 8,
                      background: "var(--canvas)",
                      color: "var(--muted)",
                      fontSize: 12.5,
                    }}
                  >
                    <Icon.lock size={15} />
                    Publish &amp; approve actions require a Super Admin.
                  </div>
                )}

                {p.status !== "Published" ? (
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
                    feature.mutate(!p.featured, {
                      onSuccess: () =>
                        toast(p.featured ? "Removed from Discover" : "Featured on Discover"),
                      onError: (e) =>
                        toast(e instanceof ApiError ? e.message : "Failed", "error"),
                    })
                  }
                >
                  {p.featured ? "Remove feature" : "Feature on Discover"}
                </Button>
              </div>
            </Card>
          )}

          {/* SPV card */}
          <Card title="Developer / SPV">
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>{p.spvName}</div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3 }}>
              {p.rcNumber ? `RC ${p.rcNumber}` : "RC number pending"}
            </div>
          </Card>
        </div>
      </div>

      {/* Publish / unpublish confirm modal */}
      <Modal open={confirm !== null} onClose={() => setConfirm(null)}>
        <div style={{ padding: 22 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
            {confirm === "unpublish" ? "Unpublish this project?" : "Publish this project?"}
          </h3>
          <p style={{ margin: "8px 0 0", fontSize: 13.5, color: "var(--muted)", lineHeight: 1.5 }}>
            {confirm === "unpublish"
              ? "This removes the project from Discover. Investors will no longer see it."
              : "This makes the project visible to investors on Discover."}
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
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
                    onError: (e) =>
                      toast(e instanceof ApiError ? e.message : "Failed", "error"),
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
                    onError: (e) =>
                      toast(e instanceof ApiError ? e.message : "Failed", "error"),
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
        milestones={p.milestones}
        pending={post.isPending}
        onSubmit={(body) =>
          post.mutate(body, {
            onSuccess: (res) => {
              toast(
                res.disbursementProposed
                  ? "Update posted · disbursement requested"
                  : "Progress update published",
              );
              setUpdateOpen(false);
            },
            onError: (e) => toast(e instanceof ApiError ? e.message : "Failed", "error"),
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
  onSubmit: (body: {
    milestoneId: string;
    completion: number;
    caption: string;
    mediaCount: number;
  }) => void;
}) {
  const first = milestones[0];
  const [milestoneId, setMilestoneId] = useState(first?.id ?? "");
  const [completion, setCompletion] = useState<number>(first?.completion ?? 0);
  const [caption, setCaption] = useState("");

  const selected = milestones.find((m) => m.id === milestoneId) ?? first;

  function selectMilestone(m: AdminMilestone) {
    setMilestoneId(m.id);
    setCompletion(m.completion ?? 0);
  }

  return (
    <Modal open={open} onClose={onClose} width={520}>
      <div style={{ padding: 22 }}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Post progress update</h3>

        {/* Milestone selector */}
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {milestones.map((m, i) => {
            const on = m.id === milestoneId;
            return (
              <button
                key={m.id}
                onClick={() => selectMilestone(m)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  padding: "10px 12px",
                  borderRadius: 9,
                  cursor: "pointer",
                  textAlign: "left",
                  background: on ? "var(--primary-tint)" : "#fff",
                  border: `1px solid ${on ? "var(--primary-accent)" : "var(--line)"}`,
                }}
              >
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 7,
                    flex: "none",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    background: on ? "var(--primary-accent)" : "#EEF1EF",
                    color: on ? "#fff" : "var(--muted)",
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{m.title}</span>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>tranche {m.tranchePct}%</span>
              </button>
            );
          })}
        </div>

        {/* Completion */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>
            Completion — {completion}%
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={completion}
            onChange={(e) => setCompletion(Number(e.target.value))}
            style={{ width: "100%", accentColor: "var(--primary-accent)" }}
          />
        </div>

        {/* Caption */}
        <div style={{ marginTop: 16 }}>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Describe what progressed on site…"
            rows={3}
            style={{
              width: "100%",
              border: "1px solid var(--line)",
              borderRadius: 8,
              padding: "10px 12px",
              fontSize: 13.5,
              fontFamily: "var(--font)",
              outline: "none",
              resize: "vertical",
              color: "var(--ink)",
            }}
          />
        </div>

        {/* Media */}
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <Placeholder icon="camera" height={70} style={{ flex: 1 }} />
          <Placeholder icon="camera" height={70} style={{ flex: 1 }} />
          <div
            style={{
              flex: 1,
              height: 70,
              border: "1.5px dashed var(--line)",
              borderRadius: 10,
              display: "grid",
              placeItems: "center",
              fontSize: 12,
              color: "var(--muted)",
              fontWeight: 600,
            }}
          >
            Add photos
          </div>
        </div>

        {/* Disbursement warning */}
        {completion >= 100 && (
          <div
            style={{
              display: "flex",
              gap: 9,
              alignItems: "flex-start",
              marginTop: 14,
              padding: "11px 13px",
              borderRadius: 9,
              background: "#FCF3D9",
              color: "#7A5A00",
              fontSize: 12.5,
              lineHeight: 1.5,
            }}
          >
            <Icon.alert size={16} style={{ flex: "none", marginTop: 1 }} />
            <span>
              Marking complete requests a disbursement of tranche {selected?.tranchePct ?? 0}% for
              this milestone — sent to Finance for two-person approval before any funds are
              released.
            </span>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            busy={pending}
            onClick={() => onSubmit({ milestoneId, completion, caption, mediaCount: 0 })}
          >
            {completion >= 100 ? "Publish & request disbursement" : "Publish update"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
