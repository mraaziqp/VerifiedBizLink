/**
 * Verified Talent: shared rules for profiles, jobs and matching.
 *
 * Everything here is deliberately dependency-free so an API route, a script
 * and (where it doesn't touch the database) a client component can all agree
 * on what a skill is and what a match score means. Two places computing a
 * "match" slightly differently is how a candidate sees 80% and the employer
 * sorting by the same number sees something else.
 */

export const EMPLOYMENT_TYPES = [
  'full_time', 'part_time', 'contract', 'temporary', 'internship', 'learnership',
] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const LOCATION_TYPES = ['on_site', 'hybrid', 'remote'] as const;
export type LocationType = (typeof LOCATION_TYPES)[number];

export const SALARY_PERIODS = ['hour', 'day', 'month', 'year'] as const;
export type SalaryPeriod = (typeof SALARY_PERIODS)[number];

export const JOB_STATUSES = ['open', 'paused', 'closed'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

/**
 * The pipeline an employer moves a candidate through. Ordered, because the
 * board renders these as columns left to right.
 */
export const APPLICATION_STATUSES = [
  'applied', 'shortlisted', 'interview', 'hired', 'rejected', 'withdrawn',
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  applied: 'New applicants',
  shortlisted: 'Shortlisted',
  interview: 'Interviewing',
  hired: 'Hired',
  rejected: 'Not proceeding',
  withdrawn: 'Withdrawn',
};

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: 'Full time',
  part_time: 'Part time',
  contract: 'Contract',
  temporary: 'Temporary',
  internship: 'Internship',
  learnership: 'Learnership',
};

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  on_site: 'On site',
  hybrid: 'Hybrid',
  remote: 'Remote',
};

export function isEmploymentType(v: unknown): v is EmploymentType {
  return typeof v === 'string' && (EMPLOYMENT_TYPES as readonly string[]).includes(v);
}
export function isLocationType(v: unknown): v is LocationType {
  return typeof v === 'string' && (LOCATION_TYPES as readonly string[]).includes(v);
}
export function isSalaryPeriod(v: unknown): v is SalaryPeriod {
  return typeof v === 'string' && (SALARY_PERIODS as readonly string[]).includes(v);
}
export function isJobStatus(v: unknown): v is JobStatus {
  return typeof v === 'string' && (JOB_STATUSES as readonly string[]).includes(v);
}
export function isApplicationStatus(v: unknown): v is ApplicationStatus {
  return typeof v === 'string' && (APPLICATION_STATUSES as readonly string[]).includes(v);
}

/**
 * One canonical form for a skill.
 *
 * People type "React.js", "react js" and "  REACT  " for the same thing. The
 * display form is kept as the person wrote it; this is only ever used for
 * comparison, so matching does not silently depend on someone's capitalisation.
 */
export function normaliseSkill(raw: string): string {
  return String(raw ?? '')
    .toLowerCase()
    .replace(/[._/]+/g, ' ')
    .replace(/[^a-z0-9+#\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Cleans a user-supplied skill list: trimmed, de-duplicated, bounded. */
export function cleanSkills(input: unknown, max = 50): string[] {
  const list = Array.isArray(input)
    ? input
    : String(input ?? '').split(',');

  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    const display = String(item ?? '').trim().slice(0, 60);
    if (!display) continue;
    const key = normaliseSkill(display);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(display);
    if (out.length >= max) break;
  }
  return out;
}

export interface MatchResult {
  /** 0-100. What proportion of the job's requirements this person has. */
  score: number;
  matched: string[];
  missing: string[];
}

/**
 * How well a candidate fits a job.
 *
 * Measured against what the JOB asks for, not against everything the
 * candidate knows — otherwise a person listing forty skills would score badly
 * on a job needing three of them, which is exactly backwards.
 *
 * A job with no listed requirements is open to anyone, so it scores 100 rather
 * than dividing by zero.
 */
export function matchScore(candidateSkills: string[], requiredSkills: string[]): MatchResult {
  const required = cleanSkills(requiredSkills);
  if (required.length === 0) return { score: 100, matched: [], missing: [] };

  const have = new Set(candidateSkills.map(normaliseSkill).filter(Boolean));

  const matched: string[] = [];
  const missing: string[] = [];
  for (const skill of required) {
    if (have.has(normaliseSkill(skill))) matched.push(skill);
    else missing.push(skill);
  }

  return {
    score: Math.round((matched.length / required.length) * 100),
    matched,
    missing,
  };
}

/** Rand for display; salaries are stored in cents like all other money here. */
export function formatSalaryRange(
  minCents: number | string | null | undefined,
  maxCents: number | string | null | undefined,
  period: string | null | undefined,
): string | null {
  const rand = (c: number) => `R${Math.round(c / 100).toLocaleString('en-ZA')}`;
  const suffix = period ? `/${period}` : '';

  /**
   * Coerced, not type-checked.
   *
   * Salaries are BIGINT so a large annual figure cannot overflow, and node-postgres
   * hands int8 back as a STRING to avoid losing precision past 2^53. A plain
   * `typeof x === 'number'` test therefore rejected every real salary and this
   * returned null — the range was stored correctly and simply never displayed.
   */
  const toCents = (v: number | string | null | undefined): number | null => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const min = toCents(minCents);
  const max = toCents(maxCents);

  if (min && max) return `${rand(min)} – ${rand(max)}${suffix}`;
  if (min) return `From ${rand(min)}${suffix}`;
  if (max) return `Up to ${rand(max)}${suffix}`;
  return null;
}

/** A job is applicable only while open and before its deadline passes. */
export function isAcceptingApplications(job: {
  status?: string | null;
  application_deadline?: string | Date | null;
}): boolean {
  if (job.status !== 'open') return false;
  if (!job.application_deadline) return true;
  const deadline = new Date(job.application_deadline);
  if (Number.isNaN(deadline.getTime())) return true;
  // Inclusive of the closing day itself.
  deadline.setHours(23, 59, 59, 999);
  return deadline.getTime() >= Date.now();
}
