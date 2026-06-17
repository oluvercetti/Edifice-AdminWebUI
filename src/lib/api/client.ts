import { api } from "./http";
import type { components } from "./generated/schema";
import type { AdminUser } from "@/stores/admin-store";
import {
  mapCatalogueDetail,
  mapCatalogueRow,
  mapDashboard,
  mapDisbursement,
  mapFlag,
  mapReconciliation,
  mapRule,
  mapTxn,
} from "./mappers";
import type {
  CatalogueDetail,
  CatalogueRow,
  DashboardData,
  Disbursement,
  Flag,
  Reconciliation,
  Rule,
  Txn,
} from "./types";

type LoginResult = components["schemas"]["AdminLoginResultDto"];
type DashboardDto = components["schemas"]["AdminDashboardDto"];
type TxnRowDto = components["schemas"]["TxnRowDto"];
type FlagDto = components["schemas"]["FlagDto"];
type RuleDto = components["schemas"]["RuleDto"];
type DisbursementDto = components["schemas"]["DisbursementDto"];
type ReconciliationDto = components["schemas"]["ReconciliationDto"];
type CatalogueRowDto = components["schemas"]["AdminProjectRowDto"];
type CatalogueDetailDto = components["schemas"]["AdminProjectDetailDto"];
export type CreateProjectInput = components["schemas"]["CreateProjectDto"];

// ── Auth ─────────────────────────────────────────────────────────────────────

export const adminLogin = (email: string, password: string) =>
  api<LoginResult>("/admin/auth/login", {
    method: "POST",
    body: { email, password },
    auth: false,
  });

export const adminMfa = (code: string) =>
  api<{ admin: AdminUser }>("/admin/auth/mfa", {
    method: "POST",
    body: { code },
    auth: false,
  }).then((r) => r.admin);

export const adminLogout = () =>
  api<{ ok: boolean }>("/admin/auth/logout", { method: "POST", auth: false });

export const adminMe = () => api<AdminUser>("/admin/auth/me");

// ── Dashboard ────────────────────────────────────────────────────────────────

export const getDashboard = (): Promise<DashboardData> =>
  api<DashboardDto>("/admin/dashboard").then(mapDashboard);

// ── Catalogue ────────────────────────────────────────────────────────────────

export const getCatalogue = (): Promise<CatalogueRow[]> =>
  api<CatalogueRowDto[]>("/admin/projects").then((d) => d.map(mapCatalogueRow));

export const getProject = (id: string): Promise<CatalogueDetail> =>
  api<CatalogueDetailDto>(`/admin/projects/${encodeURIComponent(id)}`).then(
    mapCatalogueDetail,
  );

export const createProject = (body: CreateProjectInput): Promise<CatalogueDetail> =>
  api<CatalogueDetailDto>("/admin/projects", { method: "POST", body }).then(
    mapCatalogueDetail,
  );

export const updateProject = (
  id: string,
  body: CreateProjectInput,
): Promise<CatalogueDetail> =>
  api<CatalogueDetailDto>(`/admin/projects/${encodeURIComponent(id)}`, {
    method: "PUT",
    body,
  }).then(mapCatalogueDetail);

export const publishProject = (id: string): Promise<CatalogueDetail> =>
  api<CatalogueDetailDto>(`/admin/projects/${encodeURIComponent(id)}/publish`, {
    method: "POST",
  }).then(mapCatalogueDetail);

export const unpublishProject = (id: string): Promise<CatalogueDetail> =>
  api<CatalogueDetailDto>(`/admin/projects/${encodeURIComponent(id)}/unpublish`, {
    method: "POST",
  }).then(mapCatalogueDetail);

export const featureProject = (
  id: string,
  featured: boolean,
): Promise<CatalogueDetail> =>
  api<CatalogueDetailDto>(`/admin/projects/${encodeURIComponent(id)}/feature`, {
    method: "POST",
    body: { featured },
  }).then(mapCatalogueDetail);

export const postProgressUpdate = (
  id: string,
  body: { milestoneId: string; completion: number; caption: string; mediaCount?: number },
) =>
  api<components["schemas"]["PostUpdateResultDto"]>(
    `/admin/projects/${encodeURIComponent(id)}/progress`,
    { method: "POST", body },
  );

// ── Monitoring ───────────────────────────────────────────────────────────────

export const getTransactions = (filter?: {
  type?: string;
  flaggedOnly?: boolean;
}): Promise<Txn[]> => {
  const params = new URLSearchParams();
  if (filter?.type) params.set("type", filter.type);
  if (filter?.flaggedOnly) params.set("flaggedOnly", "true");
  const qs = params.toString();
  return api<TxnRowDto[]>(`/admin/monitoring/transactions${qs ? `?${qs}` : ""}`).then(
    (d) => d.map(mapTxn),
  );
};

export const getFlags = (): Promise<Flag[]> =>
  api<FlagDto[]>("/admin/monitoring/flags").then((d) => d.map(mapFlag));

export const updateFlag = (id: string, status: string): Promise<Flag[]> =>
  api<FlagDto[]>(`/admin/monitoring/flags/${id}`, {
    method: "PATCH",
    body: { status },
  }).then((d) => d.map(mapFlag));

export const getRules = (): Promise<Rule[]> =>
  api<RuleDto[]>("/admin/monitoring/rules").then((d) => d.map(mapRule));

export const updateRule = (
  id: string,
  patch: { name?: string; params?: string; severity?: string; enabled?: boolean },
): Promise<Rule> =>
  api<RuleDto>(`/admin/monitoring/rules/${id}`, { method: "PATCH", body: patch }).then(
    mapRule,
  );

// ── Disbursements (maker-checker) ─────────────────────────────────────────────

export const getDisbursements = (): Promise<Disbursement[]> =>
  api<DisbursementDto[]>("/admin/disbursements").then((d) => d.map(mapDisbursement));

export const approveDisbursement = (id: string): Promise<Disbursement> =>
  api<DisbursementDto>(`/admin/disbursements/${id}/approve`, { method: "POST" }).then(
    mapDisbursement,
  );

export const rejectDisbursement = (id: string): Promise<Disbursement> =>
  api<DisbursementDto>(`/admin/disbursements/${id}/reject`, {
    method: "POST",
    body: {},
  }).then(mapDisbursement);

// ── Reconciliation ───────────────────────────────────────────────────────────

export const getReconciliation = (): Promise<Reconciliation> =>
  api<ReconciliationDto>("/admin/reconciliation").then(mapReconciliation);
