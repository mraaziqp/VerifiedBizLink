/**
 * The single source of truth for who can reach what.
 *
 * Deliberately dependency-free: `middleware.ts` runs on the Edge runtime and
 * cannot import anything that pulls in the database client, so this module
 * must stay pure constants and pure functions. Both the middleware and the
 * server-side route guards import from here, which is the point — previously
 * the staff list was duplicated in two files and could drift.
 */

export const ROLES = {
  ADMIN: 'admin',
  BANKER: 'banker',
  LAWYER: 'lawyer',
  FINANCE_ADMIN: 'finance_admin',
  COMPLIANCE_ADMIN: 'compliance_admin',
  SALES_AGENT: 'sales_agent',
  BUSINESS: 'business',
  CUSTOMER: 'customer',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/**
 * Roles that may reach /admin and the /api/admin/* routes.
 *
 * `sales_agent` is deliberately absent. Agents are internal staff in the
 * organisational sense, but the brief is explicit that they get zero access
 * to admin features — so they are gated exactly like a member of the public
 * as far as the admin area is concerned.
 */
export const STAFF_ROLES: string[] = [
  ROLES.ADMIN,
  ROLES.BANKER,
  ROLES.LAWYER,
  ROLES.FINANCE_ADMIN,
  ROLES.COMPLIANCE_ADMIN,
];

/** Full platform control — user management, role assignment, tier config. */
export const SUPER_ADMIN_ROLES: string[] = [ROLES.ADMIN];

/** Payments, revenue, invoicing, commission payouts. */
export const FINANCE_ROLES: string[] = [ROLES.ADMIN, ROLES.FINANCE_ADMIN];

/** Vetting desk, document review, moderation. */
export const COMPLIANCE_ROLES: string[] = [
  ROLES.ADMIN,
  ROLES.COMPLIANCE_ADMIN,
  ROLES.BANKER,
  ROLES.LAWYER,
];

/** Who may open the isolated agent portal. Admins are included for oversight. */
export const AGENT_PORTAL_ROLES: string[] = [ROLES.SALES_AGENT, ROLES.ADMIN];

export function hasRole(role: string | undefined | null, allowed: string[]): boolean {
  return !!role && allowed.includes(role);
}

export function isStaffRole(role: string | undefined | null): boolean {
  return hasRole(role, STAFF_ROLES);
}

export function isSalesAgentRole(role: string | undefined | null): boolean {
  return role === ROLES.SALES_AGENT;
}

/**
 * Human-readable labels for the admin UI. Keys are the raw DB values.
 */
export const ROLE_LABELS: Record<string, string> = {
  [ROLES.ADMIN]: 'Super Admin',
  [ROLES.FINANCE_ADMIN]: 'Finance Admin',
  [ROLES.COMPLIANCE_ADMIN]: 'Compliance Admin',
  [ROLES.BANKER]: 'Compliance Officer',
  [ROLES.LAWYER]: 'Legal',
  [ROLES.SALES_AGENT]: 'Sales Agent',
  [ROLES.BUSINESS]: 'Business',
  [ROLES.CUSTOMER]: 'Customer',
};
