import crypto from 'node:crypto';
import db, { type DbRow } from '@/lib/db';
import {
  buildJobSlug, cleanSkills, isEmploymentType, isJobStatus, isLocationType, isSalaryPeriod,
  isUuid, isAcceptingApplications, matchScore, type JobStatus,
} from '@/lib/talent';
import { ensureTalentSchema } from '@/lib/talent-schema';

/**
 * Server-side rules for job listings, shared by every route that reads or
 * writes one. A listing is validated, serialised and permission-checked here
 * so the public page, the feed, the employer's dashboard and the share
 * preview cannot drift into four slightly different ideas of what a job is.
 */

/** `%` and `_` typed into a search box are text, not wildcards. */
export const likePattern = (q: string) => `%${q.replace(/[\\%_]/g, '\\$&')}%`;

/** Comma-separated query values, cleaned and capped. */
export function csv(value: string | null, max = 12): string[] {
  return String(value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, max);
}

export interface OwnedBusiness { id: string; companyName: string; verified: boolean }

export async function ownedBusiness(userId: string): Promise<OwnedBusiness | null> {
  const [row] = await db`
    SELECT id, company_name, status FROM businesses WHERE user_id = ${userId} LIMIT 1
  `;
  return row
    ? { id: String(row.id), companyName: String(row.company_name ?? ''), verified: row.status === 'verified' }
    : null;
}

/** One job by its UUID or its public slug, with the business that posted it. */
export async function findJob(idOrSlug: string): Promise<DbRow | null> {
  await ensureTalentSchema();
  const key = String(idOrSlug ?? '').trim().toLowerCase().slice(0, 140);
  if (!key) return null;
  const byId = isUuid(key) ? key : null;
  const [row] = await db`
    SELECT j.*, b.company_name, b.status AS business_status, b.logo_url, b.trust_score,
           b.industry, b.description AS company_description, b.user_id AS owner_user_id,
           (SELECT COUNT(*)::int FROM job_applications a WHERE a.job_id = j.id) AS application_count
    FROM job_postings j
    JOIN businesses b ON b.id = j.business_id
    WHERE (${byId}::uuid IS NOT NULL AND j.id = ${byId}::uuid)
       OR (${byId}::uuid IS NULL AND j.slug = ${key})
    LIMIT 1
  `;
  return row ?? null;
}

/** Listed publicly: published, and the business still holds its badge. */
export const isPubliclyListed = (job: DbRow) => job.status === 'open' && job.business_status === 'verified';

/**
 * A logo safe to put in a list response. Some logos were saved as base64
 * data URLs when an upload fell back; forty of those in one feed response is
 * megabytes. Only real URLs go out — the card shows an initial otherwise.
 */
function hostedUrl(value: unknown): string | null {
  const s = String(value ?? '');
  return /^https?:\/\//.test(s) || s.startsWith('/') ? s : null;
}

const toNumber = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export interface JobJson {
  id: string;
  slug: string;
  title: string;
  description: string;
  requirements: string | null;
  benefits: string | null;
  requiredSkills: string[];
  employmentType: string;
  locationType: string;
  location: string | null;
  salaryMinCents: number | null;
  salaryMaxCents: number | null;
  salaryPeriod: string | null;
  salaryVisible: boolean;
  currency: string;
  applicationDeadline: string | null;
  status: JobStatus;
  createdAt: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
  viewsCount: number;
  applicationCount: number;
  acceptingApplications: boolean;
  businessId: string;
  companyName: string;
  businessVerified: boolean;
  logoUrl: string | null;
  trustScore: number | null;
  industry: string | null;
  companyDescription: string | null;
}

