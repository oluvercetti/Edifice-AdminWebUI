"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveDisbursement,
  createProject,
  featureProject,
  getCatalogue,
  getDashboard,
  getDisbursements,
  getFlags,
  getProject,
  getReconciliation,
  getRules,
  getTransactions,
  postProgressUpdate,
  publishProject,
  rejectDisbursement,
  unpublishProject,
  updateFlag,
  updateProject,
  updateRule,
  type CreateProjectInput,
} from "./client";

export const queryKeys = {
  dashboard: ["dashboard"] as const,
  catalogue: ["catalogue"] as const,
  project: (id: string) => ["catalogue", id] as const,
  transactions: (type?: string, flaggedOnly?: boolean) =>
    ["transactions", type ?? "all", flaggedOnly ?? false] as const,
  flags: ["flags"] as const,
  rules: ["rules"] as const,
  disbursements: ["disbursements"] as const,
  reconciliation: ["reconciliation"] as const,
};

// ── Reads ──────────────────────────────────────────────────────────────────

export const useDashboard = () =>
  useQuery({ queryKey: queryKeys.dashboard, queryFn: getDashboard });

export const useCatalogue = () =>
  useQuery({ queryKey: queryKeys.catalogue, queryFn: getCatalogue });

export const useProject = (id: string) =>
  useQuery({
    queryKey: queryKeys.project(id),
    queryFn: () => getProject(id),
    enabled: Boolean(id),
  });

export const useTransactions = (
  filter?: { type?: string; flaggedOnly?: boolean },
  options?: { refetchInterval?: number },
) =>
  useQuery({
    queryKey: queryKeys.transactions(filter?.type, filter?.flaggedOnly),
    queryFn: () => getTransactions(filter),
    refetchInterval: options?.refetchInterval,
  });

export const useFlags = () =>
  useQuery({ queryKey: queryKeys.flags, queryFn: getFlags });

export const useRules = () =>
  useQuery({ queryKey: queryKeys.rules, queryFn: getRules });

export const useDisbursements = () =>
  useQuery({ queryKey: queryKeys.disbursements, queryFn: getDisbursements });

export const useReconciliation = () =>
  useQuery({ queryKey: queryKeys.reconciliation, queryFn: getReconciliation });

// ── Mutations ────────────────────────────────────────────────────────────────

function useMoneyInvalidation() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: queryKeys.disbursements });
    void qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    void qc.invalidateQueries({ queryKey: queryKeys.reconciliation });
    void qc.invalidateQueries({ queryKey: ["transactions"] });
  };
}

export function useApproveDisbursement() {
  const invalidate = useMoneyInvalidation();
  return useMutation({ mutationFn: approveDisbursement, onSuccess: invalidate });
}

export function useRejectDisbursement() {
  const invalidate = useMoneyInvalidation();
  return useMutation({ mutationFn: rejectDisbursement, onSuccess: invalidate });
}

export function useUpdateFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateFlag(id, status),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.flags });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useUpdateRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: { name?: string; params?: string; severity?: string; enabled?: boolean };
    }) => updateRule(id, patch),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.rules }),
  });
}

function useCatalogueInvalidation(id?: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: queryKeys.catalogue });
    if (id) void qc.invalidateQueries({ queryKey: queryKeys.project(id) });
    void qc.invalidateQueries({ queryKey: queryKeys.dashboard });
  };
}

export function usePublishProject(id: string) {
  const invalidate = useCatalogueInvalidation(id);
  return useMutation({ mutationFn: () => publishProject(id), onSuccess: invalidate });
}

export function useUnpublishProject(id: string) {
  const invalidate = useCatalogueInvalidation(id);
  return useMutation({ mutationFn: () => unpublishProject(id), onSuccess: invalidate });
}

export function useFeatureProject(id: string) {
  const invalidate = useCatalogueInvalidation(id);
  return useMutation({
    mutationFn: (featured: boolean) => featureProject(id, featured),
    onSuccess: invalidate,
  });
}

export function usePostUpdate(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      milestoneId: string;
      completion: number;
      caption: string;
      mediaCount?: number;
    }) => postProgressUpdate(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.project(id) });
      void qc.invalidateQueries({ queryKey: queryKeys.disbursements });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateProjectInput) => createProject(body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.catalogue }),
  });
}

export function useUpdateProject(id: string) {
  const invalidate = useCatalogueInvalidation(id);
  return useMutation({
    mutationFn: (body: CreateProjectInput) => updateProject(id, body),
    onSuccess: invalidate,
  });
}
