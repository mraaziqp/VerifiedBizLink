import { formatRandAmount } from '@/lib/format-number';
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

/**
 * 'open' is a published role. The stored value predates drafts and is kept so
 * no existing row, link or query changes meaning; the label says "Published".
 */
export const JOB_STATUSES = ['draft', 'open', 'paused', 'closed'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  draft: 'Draft',
  open: 'Published',
  paused: 'Paused',
  closed: 'Closed',
};

/**
 * The pipeline an employer moves a candidate through. Ordered, because the
 * board renders these as columns left to right.
 */
export const APPLICATION_STATUSES = [
  'applied', 'reviewing', 'shortlisted', 'interview', 'hired', 'rejected', 'withdrawn',
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** The stages an employer moves someone through. Withdrawing is the candidate's move. */
export const PIPELINE_STATUSES: ApplicationStatus[] = [
  'applied', 'reviewing', 'shortlisted', 'interview', 'hired', 'rejected',
];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  applied: 'New applicants',
  reviewing: 'Reviewing',
  shortlisted: 'Shortlisted',
  interview: 'Interviewing',
  hired: 'Hired',
  rejected: 'Not proceeding',
  withdrawn: 'Withdrawn',
};

/** The same stages as the candidate reads them on their own tracker. */
export const CANDIDATE_STATUS_LABELS: Record<ApplicationStatus, string> = {
  applied: 'Applied',
  reviewing: 'Under review',
  shortlisted: 'Shortlisted',
  interview: 'Interview',
  hired: 'Hired',
  rejected: 'Not selected',
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

/**
 * Skills offered as one-tap suggestions where someone is listing their own or
 * a role's. Deliberately general: the people here are electricians, drivers,
 * bookkeepers and shop staff far more often than software developers.
 */
export const SKILL_SUGGESTIONS = [
  'Customer service', 'Sales', 'Driving licence', 'Bookkeeping', 'Excel', 'Team leadership', 'Stock control',
];

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
  const rand = (c: number) => formatRandAmount(Math.round(c / 100), 0);
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

/* ------------------------------------------------------------ public links */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);

/** "Senior Electrician (Cape Town)" -> "senior-electrician-cape-town". */
export function slugify(raw: string, max = 60): string {
  const slug = String(raw ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, max)
    .replace(/^-+|-+$/g, '');
  return slug || 'role';
}

/**
 * A job's public address: readable words plus a short code.
 *
 * The code is what makes it unique — two businesses will both post "Driver" —
 * and the slug never changes after it is issued, so a link already pasted into
 * a WhatsApp group keeps working when the employer rewords the title.
 */
export function buildJobSlug(title: string, code: string): string {
  return `${slugify(title)}-${code}`;
}

export const jobPath = (job: { slug?: string | null; id: string }) => `/jobs/${job.slug || job.id}`;

/** One line that says what the role is, for a share message or a link preview. */
export function jobSummaryLine(job: {
  companyName?: string | null;
  businessVerified?: boolean;
  locationType?: string | null;
  location?: string | null;
  employmentType?: string | null;
  salaryMinCents?: number | string | null;
  salaryMaxCents?: number | string | null;
  salaryPeriod?: string | null;
}): string {
  const where = [
    job.location,
    isLocationType(job.locationType) && job.locationType !== 'on_site' ? LOCATION_TYPE_LABELS[job.locationType] : null,
  ].filter(Boolean).join(' · ');
  return [
    job.companyName ? `${job.companyName}${job.businessVerified ? ' (verified employer)' : ''}` : null,
    where || null,
    isEmploymentType(job.employmentType) ? EMPLOYMENT_TYPE_LABELS[job.employmentType] : null,
    formatSalaryRange(job.salaryMinCents, job.salaryMaxCents, job.salaryPeriod),
  ].filter(Boolean).join(' · ');
}

/* -------------------------------------------------------- portfolio links */

export interface PortfolioLink { label: string; url: string }

const KNOWN_LINK_HOSTS: [RegExp, string][] = [
  [/(^|\.)github\.com$/, 'GitHub'],
  [/(^|\.)linkedin\.com$/, 'LinkedIn'],
  [/(^|\.)behance\.net$/, 'Behance'],
  [/(^|\.)dribbble\.com$/, 'Dribbble'],
  [/(^|\.)youtube\.com$|(^|\.)youtu\.be$/, 'YouTube'],
  [/(^|\.)instagram\.com$/, 'Instagram'],
];

export function labelForLink(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return KNOWN_LINK_HOSTS.find(([re]) => re.test(host))?.[1] ?? 'Portfolio';
  } catch {
    return 'Portfolio';
  }
}

