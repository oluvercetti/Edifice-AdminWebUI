import { z } from "zod";

// ============================================================
// Form schemas (react-hook-form + zod) for the admin console.
// ============================================================

export const adminLoginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type AdminLoginValues = z.infer<typeof adminLoginSchema>;

export const postUpdateSchema = z.object({
  milestoneId: z.string().min(1, "Select a milestone"),
  completion: z.coerce.number().min(0).max(100),
  caption: z.string().min(1, "Add a short caption"),
});
export type PostUpdateValues = z.infer<typeof postUpdateSchema>;
/** Pre-coercion field types (what the inputs hold) for useForm's input generic. */
export type PostUpdateInput = z.input<typeof postUpdateSchema>;

export const ruleEditSchema = z.object({
  name: z.string().min(1, "Rule name is required"),
  params: z.string().min(1, "Condition is required"),
  severity: z.enum(["low", "med", "high"]),
});
export type RuleEditValues = z.infer<typeof ruleEditSchema>;

// ── Project create wizard ────────────────────────────────────────────────────
// The form works in display units (NGN, percent); the screen converts to the
// string-kobo CreateProjectInput payload on submit.

export const SECURITY_OPTIONS = [
  { value: "EQUITY_SHARES", label: "Equity shares" },
  { value: "DEBT_NOTE", label: "Debt note" },
  { value: "PROFIT_PARTICIPATION", label: "Profit-participation" },
] as const;

export const milestoneRowSchema = z.object({
  title: z.string().min(1, "Milestone title is required"),
  weight: z.coerce.number().min(0).max(100),
  tranchePct: z.coerce.number().min(0).max(100),
  dateLabel: z.string().optional(),
});

export const projectWizardSchema = z.object({
  title: z.string().min(1, "Project title is required"),
  summary: z.string().min(1, "A one-line summary is required"),
  location: z.string().min(1, "Location is required"),
  category: z.string().min(1, "Category is required"),
  spvName: z.string().min(1, "Developer / SPV name is required"),
  rcNumber: z.string().optional(),
  targetNaira: z.coerce.number().positive("Enter the target raise"),
  totalShares: z.coerce.number().int().positive("Enter the total shares"),
  minShares: z.coerce.number().int().min(0).optional(),
  securityType: z.enum(["EQUITY_SHARES", "DEBT_NOTE", "PROFIT_PARTICIPATION"]),
  tenor: z.string().min(1, "Tenor is required"),
  projectedReturn: z.coerce.number().min(0, "Enter the projected return"),
  milestones: z.array(milestoneRowSchema).min(1, "Add at least one milestone"),
});
export type ProjectWizardValues = z.infer<typeof projectWizardSchema>;
/** Pre-coercion field types (what the inputs hold) for useForm's input generic. */
export type ProjectWizardInput = z.input<typeof projectWizardSchema>;

// ── A9 Invite admin ──────────────────────────────────────────────────────────

export const ADMIN_ROLE_OPTIONS = [
  { value: "SUPER", label: "Super Admin", powers: "Everything" },
  { value: "CATALOGUE", label: "Catalogue", powers: "Projects & content" },
  { value: "FINANCE", label: "Finance", powers: "Money, monitoring, disbursement" },
  { value: "OPS", label: "Operations", powers: "Accounts & complaints" },
  { value: "AUDITOR", label: "Auditor", powers: "Read-only + export" },
] as const;

export const inviteAdminSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  name: z.string().optional(),
  roles: z.array(z.enum(["SUPER", "CATALOGUE", "FINANCE", "OPS", "AUDITOR"])).min(1, "Assign at least one role"),
  mfaEnabled: z.boolean(),
});
export type InviteAdminValues = z.infer<typeof inviteAdminSchema>;
