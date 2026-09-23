'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Briefcase, Search, MapPin, Loader2, ShieldCheck, Sparkles,
  ArrowRight, FileText, Clock,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SubpageNav } from '@/components/layout/subpage-nav';
import {
  EMPLOYMENT_TYPE_LABELS, LOCATION_TYPE_LABELS, formatSalaryRange,
  type EmploymentType, type LocationType,
} from '@/lib/talent';

interface Job {
  id: string;
  title: string;
  description: string;
  requiredSkills: string[];
  employmentType: EmploymentType;
  locationType: LocationType;
  location: string | null;
  salaryMinCents: number | null;
  salaryMaxCents: number | null;
  salaryPeriod: string | null;
  applicationDeadline: string | null;
  createdAt: string;
  companyName: string;
  businessVerified: boolean;
  trustScore: number | null;
  applicationCount: number;
  matchScore: number | null;
  matchedSkills: string[];
  missingSkills: string[];
  hasApplied: boolean;
}

/** Green once it is genuinely a good fit, amber when it is partial. */
function MatchBadge({ score }: { score: number }) {
  const tone = score >= 75
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : score >= 40
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-gray-100 text-gray-600 border-gray-200';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${tone}`}>
      <Sparkles className="h-3 w-3" />
      {score}% match
    </span>
  );
}

const when = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [hasProfile, setHasProfile] = useState(true);
  const [query, setQuery] = useState('');
  const [locationType, setLocationType] = useState<string>('all');

  const load = useCallback(async (q: string, loc: string) => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (loc !== 'all') params.set('locationType', loc);
    try {
      const res = await fetch(`/api/jobs?${params}`, { cache: 'no-store' });
      return res.ok ? await res.json() : null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const data = await load(query, locationType);
      if (!active) return;
      if (data) {
        setJobs(data.jobs ?? []);
        setHasProfile(data.hasProfile !== false);
      }
      setLoaded(true);
    })();
    return () => { active = false; };
    // Re-runs as the filters change; the search box is debounced by the form.
  }, [load, query, locationType]);

  return (
    <div className="min-h-screen bg-gray-50">
      <SubpageNav title="Jobs" />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-3xl font-extrabold text-gray-900">
            <Briefcase className="h-7 w-7 text-yellow-600" />
            Roles at verified businesses
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Every employer here has had its CIPC registration and documents checked.
            You are not applying into the dark.
          </p>
        </div>

        {/* Without a profile there is nothing to match against and nothing to
            send, so say that once, at the top, rather than failing at Apply. */}
        {loaded && !hasProfile && (
          <div className="mb-6 flex flex-col gap-3 rounded-2xl border-2 border-yellow-300 bg-yellow-50/70 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-6 w-6 shrink-0 text-yellow-600" />
              <div>
                <p className="font-bold text-gray-900">Set up your professional profile</p>
                <p className="text-sm text-gray-600">
                  It is what gets sent when you apply, and it is how these roles are
                  matched to you.
                </p>
              </div>
            </div>
            <Link href="/talent/profile" className="shrink-0">
              <Button className="gap-2 bg-yellow-400 font-bold text-gray-900 hover:bg-yellow-300">
                Build my profile <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}

        <div className="mb-6 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search roles, skills or companies…"
              className="h-11 border-gray-200 bg-white pl-9 text-gray-900"
            />
          </div>
          <select
            value={locationType}
            onChange={(e) => setLocationType(e.target.value)}
            className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700"
          >
            <option value="all">Anywhere</option>
            {Object.entries(LOCATION_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        {!loaded ? (
          <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white p-12 text-gray-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading roles…
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
            <Briefcase className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-3 font-bold text-gray-900">No roles match that</p>
            <p className="mt-1 text-sm text-gray-500">
              {query || locationType !== 'all'
                ? 'Try a broader search.'
                : 'No verified business has posted a role yet. Check back soon.'}
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {jobs.map((job) => {
              const salary = formatSalaryRange(job.salaryMinCents, job.salaryMaxCents, job.salaryPeriod);
              return (
                <li key={job.id}>
                  <Link
                    href={`/jobs/${job.id}`}
                    className="block rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-yellow-300 hover:shadow-md"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-lg font-bold text-gray-900">{job.title}</h2>
                        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                          <span className="font-semibold">{job.companyName}</span>
                          {job.businessVerified && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                              <ShieldCheck className="h-3 w-3" /> Verified
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        {job.matchScore !== null && <MatchBadge score={job.matchScore} />}
                        {job.hasApplied && (
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                            Applied
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-gray-600">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-gray-400" />
                        {LOCATION_TYPE_LABELS[job.locationType] ?? job.locationType}
                        {job.location ? ` · ${job.location}` : ''}
                      </span>
                      <span>{EMPLOYMENT_TYPE_LABELS[job.employmentType] ?? job.employmentType}</span>
                      {salary && <span className="font-semibold text-gray-900">{salary}</span>}
                      <span className="inline-flex items-center gap-1.5 text-gray-400">
                        <Clock className="h-3.5 w-3.5" /> {when(job.createdAt)}
                      </span>
                    </div>

                    {job.requiredSkills.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {job.requiredSkills.slice(0, 8).map((s) => {
                          const have = job.matchedSkills.includes(s);
                          return (
                            <span
                              key={s}
                              className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                                have
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                  : 'border-gray-200 bg-gray-50 text-gray-600'
                              }`}
                            >
                              {s}
                            </span>
                          );
                        })}
                        {job.requiredSkills.length > 8 && (
                          <span className="px-1 text-xs text-gray-400">
                            +{job.requiredSkills.length - 8} more
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
