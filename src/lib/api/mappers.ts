import { koboToNaira } from "@/lib/money";
import type { components } from "./generated/schema";
import type {
  CatalogueDetail,
  CatalogueRow,
  DashboardData,
  Disbursement,
  Flag,
  Reconciliation,
  Rule,
  Severity,
  Txn,
} from "./types";

type TxnRowDto = components["schemas"]["TxnRowDto"];
type DashboardDto = components["schemas"]["AdminDashboardDto"];
type FlagDto = components["schemas"]["FlagDto"];
type RuleDto = components["schemas"]["RuleDto"];
type DisbursementDto = components["schemas"]["DisbursementDto"];
type ReconciliationDto = components["schemas"]["ReconciliationDto"];
type CatalogueRowDto = components["schemas"]["AdminProjectRowDto"];
type CatalogueDetailDto = components["schemas"]["AdminProjectDetailDto"];

const asSeverity = (s: string | null): Severity | null =>
  s === "low" || s === "med" || s === "high" ? s : null;

export function mapTxn(d: TxnRowDto): Txn {
  return {
    id: d.id,
    occurredAt: d.occurredAt,
    type: d.type,
    amount: koboToNaira(d.amountMinor),
    project: d.project,
    party: d.party,
    status: d.status,
    severity: asSeverity(d.severity),
    flagged: d.flagged,
  };
}

export function mapDashboard(d: DashboardDto): DashboardData {
  return {
    fum: koboToNaira(d.fumMinor),
    escrowed: koboToNaira(d.escrowedMinor),
    disbursed: koboToNaira(d.disbursedMinor),
    todayVolume: koboToNaira(d.todayVolumeMinor),
    todayCount: d.todayCount,
    openFlags: d.openFlags,
    flagsHigh: d.flagsHigh,
    pendingApprovals: d.pendingApprovals,
    reconStatus: d.reconStatus === "drift" ? "drift" : "balanced",
    publishedProjects: d.publishedProjects,
    draftProjects: d.draftProjects,
    activeInvestors: d.activeInvestors,
    recentActivity: d.recentActivity.map(mapTxn),
  };
}

export function mapFlag(d: FlagDto): Flag {
  return {
    id: d.id,
    rule: d.rule,
    severity: (asSeverity(d.severity) ?? "low") as Severity,
    status: d.status,
    txn: d.txn,
    project: d.project,
    amount: d.amountMinor != null ? koboToNaira(d.amountMinor) : null,
    createdAt: d.createdAt,
  };
}

export function mapRule(d: RuleDto): Rule {
  return {
    id: d.id,
    name: d.name,
    type: d.type,
    params: d.params,
    severity: (asSeverity(d.severity) ?? "low") as Severity,
    enabled: d.enabled,
  };
}

export function mapDisbursement(d: DisbursementDto): Disbursement {
  return {
    id: d.id,
    projectId: d.projectId,
    projectTitle: d.projectTitle,
    milestoneId: d.milestoneId,
    milestoneTitle: d.milestoneTitle,
    tranchePct: d.tranchePct,
    amount: koboToNaira(d.amountMinor),
    proposedById: d.proposedById,
    proposedBy: d.proposedBy,
    proposedAt: d.proposedAt,
    status: d.status,
    escrowBalance: koboToNaira(d.escrowBalanceMinor),
  };
}

export function mapReconciliation(d: ReconciliationDto): Reconciliation {
  return {
    status: d.status === "drift" ? "drift" : "balanced",
    checkedAt: d.checkedAt,
    frozen: d.frozen,
    escrowIn: koboToNaira(d.escrowInMinor),
    disbursed: koboToNaira(d.disbursedMinor),
    netEscrow: koboToNaira(d.netEscrowMinor),
    lines: d.lines.map((l) => ({
      label: l.label,
      amount: koboToNaira(l.amountMinor),
      ok: l.ok,
    })),
  };
}

export function mapCatalogueRow(d: CatalogueRowDto): CatalogueRow {
  return {
    id: d.id,
    title: d.title,
    location: d.location,
    status: d.status,
    pctFunded: d.pctFunded,
    target: koboToNaira(d.targetMinor),
    raised: koboToNaira(d.raisedMinor),
    featured: d.featured,
    updatedBy: d.updatedBy,
    updatedAt: d.updatedAt,
  };
}

export function mapCatalogueDetail(d: CatalogueDetailDto): CatalogueDetail {
  return {
    id: d.id,
    title: d.title,
    summary: d.summary,
    location: d.location,
    category: d.category,
    coverTone: d.coverTone,
    status: d.status,
    displayStatus: d.displayStatus,
    featured: d.featured,
    pctComplete: d.pctComplete,
    pctFunded: d.pctFunded,
    target: koboToNaira(d.targetMinor),
    raised: koboToNaira(d.raisedMinor),
    escrowed: koboToNaira(d.escrowedMinor),
    disbursed: koboToNaira(d.disbursedMinor),
    totalShares: d.totalShares,
    spvName: d.spvName,
    rcNumber: d.rcNumber,
    useOfProceeds: d.useOfProceeds as unknown as [string, number][],
    milestones: d.milestones.map((m) => ({
      id: m.id,
      title: m.title,
      weight: m.weight,
      tranchePct: m.tranchePct,
      status: m.status,
      completion: m.completion,
      dateLabel: m.dateLabel,
    })),
  };
}
