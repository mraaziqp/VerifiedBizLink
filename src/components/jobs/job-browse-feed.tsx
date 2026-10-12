'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRight, Bookmark, BookmarkCheck, Briefcase, Building2, ClipboardList, FileText, Loader2, MapPin,
  Search, ShieldCheck, SlidersHorizontal, Tag, UserRound, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { SubpageNav } from '@/components/layout/subpage-nav';
import { CompanyMark, JobFactChips, MatchBadge, VerifiedChip, type JobListItem } from '@/components/jobs/job-badges';
import { EMPLOYMENT_TYPE_LABELS, LOCATION_TYPE_LABELS, jobPath } from '@/lib/talent';
import type { JobView } from '@/lib/jobs-server';
import { cn } from '@/lib/utils';

// The quick view is fetched when a role is first opened; browsing the list
// should not wait on the code for reading one.
const JobDetailView = dynamic(() => import('@/components/jobs/job-detail-view').then((m) => m.JobDetailView), {
  ssr: false,
  loading: () => <div className="h-40 animate-pulse rounded-2xl bg-slate-200" aria-label="Loading" />,
});

type Sort = 'newest' | 'match' | 'salary';

interface Filters {
  q: string;
  location: string;
  locationTypes: string[];
  employmentTypes: string[];
  salaryMin: string;
  skills: string[];
  saved: boolean;
  sort: Sort;
}

interface Viewer { signedIn: boolean; hasProfile: boolean; canQuickApply: boolean; savedCount: number }
interface Suggestion { kind: 'title' | 'company' | 'skill' | 'location'; value: string; count: number }

const EMPTY: Filters = {
  q: '', location: '', locationTypes: [], employmentTypes: [], salaryMin: '', skills: [], saved: false, sort: 'newest',
};

const SALARY_STEPS = ['5000', '10000', '15000', '25000', '40000', '60000'];
const PAGE = 24;

const SUGGESTION_META: Record<Suggestion['kind'], { icon: typeof Search; label: string }> = {
  title: { icon: Briefcase, label: 'Role' },
  company: { icon: Building2, label: 'Company' },
  skill: { icon: Tag, label: 'Skill' },
  location: { icon: MapPin, label: 'Place' },
};

const list = (v: string | null) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);

function filtersFromUrl(params: URLSearchParams): Filters {
  const sort = params.get('sort');
  return {
    q: params.get('q') ?? '',
    location: params.get('location') ?? '',
    locationTypes: list(params.get('locationType')),
    employmentTypes: list(params.get('employmentType')),
    salaryMin: params.get('salaryMin') ?? '',
    skills: list(params.get('skills')),
    saved: params.get('saved') === 'true',
    sort: sort === 'match' || sort === 'salary' ? sort : 'newest',
  };
}

function toQuery(f: Filters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set('q', f.q.trim());
  if (f.location.trim()) p.set('location', f.location.trim());
  if (f.locationTypes.length) p.set('locationType', f.locationTypes.join(','));
  if (f.employmentTypes.length) p.set('employmentType', f.employmentTypes.join(','));
  if (f.salaryMin) p.set('salaryMin', f.salaryMin);
  if (f.skills.length) p.set('skills', f.skills.join(','));
  if (f.saved) p.set('saved', 'true');
  if (f.sort !== 'newest') p.set('sort', f.sort);
  return p;
}

const toggle = (items: string[], value: string) =>
  (items.includes(value) ? items.filter((v) => v !== value) : [...items, value]);

/** The value, a beat after it stops changing — so typing does not fire a request per keystroke. */
function useDebounced<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), ms);
    return () => window.clearTimeout(timer);
  }, [value, ms]);
  return settled;
}

/**
 * The jobs board: search with suggestions, filters that stay in reach while
 * scrolling, and a quick view that opens over the list so reading one role
 * does not cost someone their place among the rest.
 */