const isoOrNull = (v: unknown) => {
  if (!v) return null;
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

/** A DATE column, as the YYYY-MM-DD the employer picked, whatever the driver returned. */
const dateOnly = (v: unknown): string | null => {
  if (!v) return null;
  if (typeof v === 'string') return v.slice(0, 10);
  const d = new Date(v as Date);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * The shape every client reads.
 *
 * `forOwner` is the only thing that reveals a hidden salary, the view count
 * or the number of applicants. A business can advertise a range without publishing it, and hiding
 * it has to actually withhold the numbers rather than just not render them.
 */
export function toJobJson(j: DbRow, opts: { forOwner?: boolean } = {}): JobJson {
  const showSalary = opts.forOwner || j.salary_visible === true;
  return {
    id: String(j.id),
    slug: String(j.slug || j.id),
    title: String(j.title ?? ''),
    description: String(j.description ?? ''),
    requirements: (j.requirements as string) || null,
    benefits: (j.benefits as string) || null,
    requiredSkills: (j.required_skills as string[]) ?? [],
    employmentType: String(j.employment_type ?? 'full_time'),
    locationType: String(j.location_type ?? 'on_site'),
    location: (j.location as string) || null,
    // BIGINT arrives as a string; salaries are far below 2^53, so a number is exact.
    salaryMinCents: showSalary ? toNumber(j.salary_min_cents) : null,
    salaryMaxCents: showSalary ? toNumber(j.salary_max_cents) : null,
    salaryPeriod: (j.salary_period as string) || null,
    salaryVisible: j.salary_visible === true,
    currency: String(j.currency || 'ZAR'),
    applicationDeadline: dateOnly(j.application_deadline),
    status: isJobStatus(j.status) ? j.status : 'closed',
    createdAt: isoOrNull(j.created_at),
    publishedAt: isoOrNull(j.published_at),
    updatedAt: isoOrNull(j.updated_at),
    // How a listing is performing is the employer's business, not a
    // competitor's: both figures are zero for everyone else.
    viewsCount: opts.forOwner ? Number(j.views_count ?? 0) : 0,
    applicationCount: opts.forOwner ? Number(j.application_count ?? 0) : 0,
    acceptingApplications:
      j.business_status === 'verified'
      && isAcceptingApplications({ status: j.status, application_deadline: dateOnly(j.application_deadline) }),
    businessId: String(j.business_id),
    companyName: String(j.company_name ?? ''),
    businessVerified: j.business_status === 'verified',
    logoUrl: hostedUrl(j.logo_url),
    trustScore: toNumber(j.trust_score),
    industry: (j.industry as string) || null,
    companyDescription: (j.company_description as string) || null,
  };
}

/* ------------------------------------------------------------------ writes */

export interface JobFields {
  title: string;
  description: string;
  requirements: string | null;
  benefits: string | null;
  requiredSkills: string[];
  employmentType: string;
  locationType: string;
  location: string | null;
  salaryMinCents: number | null;
  salaryMaxCents: number | null;
  salaryPeriod: string;
  salaryVisible: boolean;
  applicationDeadline: string | null;
}

const randToCents = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  // Capped well above any real salary so a slipped keystroke cannot store
  // a figure that prints as nonsense on a public page.
  if (!Number.isFinite(n) || n <= 0 || n > 100_000_000) return null;
  return Math.round(n * 100);
};

const text = (v: unknown, max: number) => String(v ?? '').replace(/\r\n/g, '\n').trim().slice(0, max);

/**
 * Applies whatever the caller sent on top of what is already stored.
 *
 * A field that is absent from the body is left alone, so one endpoint serves
 * both the full editor and a single "pause" click. A field that is present
 * but empty is cleared — which the previous COALESCE-based update could not
 * do: once a salary or a closing date was saved it could never be removed.
 *
 * Salaries are accepted in rand (`salaryMin`) because that is what a person
 * types; cents are an internal detail of storage.
 */
export function mergeJobFields(body: Record<string, unknown>, current?: DbRow): JobFields {
  const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key);
  const cur = current ?? {};

  let min = has('salaryMin') ? randToCents(body.salaryMin) : (cur.salary_min_cents != null ? Number(cur.salary_min_cents) : null);
  let max = has('salaryMax') ? randToCents(body.salaryMax) : (cur.salary_max_cents != null ? Number(cur.salary_max_cents) : null);
  // A range entered backwards is a typo, not a reason to refuse the post.
  if (min && max && min > max) [min, max] = [max, min];

  let deadline: string | null = current ? dateOnly(cur.application_deadline) : null;
  if (has('applicationDeadline')) {
    const d = String(body.applicationDeadline ?? '').trim();
    deadline = /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(new Date(d).getTime()) ? d : null;
  }

  return {
    title: has('title') ? text(body.title, 160) : String(cur.title ?? ''),
    description: has('description') ? text(body.description, 20000) : String(cur.description ?? ''),
    requirements: has('requirements') ? text(body.requirements, 10000) || null : ((cur.requirements as string) ?? null),
    benefits: has('benefits') ? text(body.benefits, 6000) || null : ((cur.benefits as string) ?? null),
    requiredSkills: has('requiredSkills') ? cleanSkills(body.requiredSkills, 30) : ((cur.required_skills as string[]) ?? []),
    employmentType: isEmploymentType(body.employmentType) ? body.employmentType : String(cur.employment_type ?? 'full_time'),
    locationType: isLocationType(body.locationType) ? body.locationType : String(cur.location_type ?? 'on_site'),
    location: has('location') ? text(body.location, 120) || null : ((cur.location as string) ?? null),
    salaryMinCents: min,
    salaryMaxCents: max,
    salaryPeriod: isSalaryPeriod(body.salaryPeriod) ? body.salaryPeriod : String(cur.salary_period ?? 'month'),
    salaryVisible: typeof body.salaryVisible === 'boolean' ? body.salaryVisible : (current ? cur.salary_visible === true : true),
    applicationDeadline: deadline,
  };
}

/**
 * What is wrong with these fields, or null if they can be saved.
 *
 * A draft only needs a title — the point of a draft is that it is unfinished.
 * Publishing holds a listing to the standard a stranger will read it at.
 */
export function jobProblem(fields: JobFields, status: JobStatus): string | null {
  if (fields.title.length < 3) return 'Give the role a title.';
  if (status === 'draft') return null;
  if (fields.description.length < 30) {
    return 'Describe the role in a bit more detail so candidates know what they are applying for.';
  }
  return null;
}

