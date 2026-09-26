'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Briefcase, Search, MapPin, Loader2, ShieldCheck, Sparkles,
  ArrowRight, FileText, Clock, PlusCircle, Building2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SubpageNav } from '@/components/layout/subpage-nav';
import { AnimatedTabs, type TabItem } from '@/components/ui/animated-tabs';
import { TagInput } from '@/components/ui/tag-input';
import { useToast } from '@/hooks/use-toast';
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

function MatchBadge({ score }: { score: number }) {
  const tone = score >= 75
    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
    : score >= 40
      ? 'bg-amber-50 text-amber-900 border-amber-200'
      : 'bg-slate-100 text-slate-700 border-slate-200';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${tone}`}>
      <Sparkles className="h-3 w-3 text-amber-700" />
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

function JobsContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'post' ? 'post' : 'find';
  const [activeTab, setActiveTab] = useState<'find' | 'post'>(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'post') {
      setActiveTab('post');
    } else if (tabParam === 'find') {
      setActiveTab('find');
    }
  }, [searchParams]);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [hasProfile, setHasProfile] = useState(true);
  const [query, setQuery] = useState('');
  const [locationType, setLocationType] = useState<string>('all');

  // Post a Job Form State
  const { toast } = useToast();
  const [posting, setPosting] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postDescription, setPostDescription] = useState('');
  const [postSkills, setPostSkills] = useState<string[]>([]);
  const [postEmploymentType, setPostEmploymentType] = useState<EmploymentType>('full_time');
  const [postLocationType, setPostLocationType] = useState<LocationType>('on_site');
  const [postLocation, setPostLocation] = useState('');
  const [postSalaryMin, setPostSalaryMin] = useState('');
  const [postSalaryMax, setPostSalaryMax] = useState('');

  // The employer's own posts for the "Manage Job Posts" tab — loaded when
  // that tab is first opened, and again after publishing.
  const [myJobs, setMyJobs] = useState<{ id: string; title: string; status: string; applicationCount: number; createdAt: string }[] | null>(null);
  const loadMyJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/jobs?mine=true', { cache: 'no-store' });
      const data = res.ok ? await res.json() : null;
      setMyJobs(Array.isArray(data?.jobs) ? data.jobs : []);
    } catch {
      setMyJobs([]);
    }
  }, []);
  useEffect(() => {
    if (activeTab === 'post' && myJobs === null) void loadMyJobs();
  }, [activeTab, myJobs, loadMyJobs]);

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
  }, [load, query, locationType]);

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim() || !postDescription.trim()) {
      toast({ title: 'Validation Error', description: 'Job title and description are required', variant: 'destructive' });
      return;
    }

    setPosting(true);
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: postTitle.trim(),
          description: postDescription.trim(),
          requiredSkills: postSkills,
          employmentType: postEmploymentType,
          locationType: postLocationType,
          location: postLocation.trim() || null,
          salaryMinCents: postSalaryMin ? Math.round(parseFloat(postSalaryMin) * 100) : null,
          salaryMaxCents: postSalaryMax ? Math.round(parseFloat(postSalaryMax) * 100) : null,
          salaryPeriod: 'month',
          salaryVisible: true,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Job Posted Successfully!', description: 'Your role is now live on the Verified Biz Link job board.' });
        setPostTitle('');
        setPostDescription('');
        setPostSkills([]);
        setPostLocation('');
        setPostSalaryMin('');
        setPostSalaryMax('');
        void loadMyJobs();
        const refreshed = await load('', 'all');
        if (refreshed?.jobs) setJobs(refreshed.jobs);
      } else {
        toast({ title: 'Could not post job', description: data.error || 'Only verified businesses can post roles.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Network error', description: 'Failed to reach job post service', variant: 'destructive' });
    } finally {
      setPosting(false);
    }
  };

  const tabs: TabItem<'find' | 'post'>[] = [
    {
      id: 'find',
      label: 'Find Jobs',
      icon: Briefcase,
      badge: jobs.length > 0 ? jobs.length : undefined,
    },
    {
      id: 'post',
      label: 'Manage Job Posts',
      icon: PlusCircle,
      badge: myJobs && myJobs.length > 0 ? myJobs.length : undefined,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <SubpageNav title="Jobs &amp; Talent Portal" />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
        {/* Header with high contrast */}
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200/80 text-slate-800 text-xs font-bold mb-2">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> CIPC Verified Employers Only
            </div>
            <h1 className="flex items-center gap-2.5 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Roles at Verified Businesses
            </h1>
            <p className="mt-1.5 text-sm text-slate-600 max-w-2xl leading-relaxed">
              Every employer here has had its company registry and tax documents checked. You are never applying into an unverified void.
            </p>
          </div>

          <Link href="/talent/profile" className="shrink-0">
            <Button variant="outline" className="border-slate-300 font-bold gap-2 text-slate-800 hover:bg-slate-100">
              <FileText className="h-4 w-4" /> My Talent Profile
            </Button>
          </Link>
        </div>

        {/* Without a profile callout */}
        {loaded && !hasProfile && (
          <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-900 shrink-0 mt-0.5">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-slate-900">Set up your professional profile</p>
                <p className="text-sm text-slate-600">
                  Your profile gets submitted when you apply and unlocks automatic skill matching.
                </p>
              </div>
            </div>
            <Link href="/talent/profile" className="shrink-0">
              <Button className="gap-2 bg-slate-900 text-white font-bold hover:bg-slate-800">
                Build my profile <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}

        {/* Animated Tabs: Switch between Find Jobs and Post a Job */}
        <AnimatedTabs<'find' | 'post'>
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          className="mb-6"
        />

        {/* TAB 1: FIND JOBS FEED */}
        {activeTab === 'find' && (
          <div className="space-y-4 animate-fade-in">
            {/* Search and Filters */}
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search roles, skills or verified companies…"
                  className="h-11 border-slate-200 bg-white pl-10 text-slate-900 rounded-xl"
                />
              </div>
              <select
                value={locationType}
                onChange={(e) => setLocationType(e.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="all">All Locations</option>
                {Object.entries(LOCATION_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            {!loaded ? (
              <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-slate-500 shadow-xs">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-slate-900" /> Loading open roles…
              </div>
            ) : jobs.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
                <Briefcase className="mx-auto h-12 w-12 text-slate-300" />
                <p className="mt-3 font-bold text-slate-900 text-lg">No roles found matching your criteria</p>
                <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
                  Try broadening your search term or switch filters. Verified businesses post new openings regularly.
                </p>
                <Button
                  onClick={() => { setQuery(''); setLocationType('all'); }}
                  variant="outline"
                  className="mt-4 border-slate-300 font-bold"
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              <ul className="space-y-3.5">
                {jobs.map((job) => {
                  const salary = formatSalaryRange(job.salaryMinCents, job.salaryMaxCents, job.salaryPeriod);
                  return (
                    <li key={job.id}>
                      <Link
                        href={`/jobs/${job.id}`}
                        className="block rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 transition-all duration-200 hover:border-slate-400 hover:shadow-md group"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h2 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                {job.title}
                              </h2>
                              {job.businessVerified && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  <ShieldCheck className="h-3 w-3 text-emerald-600" /> Verified
                                </span>
                              )}
                              {job.hasApplied && (
                                <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-bold text-white">
                                  Applied
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-semibold text-slate-700 mt-0.5 flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 text-slate-400" />
                              {job.companyName}
                            </p>
                          </div>

                          {job.matchScore !== null && job.matchScore > 0 && (
                            <div className="shrink-0">
                              <MatchBadge score={job.matchScore} />
                            </div>
                          )}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs sm:text-sm text-slate-600">
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                            {LOCATION_TYPE_LABELS[job.locationType] ?? job.locationType}
                            {job.location ? ` · ${job.location}` : ''}
                          </span>
                          <span>{EMPLOYMENT_TYPE_LABELS[job.employmentType] ?? job.employmentType}</span>
                          {salary && <span className="font-bold text-slate-900">{salary}</span>}
                          <span className="inline-flex items-center gap-1 text-slate-400 ml-auto">
                            <Clock className="h-3.5 w-3.5" /> {when(job.createdAt)}
                          </span>
                        </div>

                        {job.requiredSkills.length > 0 && (
                          <div className="mt-3.5 flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                            {job.requiredSkills.slice(0, 8).map((s) => {
                              const have = job.matchedSkills.includes(s);
                              return (
                                <span
                                  key={s}
                                  className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                                    have
                                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                      : 'border-slate-200 bg-slate-50 text-slate-700'
                                  }`}
                                >
                                  {s}
                                </span>
                              );
                            })}
                            {job.requiredSkills.length > 8 && (
                              <span className="px-1 text-xs text-slate-400">
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
        )}

        {/* TAB 2: POST A JOB FORM */}
        {activeTab === 'post' && myJobs && myJobs.length > 0 && (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-xs animate-fade-in">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4 sm:p-5">
              <h2 className="text-base font-black text-slate-900">Your job posts</h2>
              <Link href="/business/jobs" className="text-xs font-bold text-slate-600 hover:text-slate-900">Open full manager →</Link>
            </div>
            <ul className="divide-y divide-slate-100">
              {myJobs.map((j) => (
                <li key={j.id}>
                  <Link href={`/business/jobs/${j.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 sm:px-5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900">{j.title}</p>
                      <p className="text-xs text-slate-500">
                        {j.applicationCount} applicant{j.applicationCount === 1 ? '' : 's'} · posted {when(j.createdAt).toLowerCase()}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${
                      j.status === 'open' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>{j.status}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {activeTab === 'post' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs animate-fade-in">
            <div className="mb-6 pb-4 border-b border-slate-100">
              <h2 className="text-xl font-black text-slate-900">Publish a Verified Opportunity</h2>
              <p className="text-sm text-slate-600 mt-1">
                Roles published here appear with your business&apos;s verified CIPC trust badge, attracting serious, vetted talent.
              </p>
            </div>

            <form onSubmit={handlePostJob} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Job Title *
                </label>
                <Input
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="e.g. Senior Electrician, Compliance Officer, Lead Frontend Engineer"
                  required
                  className="h-11 border-slate-200"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Employment Type
                  </label>
                  <select
                    value={postEmploymentType}
                    onChange={(e) => setPostEmploymentType(e.target.value as EmploymentType)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700"
                  >
                    {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Location Type
                  </label>
                  <select
                    value={postLocationType}
                    onChange={(e) => setPostLocationType(e.target.value as LocationType)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700"
                  >
                    {Object.entries(LOCATION_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  City / Region (if applicable)
                </label>
                <Input
                  value={postLocation}
                  onChange={(e) => setPostLocation(e.target.value)}
                  placeholder="e.g. Cape Town, Johannesburg, Durban"
                  className="h-11 border-slate-200"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Monthly Salary Min (ZAR)
                  </label>
                  <Input
                    type="number"
                    value={postSalaryMin}
                    onChange={(e) => setPostSalaryMin(e.target.value)}
                    placeholder="e.g. 25000"
                    className="h-11 border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Monthly Salary Max (ZAR)
                  </label>
                  <Input
                    type="number"
                    value={postSalaryMax}
                    onChange={(e) => setPostSalaryMax(e.target.value)}
                    placeholder="e.g. 45000"
                    className="h-11 border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Required Skills (Type and press Enter)
                </label>
                <TagInput
                  tags={postSkills}
                  onChange={setPostSkills}
                  placeholder="Type a skill and press Enter (e.g. Python, Wireframes, Sales)..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Job Description &amp; Responsibilities *
                </label>
                <textarea
                  rows={6}
                  value={postDescription}
                  onChange={(e) => setPostDescription(e.target.value)}
                  placeholder="Provide an overview of the role, daily duties, and qualifications needed..."
                  required
                  className="w-full rounded-2xl border border-slate-200 p-4 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab('find')}
                  className="font-bold border-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={posting}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold gap-2 px-6"
                >
                  {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                  Publish Role
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-slate-800" />
        </div>
      }
    >
      <JobsContent />
    </Suspense>
  );
}
