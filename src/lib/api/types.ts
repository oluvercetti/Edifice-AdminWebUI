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

// ── A6 Investors ─────────────────────────────────────────────────────────────

export interface Investor {
  id: string;
  name: string;
  email: string;
  verified: string; // Verified | Review | Unverified
  invested: number;
  holdings: number;
  status: string; // Active | Suspended
  joined: string;
}

export interface VerificationStep {
  label: string;
  status: string; // passed | pending | failed | none
  detail: string;
}

export interface InvestorTxn {
  id: string;
  occurredAt: string;
  type: string;
  amount: number;
}

export interface InvestorDetail extends Investor {
  verification: VerificationStep[];
  transactions: InvestorTxn[];
}

// ── A7 Cases ─────────────────────────────────────────────────────────────────

export interface CaseRow {
  id: string;
  type: string; // Complaint | Flagged txn
  subject: string;
  investor: string | null;
  priority: string; // High | Med | Low
  status: string; // Open | Investigating | Resolved
  createdAt: string;
  assignee: string | null;
  body?: string | null;
}

// ── A8 Reports ───────────────────────────────────────────────────────────────

export interface GmvPoint {
  month: string;
  amount: number;
}

export interface ProjectPerf {
  id: string;
  title: string;
  raised: number;
  investors: number;
  pctComplete: number;
  projectedReturn: string;
}

export interface Reports {
  gmv: number;
  fum: number;
  escrowed: number;
  disbursed: number;
  payoutLiabilities: number;
  raiseSuccessRate: number;
  gmvByMonth: GmvPoint[];
  projects: ProjectPerf[];
}

// ── A9 Admin users ───────────────────────────────────────────────────────────

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  roles: string[];
  status: string; // ACTIVE | SUSPENDED
  mfaEnabled: boolean;
  lastActive: string | null;
  /** Invited but hasn't set a password / accepted yet. */
  pending: boolean;
}

// ── A10 Audit log ────────────────────────────────────────────────────────────

export interface DiffField {
  field: string;
  from: string;
  to: string;
}

export interface AuditEntry {
  id: string;
  actor: string | null;
  role: string | null;
  action: string;
  entity: string;
  at: string;
  diff: DiffField[];
}