/**
 * A slug nobody else holds. The code is random, so a collision is a
 * one-in-a-billion event rather than something to design around — but the
 * unique index is what actually guarantees it, and this retries if it bites.
 */
export async function insertWithSlug<T>(title: string, insert: (slug: string) => Promise<T>): Promise<T> {
  const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const bytes = crypto.randomBytes(6);
    const code = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
    try {
      return await insert(buildJobSlug(title, code));
    } catch (error) {
      lastError = error;
      if (!String((error as Error)?.message ?? '').includes('job_postings_slug_idx')) throw error;
    }
  }
  throw lastError;
}

/* ------------------------------------------------------------ applications */

export type ApplicationEventKind = 'applied' | 'status' | 'withdrawn';

/** Appends to an application's history. Never fails the request it is part of. */
export async function logApplicationEvent(event: {
  applicationId: string;
  actorUserId: string | null;
  kind: ApplicationEventKind;
  fromStatus?: string | null;
  toStatus?: string | null;
  detail?: string | null;
  messageId?: string | null;
}): Promise<void> {
  await db`
    INSERT INTO job_application_events (application_id, actor_user_id, kind, from_status, to_status, detail, message_id)
    VALUES (
      ${event.applicationId}, ${event.actorUserId}, ${event.kind},
      ${event.fromStatus ?? null}, ${event.toStatus ?? null},
      ${event.detail ? event.detail.slice(0, 2000) : null}, ${event.messageId ?? null}
    )
  `.catch((error) => console.error('Application event not recorded:', error?.message ?? error));
}

/** Base64 avatars are served by URL, never inlined into a list. */
export function avatarUrlFor(userId: unknown, avatarUrl: unknown): string | null {
  const s = String(avatarUrl ?? '');
  if (!s) return null;
  return s.startsWith('data:') ? `/api/users/${userId}/avatar` : s;
}

/* ------------------------------------------------------------ one listing */

/**
 * Counted on read rather than in a background job; an inflated view count
 * from a refresh is a smaller problem than none at all. Never awaited and
 * never fails the page it is counting.
 */
export function countJobView(jobId: string): void {
  db`UPDATE job_postings SET views_count = views_count + 1 WHERE id = ${jobId}`.catch(() => {});
}

export interface JobViewer { id: string; isStaff: boolean }

export interface JobView {
  job: JobJson;
  isOwner: boolean;
  hasApplied: boolean;
  applicationStatus: string | null;
  isSaved: boolean;
  matchScore: number | null;
  matchedSkills: string[];
  missingSkills: string[];
  viewer: { signedIn: boolean; hasProfile: boolean; canQuickApply: boolean; hasCv: boolean };
}

/**
 * Everything one job page needs, for whoever is looking.
 *
 * Returns null when this person may not see the listing, and the caller
 * answers "no longer listed" either way — so a draft's existence is not
 * confirmed to someone guessing its address.
 *
 * Published roles from verified businesses are public. Anything else is
 * visible to its owner, to staff, and to people who applied: someone needs
 * to see what they applied for last month even after the listing came down.
 */
export async function loadJobView(
  idOrSlug: string,
  viewer: JobViewer | null,
  opts: { countView?: boolean } = {},
): Promise<JobView | null> {
  const row = await findJob(idOrSlug);
  if (!row) return null;

  const isOwner = viewer?.id === String(row.owner_user_id);

  let profile: DbRow | undefined;
  let application: DbRow | undefined;
  let savedRow: DbRow | undefined;
  if (viewer) {
    [[profile], [application], [savedRow]] = await Promise.all([
      db`SELECT headline, skills, cv_url FROM talent_profiles WHERE user_id = ${viewer.id} LIMIT 1`,
      db`SELECT id, status FROM job_applications WHERE job_id = ${row.id} AND applicant_user_id = ${viewer.id} LIMIT 1`,
      db`SELECT 1 AS saved FROM saved_jobs WHERE job_id = ${row.id} AND user_id = ${viewer.id} LIMIT 1`,
    ]);
  }

  const mayView = isPubliclyListed(row)
    || isOwner
    || viewer?.isStaff === true
    || (Boolean(application) && row.status !== 'draft');
  if (!mayView) return null;

  if (opts.countView && !isOwner && isPubliclyListed(row)) countJobView(String(row.id));

  const job = toJobJson(row, { forOwner: isOwner });
  const skills = (profile?.skills as string[]) ?? [];
  const match = profile ? matchScore(skills, job.requiredSkills) : null;

  return {
    job,
    isOwner,
    hasApplied: Boolean(application),
    applicationStatus: application ? String(application.status) : null,
    isSaved: Boolean(savedRow),
    matchScore: match?.score ?? null,
    matchedSkills: match?.matched ?? [],
    missingSkills: match?.missing ?? [],
    viewer: {
      signedIn: Boolean(viewer),
      hasProfile: Boolean(profile),
      canQuickApply: Boolean(String(profile?.headline ?? '').trim()) && skills.length > 0,
      hasCv: Boolean(profile?.cv_url),
    },
  };
}
