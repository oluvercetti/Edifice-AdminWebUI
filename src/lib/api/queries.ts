"use client";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
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

// No interval polling: the feed fetches on mount + on window focus, plus a
// manual Refresh button in the UI. Avoids constant per-viewer load.
export const useTransactions = (filter?: {
  type?: string;
  flaggedOnly?: boolean;
}) =>
  useInfiniteQuery({
    queryKey: queryKeys.transactions(filter?.type, filter?.flaggedOnly),
    queryFn: ({ pageParam }) => getTransactions(filter, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    select: (data) => data.pages.flatMap((p) => p.items),
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

// ── A6–A10 ───────────────────────────────────────────────────────────────────
import {
  approveIdentity,
  assignCase,
  getAdminUsers,
  getAudit,
  getCases,
  getInvestor,
  getInvestors,
  getReports,
  inviteAdmin,
  reinstateInvestor,
  rejectIdentity,
  resolveCase,
  suspendInvestor,
  updateAdmin,
  resendAdminInvite,
  type InviteAdminInput,
  type UpdateAdminInput,
} from "./client";

export const peopleKeys = {
  investors: ["investors"] as const,
  investor: (id: string) => ["investors", id] as const,
  cases: ["cases"] as const,
  reports: ["reports"] as const,
  adminUsers: ["adminUsers"] as const,
  audit: ["audit"] as const,
};

// Cursor-paginated + server-side search (`q` keys the cache so a new term
// refetches from the first page). `select` flattens pages into one array so
// screens read `.data` as before; `fetchNextPage`/`hasNextPage` drive Load more.
export const useInvestors = (q?: string) =>
  useInfiniteQuery({
    queryKey: [...peopleKeys.investors, q ?? ""],
    queryFn: ({ pageParam }) => getInvestors(pageParam, q),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    select: (data) => data.pages.flatMap((p) => p.items),
  });
export const useInvestor = (id: string) =>
  useQuery({
    queryKey: peopleKeys.investor(id),
    queryFn: () => getInvestor(id),
    enabled: Boolean(id),
  });
export const useCases = () =>
  useQuery({ queryKey: peopleKeys.cases, queryFn: getCases });
export const useReports = () =>
  useQuery({ queryKey: peopleKeys.reports, queryFn: getReports });
export const useAdminUsers = () =>
  useQuery({ queryKey: peopleKeys.adminUsers, queryFn: getAdminUsers });
export const useAudit = (q?: string) =>
  useInfiniteQuery({
    queryKey: [...peopleKeys.audit, q ?? ""],
    queryFn: ({ pageParam }) => getAudit(pageParam, q),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    select: (data) => data.pages.flatMap((p) => p.items),
  });

const INVESTOR_ACTIONS = {
  suspend: suspendInvestor,
  reinstate: reinstateInvestor,
  approveIdentity,
  rejectIdentity,
} as const;

export function useInvestorAction(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (action: keyof typeof INVESTOR_ACTIONS) => INVESTOR_ACTIONS[action](id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: peopleKeys.investor(id) });
      void qc.invalidateQueries({ queryKey: peopleKeys.investors });
      void qc.invalidateQueries({ queryKey: peopleKeys.audit });
    },
  });
}

export function useCaseAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: "assign" | "resolve" }) =>
      action === "assign" ? assignCase(id) : resolveCase(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: peopleKeys.cases }),
  });
}

export function useInviteAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: InviteAdminInput) => inviteAdmin(body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: peopleKeys.adminUsers }),
  });
}

export function useUpdateAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateAdminInput }) =>
      updateAdmin(id, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: peopleKeys.adminUsers }),
  });
}

export function useResendAdminInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => resendAdminInvite(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: peopleKeys.adminUsers }),
  });
}
