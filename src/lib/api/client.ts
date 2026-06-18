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

type TxnPageDtoT = components["schemas"]["TxnPageDto"];

export const getTransactions = (
  filter?: { type?: string; flaggedOnly?: boolean },
  cursor?: string | null,
): Promise<Page<Txn>> => {
  const params = new URLSearchParams();
  if (filter?.type) params.set("type", filter.type);
  if (filter?.flaggedOnly) params.set("flaggedOnly", "true");
  if (cursor) params.set("cursor", cursor);
  const qs = params.toString();
  return api<TxnPageDtoT>(
    `/admin/monitoring/transactions${qs ? `?${qs}` : ""}`,
  ).then((d) => ({ items: d.items.map(mapTxn), nextCursor: d.nextCursor }));
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

// ── A6–A10 ───────────────────────────────────────────────────────────────────
import {
  mapAdminUser,
  mapAuditEntry,
  mapCase,
  mapInvestor,
  mapInvestorDetail,
  mapReports,
} from "./mappers";
import type {
  AdminUserRow,
  AuditEntry,
  CaseRow,
  Investor,
  InvestorDetail,
  Reports,
} from "./types";

type InvestorDetailDtoT = components["schemas"]["InvestorDetailDto"];
type CaseRowDtoT = components["schemas"]["CaseRowDto"];
type ReportsDtoT = components["schemas"]["ReportsDto"];
type AdminUserRowDtoT = components["schemas"]["AdminUserRowDto"];
export type InviteAdminInput = components["schemas"]["InviteAdminDto"];
export type UpdateAdminInput = components["schemas"]["UpdateAdminDto"];

type InvestorsPageDtoT = components["schemas"]["InvestorsPageDto"];
type AuditPageDtoT = components["schemas"]["AuditPageDto"];

/** A page of mapped items + the opaque cursor for the next page (null = end). */
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

/** Build a `?limit=&cursor=&q=` query string for a cursor-paginated endpoint. */
function pageQuery(cursor?: string | null, limit?: number, q?: string): string {
  const params = new URLSearchParams();
  if (limit) params.set("limit", String(limit));
  if (cursor) params.set("cursor", cursor);
  if (q) params.set("q", q);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

// A6 — Investors
export const getInvestors = (
  cursor?: string | null,
  q?: string,
): Promise<Page<Investor>> =>
  api<InvestorsPageDtoT>(`/admin/investors${pageQuery(cursor, undefined, q)}`).then(
    (d) => ({ items: d.items.map(mapInvestor), nextCursor: d.nextCursor }),
  );
export const getInvestor = (id: string): Promise<InvestorDetail> =>
  api<InvestorDetailDtoT>(`/admin/investors/${encodeURIComponent(id)}`).then(mapInvestorDetail);
const investorAction = (id: string, action: string) =>
  api<InvestorDetailDtoT>(`/admin/investors/${encodeURIComponent(id)}/${action}`, {
    method: "POST",
  }).then(mapInvestorDetail);
export const suspendInvestor = (id: string) => investorAction(id, "suspend");
export const reinstateInvestor = (id: string) => investorAction(id, "reinstate");
export const approveIdentity = (id: string) => investorAction(id, "identity/approve");
export const rejectIdentity = (id: string) => investorAction(id, "identity/reject");

// A7 — Cases
export const getCases = (): Promise<CaseRow[]> =>
  api<CaseRowDtoT[]>("/admin/cases").then((d) => d.map(mapCase));
export const assignCase = (id: string): Promise<CaseRow> =>
  api<CaseRowDtoT>(`/admin/cases/${id}/assign`, { method: "POST" }).then(mapCase);
export const resolveCase = (id: string): Promise<CaseRow> =>
  api<CaseRowDtoT>(`/admin/cases/${id}/resolve`, { method: "POST" }).then(mapCase);

// A8 — Reports
export const getReports = (): Promise<Reports> =>
  api<ReportsDtoT>("/admin/reports").then(mapReports);

// A9 — Admin users
export const getAdminUsers = (): Promise<AdminUserRow[]> =>
  api<AdminUserRowDtoT[]>("/admin/admins").then((d) => d.map(mapAdminUser));
export const inviteAdmin = (body: InviteAdminInput): Promise<AdminUserRow> =>
  api<AdminUserRowDtoT>("/admin/admins", { method: "POST", body }).then(mapAdminUser);
export const updateAdmin = (id: string, body: UpdateAdminInput): Promise<AdminUserRow> =>
  api<AdminUserRowDtoT>(`/admin/admins/${id}`, { method: "PATCH", body }).then(mapAdminUser);

// A10 — Audit log
export const getAudit = (
  cursor?: string | null,
  q?: string,
): Promise<Page<AuditEntry>> =>
  api<AuditPageDtoT>(`/admin/audit${pageQuery(cursor, undefined, q)}`).then(
    (d) => ({ items: d.items.map(mapAuditEntry), nextCursor: d.nextCursor }),
  );