export function JobBrowseFeed() {
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<Filters>(() => filtersFromUrl(new URLSearchParams(searchParams.toString())));
  const debounced = useDebounced(filters, 300);

  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [viewer, setViewer] = useState<Viewer>({ signedIn: true, hasProfile: true, canQuickApply: false, savedCount: 0 });
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const searchQuery = useDebounced(filters.q, 180);

  const [openJob, setOpenJob] = useState<JobListItem | null>(null);
  const [openView, setOpenView] = useState<JobView | null>(null);
  const [openViewFull, setOpenViewFull] = useState(false);
  const openId = useRef<string | null>(null);
  const requestId = useRef(0);

  // "Post a Job" used to be a tab on this page; old links still arrive here.
  useEffect(() => {
    if (searchParams.get('tab') === 'post') router.replace('/business/jobs?new=1');
  }, [searchParams, router]);

  const set = useCallback(<K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((f) => ({ ...f, [key]: value }));
  }, []);

  /* ----------------------------------------------------------- results */

  const queryString = useMemo(() => toQuery(debounced).toString(), [debounced]);

  useEffect(() => {
    const id = ++requestId.current;
    const controller = new AbortController();
    setState((s) => (s === 'ready' ? s : 'loading'));

    fetch(`/api/jobs?limit=${PAGE}${queryString ? `&${queryString}` : ''}`, { cache: 'no-store', signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then((data) => {
        // A slower, older request must not overwrite a newer answer.
        if (id !== requestId.current) return;
        setJobs(Array.isArray(data.jobs) ? data.jobs : []);
        setNextOffset(data.nextOffset ?? null);
        if (data.viewer) setViewer(data.viewer);
        setState('ready');
      })
      .catch((error) => {
        if (error?.name === 'AbortError' || id !== requestId.current) return;
        setState('error');
      });

    // The address bar always describes what is on screen, so a filtered
    // search can be bookmarked or sent to someone. replaceState, not a
    // navigation: nothing re-renders and the scroll position stays put.
    window.history.replaceState(null, '', `${window.location.pathname}${queryString ? `?${queryString}` : ''}`);

    return () => controller.abort();
  }, [queryString, attempt]);

  const loadMore = async () => {
    if (nextOffset === null) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/jobs?limit=${PAGE}&offset=${nextOffset}${queryString ? `&${queryString}` : ''}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setJobs((current) => {
        const seen = new Set(current.map((j) => j.id));
        return [...current, ...(data.jobs as JobListItem[]).filter((j) => !seen.has(j.id))];
      });
      setNextOffset(data.nextOffset ?? null);
    } catch {
      toast({ title: 'Could not load more roles', description: 'Check your connection and try again.', variant: 'destructive' });
    } finally {
      setLoadingMore(false);
    }
  };

  /* ------------------------------------------------------- suggestions */

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) { setSuggestions([]); return; }
    let active = true;
    fetch(`/api/jobs/suggest?q=${encodeURIComponent(q)}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : { suggestions: [] }))
      .then((data) => { if (active) { setSuggestions(data.suggestions ?? []); setActiveSuggestion(-1); } })
      .catch(() => { if (active) setSuggestions([]); });
    return () => { active = false; };
  }, [searchQuery]);

  const choose = (s: Suggestion) => {
    // A skill or a place becomes its own filter; a role or company is a search.
    if (s.kind === 'skill') {
      setFilters((f) => ({ ...f, q: '', skills: f.skills.some((x) => x.toLowerCase() === s.value.toLowerCase()) ? f.skills : [...f.skills, s.value] }));
    } else if (s.kind === 'location') {
      setFilters((f) => ({ ...f, q: '', location: s.value }));
    } else {
      set('q', s.value);
    }
    setSuggestOpen(false);
    setSuggestions([]);
  };

  /* -------------------------------------------------------- quick view */

  const openQuickView = (job: JobListItem) => {
    setOpenJob(job);
    // Shown at once from what the list already holds…
    setOpenView({
      job,
      isOwner: false,
      hasApplied: job.hasApplied,
      applicationStatus: null,
      isSaved: job.isSaved,
      matchScore: job.matchScore,
      matchedSkills: job.matchedSkills,
      missingSkills: job.missingSkills,
      viewer: { signedIn: viewer.signedIn, hasProfile: viewer.hasProfile, canQuickApply: viewer.canQuickApply, hasCv: false },
    });
    // …then completed by the full answer (the description, requirements and
    // benefits are not in the list), which also counts the view.
    setOpenViewFull(false);
    openId.current = job.id;
    // An answer for a role the person has already moved on from is dropped.
    const stillOpen = () => openId.current === job.id;
    fetch(`/api/jobs/${job.id}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: JobView | null) => {
        if (!data?.job) throw new Error('unavailable');
        if (!stillOpen()) return;
        setOpenView((current) => (current
          // Saved/applied are whatever the person has done in the meantime,
          // not what the server knew when this request left.
          ? { ...data, isSaved: current.isSaved, hasApplied: current.hasApplied || data.hasApplied }
          : current));
        setOpenViewFull(true);
      })
      .catch(() => {
        if (!stillOpen()) return;
        // Still open, still usable from the list data; the full page has the rest.
        setOpenView((current) => (current ? { ...current, job: { ...current.job, description: job.excerpt } } : current));
        setOpenViewFull(true);
      });
  };

  const closeQuickView = () => {
    openId.current = null;
    setOpenJob(null);
    setOpenView(null);
  };

  const patchJob = (jobId: string, patch: { hasApplied?: boolean; isSaved?: boolean }) => {
    const before = jobs.find((j) => j.id === jobId);
    setJobs((current) => current.map((j) => (j.id === jobId ? { ...j, ...patch } : j)));
    setOpenView((current) => (current?.job.id === jobId ? { ...current, ...patch } : current));
    // Only when it actually changed: applying clears a bookmark that may never have been set.
    if (patch.isSaved !== undefined && before && before.isSaved !== patch.isSaved) {
      setViewer((v) => ({ ...v, savedCount: Math.max(0, v.savedCount + (patch.isSaved ? 1 : -1)) }));
    }
  };

  const toggleSave = async (job: JobListItem) => {
    const next = !job.isSaved;
    patchJob(job.id, { isSaved: next }); // optimistic; put back if the server disagrees
    try {
      const res = await fetch(`/api/jobs/${job.id}/save`, { method: next ? 'POST' : 'DELETE' });
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      patchJob(job.id, { isSaved: !next });
      toast({ title: next ? 'Could not save this job' : 'Could not remove it', variant: 'destructive' });
    }
  };

  /** A plain click opens the quick view; ctrl/cmd/middle click still opens the page in a new tab. */
  const onTitleClick = (e: MouseEvent, job: JobListItem) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    openQuickView(job);
  };

  /* ------------------------------------------------------------ render */

  const activeCount = filters.locationTypes.length + filters.employmentTypes.length + filters.skills.length
    + (filters.location.trim() ? 1 : 0) + (filters.salaryMin ? 1 : 0) + (filters.saved ? 1 : 0);
  const anyFilter = activeCount > 0 || filters.q.trim().length > 0;
  const isBusiness = user?.role === 'business';
  const pill = (on: boolean) => cn(
    'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors',
    on ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400',
  );
  const selectClass = 'h-9 rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-slate-900';

  return (
    <div className="min-h-screen bg-slate-50">
      <SubpageNav title="Jobs &amp; Talent" />

      <div className="mx-auto max-w-5xl px-4 pt-6 sm:pt-8">
        <div className="mb-4 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-slate-200/80 px-3 py-1 text-xs font-bold text-slate-800">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> CIPC verified employers only
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Roles at verified businesses</h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600">
              Every employer here has had its company registration checked. You always know who you are applying to.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <Button asChild variant="outline" className="gap-2 border-slate-300 font-bold text-slate-800 hover:bg-slate-100">
              <Link href="/jobs/applications"><ClipboardList className="h-4 w-4" /> My applications</Link>
            </Button>
            <Button asChild variant="outline" className="gap-2 border-slate-300 font-bold text-slate-800 hover:bg-slate-100">
              <Link href="/talent/profile"><UserRound className="h-4 w-4" /> My profile</Link>
            </Button>
            {isBusiness && (
              <Button asChild className="gap-2 bg-slate-900 font-bold text-white hover:bg-slate-800">
                <Link href="/business/jobs"><Briefcase className="h-4 w-4" /> Manage job posts</Link>
              </Button>
            )}
          </div>
        </div>

        {state === 'ready' && viewer.signedIn && !viewer.canQuickApply && (
          <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0 rounded-xl bg-amber-100 p-2 text-amber-900"><FileText className="h-5 w-5" /></div>
              <div>
                <p className="font-bold text-slate-900">Set up one-click apply</p>
                <p className="text-sm text-slate-600">
                  Add a headline, your skills and a CV once. After that, applying is a single tap and every role shows how well it fits you.
                </p>
              </div>
            </div>
            <Button className="shrink-0 gap-2 bg-slate-900 font-bold text-white hover:bg-slate-800" asChild>
              <Link href="/talent/profile">Build my profile <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        )}
      </div>

      {/* Sticks under the page header, so search and filters never scroll out
          of reach. The header grows by the notch inset in the installed app,
          so the offset has to as well. */}
      <div
        className="sticky z-30 border-y border-slate-200/80 bg-slate-50/95 backdrop-blur-md"
        style={{ top: 'calc(4rem + env(safe-area-inset-top, 0px))' }}
      >
        <div className="mx-auto max-w-5xl px-4 py-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                role="combobox"
                aria-expanded={suggestOpen && suggestions.length > 0}
                aria-controls="job-suggestions"
                aria-autocomplete="list"
                aria-label="Search roles, skills or companies"
                value={filters.q}
                onChange={(e) => { set('q', e.target.value); setSuggestOpen(true); }}
                onFocus={() => setSuggestOpen(true)}
                onBlur={() => window.setTimeout(() => setSuggestOpen(false), 150)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setSuggestOpen(false);
                  if (!suggestOpen || suggestions.length === 0) return;
                  if (e.key === 'ArrowDown') { e.preventDefault(); setActiveSuggestion((i) => (i + 1) % suggestions.length); }
                  if (e.key === 'ArrowUp') { e.preventDefault(); setActiveSuggestion((i) => (i <= 0 ? suggestions.length - 1 : i - 1)); }
                  if (e.key === 'Enter' && activeSuggestion >= 0) { e.preventDefault(); choose(suggestions[activeSuggestion]); }
                }}
                placeholder="Search roles, skills or companies…"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-9 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 [&::-webkit-search-cancel-button]:hidden"
              />
              {filters.q && (
                <button type="button" aria-label="Clear search" onClick={() => set('q', '')} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                  <X className="h-4 w-4" />
                </button>
              )}

              {suggestOpen && suggestions.length > 0 && (
                <ul id="job-suggestions" role="listbox" className="absolute left-0 right-0 top-12 z-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                  {suggestions.map((s, i) => {
                    const meta = SUGGESTION_META[s.kind] ?? SUGGESTION_META.title;
                    return (
                      <li key={`${s.kind}-${s.value}`} role="option" aria-selected={i === activeSuggestion}>
                        <button
                          type="button"
                          // mousedown, not click: the input's blur would close the list first.
                          onMouseDown={(e) => { e.preventDefault(); choose(s); }}
                          className={cn('flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm', i === activeSuggestion ? 'bg-slate-100' : 'hover:bg-slate-50')}
                        >
                          <meta.icon className="h-4 w-4 shrink-0 text-slate-400" />
                          <span className="min-w-0 flex-1 truncate font-semibold text-slate-900">{s.value}</span>
                          <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-slate-400">{meta.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowFilters((s) => !s)}
              aria-expanded={showFilters}
              className={cn('inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border px-3.5 text-sm font-bold md:hidden', activeCount > 0 ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700')}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters{activeCount > 0 ? ` (${activeCount})` : ''}
            </button>
          </div>

          <div className={cn('mt-2.5 flex-wrap items-center gap-1.5', showFilters ? 'flex' : 'hidden md:flex')}>
            {Object.entries(LOCATION_TYPE_LABELS).map(([value, label]) => (
              <button key={value} type="button" aria-pressed={filters.locationTypes.includes(value)} onClick={() => set('locationTypes', toggle(filters.locationTypes, value))} className={pill(filters.locationTypes.includes(value))}>
                {label}
              </button>
            ))}

            <span className="mx-0.5 hidden h-5 w-px bg-slate-200 sm:block" />

            <select
              aria-label="Contract type"
              value=""
              onChange={(e) => { if (e.target.value) set('employmentTypes', toggle(filters.employmentTypes, e.target.value)); }}
              className={cn(selectClass, filters.employmentTypes.length > 0 && 'border-slate-900 text-slate-900')}
            >
              <option value="">Contract type{filters.employmentTypes.length ? ` (${filters.employmentTypes.length})` : ''}</option>
              {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{filters.employmentTypes.includes(value) ? '✓ ' : ''}{label}</option>
              ))}
            </select>

            <div className="relative">
              <MapPin className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                aria-label="Town or city"
                value={filters.location}
                onChange={(e) => set('location', e.target.value)}
                placeholder="Town or city"
                className={cn(selectClass, 'w-36 pl-7 font-semibold placeholder:font-bold placeholder:text-slate-500', filters.location.trim() && 'border-slate-900 text-slate-900')}
              />
            </div>

            <select aria-label="Minimum pay" value={filters.salaryMin} onChange={(e) => set('salaryMin', e.target.value)} className={cn(selectClass, filters.salaryMin && 'border-slate-900 text-slate-900')}>
              <option value="">Any pay</option>
              {SALARY_STEPS.map((v) => <option key={v} value={v}>R{Number(v) / 1000}k+ / month</option>)}
            </select>

            {viewer.signedIn && (
              <button type="button" aria-pressed={filters.saved} onClick={() => set('saved', !filters.saved)} className={pill(filters.saved)}>
                <Bookmark className="h-3.5 w-3.5" /> Saved{viewer.savedCount > 0 ? ` (${viewer.savedCount})` : ''}
              </button>
            )}

            <select aria-label="Sort" value={filters.sort} onChange={(e) => set('sort', e.target.value as Sort)} className={cn(selectClass, 'ml-auto')}>
              <option value="newest">Newest first</option>
              {viewer.hasProfile && <option value="match">Best match</option>}
              <option value="salary">Highest pay</option>
            </select>
          </div>

          {(filters.skills.length > 0 || filters.employmentTypes.length > 0 || anyFilter) && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {filters.employmentTypes.map((value) => (
                <button key={value} type="button" onClick={() => set('employmentTypes', toggle(filters.employmentTypes, value))} className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-800 hover:bg-slate-300">
                  {EMPLOYMENT_TYPE_LABELS[value as keyof typeof EMPLOYMENT_TYPE_LABELS] ?? value} <X className="h-3 w-3" />
                </button>
              ))}
              {filters.skills.map((skill) => (
                <button key={skill} type="button" onClick={() => set('skills', filters.skills.filter((s) => s !== skill))} className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900 hover:bg-amber-200">
                  <Tag className="h-3 w-3" /> {skill} <X className="h-3 w-3" />
                </button>
              ))}
              {anyFilter && (
                <button type="button" onClick={() => setFilters({ ...EMPTY, sort: filters.sort })} className="px-1 text-xs font-bold text-slate-600 underline underline-offset-2 hover:text-slate-900">
                  Clear all
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-5">
        {state === 'loading' ? (
          <ul className="space-y-3.5" aria-busy="true" aria-label="Loading roles">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex gap-3">
                  <div className="h-11 w-11 rounded-xl bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-2/5 rounded bg-slate-200" />
                    <div className="h-3 w-1/4 rounded bg-slate-100" />
                  </div>
                </div>
                <div className="mt-4 h-3 w-3/5 rounded bg-slate-100" />
              </li>
            ))}
          </ul>
        ) : state === 'error' ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <p className="font-bold text-red-900">The jobs could not be loaded</p>
            <p className="mt-1 text-sm text-red-800">Check your connection and try again.</p>
            <Button variant="outline" onClick={() => { setState('loading'); setAttempt((n) => n + 1); }} className="mt-4 border-red-300 font-bold text-red-900">Try again</Button>
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <Briefcase className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-3 text-lg font-bold text-slate-900">
              {filters.saved ? 'No saved roles match' : anyFilter ? 'No roles match those filters' : 'No open roles right now'}
            </p>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
              {anyFilter
                ? 'Try a broader search or remove a filter.'
                : 'Verified businesses post new openings regularly — check back soon.'}
            </p>
            {anyFilter && (
              <Button onClick={() => setFilters({ ...EMPTY, sort: filters.sort })} variant="outline" className="mt-4 border-slate-300 font-bold">Clear filters</Button>
            )}
          </div>
        ) : (
          <>
            <p className="mb-3 text-xs font-semibold text-slate-500" aria-live="polite">
              {jobs.length}{nextOffset !== null ? '+' : ''} role{jobs.length === 1 ? '' : 's'}
              {filters.sort === 'match' ? ' · best match first' : filters.sort === 'salary' ? ' · highest pay first' : ''}
            </p>

            <ul className="space-y-3.5">
              {jobs.map((job) => (
                <li key={job.id}>
                  <article
                    className={cn(
                      'group relative rounded-2xl border bg-white p-4 transition-all duration-200 hover:border-slate-400 hover:shadow-md sm:p-5',
                      openJob?.id === job.id ? 'border-slate-900 shadow-md' : 'border-slate-200',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <CompanyMark name={job.companyName} logoUrl={job.logoUrl} />
                      <div className="min-w-0 flex-1">
                        <h2 className="text-base font-bold leading-snug text-slate-900 sm:text-lg">
                          {/* The link covers the whole card, so anywhere on it opens the quick view. */}
                          <a href={jobPath(job)} onClick={(e) => onTitleClick(e, job)} className="outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-slate-900 group-hover:text-blue-700">
                            {job.title}
                          </a>
                        </h2>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-slate-700">
                          {job.companyName}
                          {job.businessVerified && <VerifiedChip />}
                          {job.hasApplied && <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-bold text-white">Applied</span>}
                        </p>
                      </div>

                      <div className="relative z-10 flex shrink-0 flex-col items-end gap-2">
                        <button
                          type="button"
                          onClick={() => void toggleSave(job)}
                          aria-pressed={job.isSaved}
                          aria-label={job.isSaved ? `Remove ${job.title} from saved jobs` : `Save ${job.title}`}
                          className={cn('rounded-full border p-2 transition-colors', job.isSaved ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-400 hover:border-slate-400 hover:text-slate-700')}
                        >
                          {job.isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <JobFactChips job={job} />
                      {job.matchScore !== null && job.matchScore > 0 && <MatchBadge score={job.matchScore} className="ml-auto" />}
                    </div>

                    {job.excerpt && <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600">{job.excerpt}</p>}

                    {job.requiredSkills.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
                        {job.requiredSkills.slice(0, 7).map((s) => (
                          <span
                            key={s}
                            className={cn(
                              'rounded-full border px-2.5 py-0.5 text-xs font-medium',
                              job.matchedSkills.includes(s) ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-700',
                            )}
                          >
                            {s}
                          </span>
                        ))}
                        {job.requiredSkills.length > 7 && <span className="px-1 text-xs text-slate-400">+{job.requiredSkills.length - 7} more</span>}
                      </div>
                    )}
                  </article>
                </li>
              ))}
            </ul>

            {nextOffset !== null && (
              <div className="mt-5 flex justify-center">
                <Button onClick={loadMore} disabled={loadingMore} variant="outline" className="gap-2 border-slate-300 px-6 font-bold text-slate-800">
                  {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                  Show more roles
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <Sheet open={openJob !== null} onOpenChange={(open) => { if (!open) closeQuickView(); }}>
        <SheetContent side="right" className="w-full overflow-y-auto bg-slate-50 p-4 pt-12 sm:max-w-xl sm:p-6 sm:pt-12">
          <SheetTitle className="sr-only">{openJob?.title ?? 'Job'}</SheetTitle>
          <SheetDescription className="sr-only">Job details</SheetDescription>
          {openView && (
            <JobDetailView
              view={openView}
              variant="panel"
              loadingBody={!openViewFull}
              onChange={(patch) => patchJob(openView.job.id, patch)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
