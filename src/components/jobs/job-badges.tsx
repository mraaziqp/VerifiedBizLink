import { Briefcase, Building2, Clock, Globe2, MapPin, ShieldCheck, Sparkles } from 'lucide-react';
import {
  APPLICATION_STATUS_LABELS, EMPLOYMENT_TYPE_LABELS, JOB_STATUS_LABELS, LOCATION_TYPE_LABELS,
  formatSalaryRange, isEmploymentType, isLocationType, postedAgo,
  type ApplicationStatus, type JobStatus,
} from '@/lib/talent';
import type { JobJson } from '@/lib/jobs-server';
import { cn } from '@/lib/utils';

/**
 * The chips a job is described with, in one place so a role looks the same
 * on the feed, in the quick view, on its public page and in the employer's
 * own list.
 */

/** A feed item: the listing plus how it relates to the person looking. */
export type JobListItem = JobJson & {
  /** The opening of the description, as plain text. The full text comes with the job itself. */
  excerpt: string;
  matchScore: number | null;
  matchedSkills: string[];
  missingSkills: string[];
  hasApplied: boolean;
  isSaved: boolean;
};

const chip = 'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold';

export function VerifiedChip({ className }: { className?: string }) {
  return (
    <span className={cn(chip, 'border-emerald-200 bg-emerald-50 text-emerald-800', className)}>
      <ShieldCheck className="h-3 w-3 text-emerald-600" /> Verified business
    </span>
  );
}

export function MatchBadge({ score, className, compact = false }: { score: number; className?: string; compact?: boolean }) {
  const tone = score >= 75
    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
    : score >= 40
      ? 'bg-amber-50 text-amber-900 border-amber-200'
      : 'bg-slate-100 text-slate-700 border-slate-200';
  return (
    <span className={cn(chip, 'font-bold', tone, className)} title={compact ? `${score}% skills match` : undefined}>
      <Sparkles className="h-3 w-3 text-amber-700" />
      {score}%{compact ? <span className="sr-only"> match</span> : ' match'}
    </span>
  );
}

const JOB_STATUS_TONE: Record<JobStatus, string> = {
  draft: 'bg-slate-100 text-slate-700 border-slate-300 border-dashed',
  open: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  paused: 'bg-amber-50 text-amber-800 border-amber-200',
  closed: 'bg-slate-100 text-slate-500 border-slate-200',
};

export function JobStatusPill({ status, className }: { status: JobStatus; className?: string }) {
  return (
    <span className={cn(chip, 'font-bold', JOB_STATUS_TONE[status] ?? JOB_STATUS_TONE.closed, className)}>
      {status === 'open' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
      {JOB_STATUS_LABELS[status] ?? status}
    </span>
  );
}

export const APPLICATION_STATUS_TONE: Record<ApplicationStatus, string> = {
  applied: 'bg-blue-50 text-blue-700 border-blue-200',
  reviewing: 'bg-sky-50 text-sky-800 border-sky-200',
  shortlisted: 'bg-amber-50 text-amber-800 border-amber-200',
  interview: 'bg-purple-50 text-purple-700 border-purple-200',
  hired: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-slate-100 text-slate-600 border-slate-200',
  withdrawn: 'bg-slate-100 text-slate-500 border-slate-200',
};

export function ApplicationStatusPill({
  status, labels = APPLICATION_STATUS_LABELS, className,
}: { status: ApplicationStatus; labels?: Record<ApplicationStatus, string>; className?: string }) {
  return (
    <span className={cn(chip, 'font-bold', APPLICATION_STATUS_TONE[status] ?? APPLICATION_STATUS_TONE.applied, className)}>
      {labels[status] ?? status}
    </span>
  );
}

type ChipJob = Pick<JobJson,
  'locationType' | 'location' | 'employmentType' | 'salaryMinCents' | 'salaryMaxCents' | 'salaryPeriod'
> & { publishedAt?: string | null; createdAt?: string | null };

/**
 * Where, what kind of work, what it pays and when it was posted — the four
 * things someone scans a listing for before reading anything else.
 */
export function JobFactChips({ job, showPosted = true, className }: { job: ChipJob; showPosted?: boolean; className?: string }) {
  const salary = formatSalaryRange(job.salaryMinCents, job.salaryMaxCents, job.salaryPeriod);
  const posted = showPosted ? postedAgo(job.publishedAt ?? job.createdAt) : '';
  const remote = job.locationType === 'remote';
  const hybrid = job.locationType === 'hybrid';
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <span className={cn(
        chip,
        remote ? 'border-violet-200 bg-violet-50 text-violet-800'
          : hybrid ? 'border-sky-200 bg-sky-50 text-sky-800'
            : 'border-slate-200 bg-slate-50 text-slate-700',
      )}>
        {remote ? <Globe2 className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
        {isLocationType(job.locationType) ? LOCATION_TYPE_LABELS[job.locationType] : job.locationType}
        {job.location ? ` · ${job.location}` : ''}
      </span>
      <span className={cn(chip, 'border-slate-200 bg-slate-50 text-slate-700')}>
        <Briefcase className="h-3 w-3" />
        {isEmploymentType(job.employmentType) ? EMPLOYMENT_TYPE_LABELS[job.employmentType] : job.employmentType}
      </span>
      {salary && (
        <span className={cn(chip, 'border-slate-900 bg-slate-900 font-bold text-white')}>{salary}</span>
      )}
      {posted && (
        // Relative to "now", which differs between the server render and the
        // browser by however long the page took to arrive.
        <span suppressHydrationWarning className="inline-flex items-center gap-1 px-1 text-xs text-slate-500">
          <Clock className="h-3 w-3" /> {posted}
        </span>
      )}
    </div>
  );
}

/** The company's logo, or its initial on the brand colour when it has none. */
export function CompanyMark({ name, logoUrl, size = 44 }: { name: string; logoUrl?: string | null; size?: number }) {
  if (logoUrl) {
    return (
      // A business's own logo from wherever it was uploaded; next/image would
      // need every such host allow-listed, for a 44px square.
      <img
        src={logoUrl}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        className="shrink-0 rounded-xl border border-slate-200 bg-white object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-xl bg-slate-900 font-black text-amber-400"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {initial || <Building2 className="h-5 w-5" />}
    </span>
  );
}
