// ============================================================
// Display types — the admin screens work in display NGN (numbers) and friendly
// strings; the mappers convert the backend's string-kobo DTOs into these.
// ============================================================

export type Severity = "low" | "med" | "high";

export interface Txn {
  id: string;
  occurredAt: string;
  type: string;
  amount: number;
  project: string | null;
  party: string | null;
  status: string;
  severity: Severity | null;
  flagged: boolean;
}

export interface DashboardData {
  fum: number;
  escrowed: number;
  disbursed: number;
  todayVolume: number;
  todayCount: number;
  openFlags: number;
  flagsHigh: number;
  pendingApprovals: number;
  reconStatus: "balanced" | "drift";
  publishedProjects: number;
  draftProjects: number;
  activeInvestors: number;
  recentActivity: Txn[];
}

export interface Flag {
  id: string;
  rule: string;
  severity: Severity;
  status: string;
  txn: string | null;
  project: string | null;
  amount: number | null;
  createdAt: string;
}

export interface Rule {
  id: string;
  name: string;
  type: string;
  params: string;
  severity: Severity;
  enabled: boolean;
}

export interface Disbursement {
  id: string;
  projectId: string | null;
  projectTitle: string | null;
  milestoneId: string | null;
  milestoneTitle: string | null;
  tranchePct: number;
  amount: number;
  proposedById: string | null;
  proposedBy: string | null;
  proposedAt: string;
  status: string;
  escrowBalance: number;
}

export interface ReconLine {
  label: string;
  amount: number;
  ok: boolean;
}

export interface Reconciliation {
  status: "balanced" | "drift";
  checkedAt: string;
  frozen: boolean;
  escrowIn: number;
  disbursed: number;
  netEscrow: number;
  lines: ReconLine[];
}

export interface CatalogueRow {
  id: string;
  title: string;
  location: string;
  status: string;
  pctFunded: number;
  target: number;
  raised: number;
  featured: boolean;
  updatedBy: string | null;
  updatedAt: string;
}

export interface AdminMilestone {
  id: string;
  title: string;
  weight: number;
  tranchePct: number;
  status: string;
  completion: number | null;
  dateLabel: string;
}

export interface CatalogueDetail {
  id: string;
  title: string;
  summary: string;
  location: string;
  category: string;
  coverTone: string;
  status: string;
  displayStatus: string;
  featured: boolean;
  pctComplete: number;
  pctFunded: number;
  target: number;
  raised: number;
  escrowed: number;
  disbursed: number;
  totalShares: number;
  spvName: string;
  rcNumber: string | null;
  useOfProceeds: [string, number][];
  milestones: AdminMilestone[];
}