/**
 * Links a person put on their profile, reduced to ones safe to render as an
 * anchor: http(s) only, so a `javascript:` URL saved to a profile can never
 * run in the browser of the employer who clicks it. Accepts the older
 * plain-string form as well as { label, url }.
 */
export function cleanPortfolioLinks(input: unknown, max = 8): PortfolioLink[] {
  const list = Array.isArray(input) ? input : [];
  const seen = new Set<string>();
  const out: PortfolioLink[] = [];
  for (const item of list) {
    const rawUrl = typeof item === 'string' ? item : (item as { url?: unknown } | null)?.url;
    let text = String(rawUrl ?? '').trim().slice(0, 300);
    if (!text) continue;
    if (!/^[a-z][a-z0-9+.-]*:/i.test(text)) text = `https://${text}`;
    let url: URL;
    try { url = new URL(text); } catch { continue; }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') continue;
    if (!url.hostname.includes('.')) continue;
    const href = url.toString();
    if (seen.has(href)) continue;
    seen.add(href);
    const rawLabel = typeof item === 'string' ? '' : String((item as { label?: unknown } | null)?.label ?? '');
    out.push({ label: rawLabel.trim().slice(0, 40) || labelForLink(href), url: href });
    if (out.length >= max) break;
  }
  return out;
}

/* ------------------------------------------------- status-change messages */

/**
 * What a candidate is told when an employer moves their application.
 *
 * A starting point the employer can edit before it is sent, never a message
 * sent behind their back. Returns null for stages with nothing worth saying.
 */
export function statusMessageTemplate(
  status: ApplicationStatus,
  ctx: { candidateName?: string | null; jobTitle: string; companyName: string },
): string | null {
  const first = String(ctx.candidateName ?? '').trim().split(/\s+/)[0];
  const hi = first ? `Hi ${first},` : 'Hi,';
  const role = `the ${ctx.jobTitle} role at ${ctx.companyName}`;
  switch (status) {
    case 'reviewing':
      return `${hi} thanks for applying for ${role}. We are reviewing your application and will be in touch soon.`;
    case 'shortlisted':
      return `${hi} good news — you have been shortlisted for ${role}. We will contact you shortly about next steps.`;
    case 'interview':
      return `${hi} we would like to invite you to an interview for ${role}. Please reply here with the days and times that suit you.`;
    case 'hired':
      return `${hi} congratulations — we would like to offer you ${role}. Please reply here so we can sort out the details.`;
    case 'rejected':
      return `${hi} thank you for your interest in ${role}. We have decided not to take your application further this time, and we wish you well in your search.`;
    default:
      return null;
  }
}

/** Posted "3 days ago" — relative while it is recent, a date once it is not. */
export function postedAgo(iso: string | Date | null | undefined, now = Date.now()): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const days = Math.floor((now - then) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  const d = new Date(then);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)}`;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * "12 Oct 2026", or "12 October 2026" in the long style.
 *
 * Written out rather than left to toLocaleDateString, which prints the same
 * date differently on the server and in each browser (see format-number). A
 * plain YYYY-MM-DD — a closing date — is read as that calendar day, never
 * shifted to the day before by a timezone.
 */
export function formatDay(value: string | Date | null | undefined, style: 'short' | 'long' = 'short'): string {
  if (!value) return '';
  let y: number, m: number, d: number;
  const plain = typeof value === 'string' ? value.match(/^(\d{4})-(\d{2})-(\d{2})$/) : null;
  if (plain) {
    [y, m, d] = [Number(plain[1]), Number(plain[2]) - 1, Number(plain[3])];
  } else {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    [y, m, d] = [date.getFullYear(), date.getMonth(), date.getDate()];
  }
  const month = MONTHS[m];
  if (!month) return '';
  return `${d} ${style === 'long' ? month : month.slice(0, 3)} ${y}`;
}

/**
 * The opening of a listing for a card: its first paragraph of ordinary
 * prose. Flattening the whole text instead runs a heading straight into the
 * sentence after it ("...join the team. What you will do Work with...").
 */
export function jobExcerpt(description: string | null | undefined, max = 220): string {
  const blocks = String(description ?? '').replace(/\r\n/g, '\n').split(/\n\s*\n/);
  const prose = blocks.find((b) => b.trim() && !/^\s*(#{1,3}\s|[-*•]\s|\d{1,2}[.)]\s)/.test(b));
  // A description cut short by the database can end inside a **bold** run.
  const plain = markdownToPlain(prose ?? blocks[0] ?? '').replace(/\*\*/g, '');
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 30)).trimEnd()}…`;
}

/**
 * Listing text with its formatting marks removed, for link previews, search
 * snippets and structured data — places that show characters, not markup.
 */
export function markdownToPlain(source: string | null | undefined): string {
  return String(source ?? '')
    .replace(/^#{1,3}\s+/gm, '')
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}
