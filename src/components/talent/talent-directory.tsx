'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Loader2, MapPin, MessageSquare, Search, ShieldAlert, Tag, Users, X,
  LayoutGrid, List, Sparkles, UserPlus, Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { SubpageNav } from '@/components/layout/subpage-nav';
import { TalentCard, type TalentCardData } from '@/components/talent/talent-card';
import { PersonAvatar } from '@/components/talent/person-avatar';
import { cn } from '@/lib/utils';

type DirectoryProfile = TalentCardData & { userId: string };

interface Filters { q: string; location: string; skills: string[]; minYears: string; openOnly: boolean }
const EMPTY: Filters = { q: '', location: '', skills: [], minYears: '', openOnly: true };
const PAGE = 24;

const QUICK_CATEGORIES = [
  'All',
  'Sales',
  'Customer Service',
  'Marketing',
  'Admin',
  'Tech & Web',
  'Artisan',
  'Finance',
];

function toQuery(f: Filters): string {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set('q', f.q.trim());
  if (f.location.trim()) p.set('location', f.location.trim());
  if (f.skills.length) p.set('skills', f.skills.join(','));
  if (f.minYears) p.set('minYears', f.minYears);
  if (!f.openOnly) p.set('open', 'false');
  return p.toString();
}

export function TalentDirectory() {
  const { toast } = useToast();
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [settled, setSettled] = useState<Filters>(EMPTY);
  const [skillDraft, setSkillDraft] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'compact'>('grid');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const [profiles, setProfiles] = useState<DirectoryProfile[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'locked' | 'error'>('loading');
  const [locked, setLocked] = useState<{ message: string; hasBusiness: boolean } | null>(null);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(filters), 300);
    return () => window.clearTimeout(timer);
  }, [filters]);

  const query = useMemo(() => toQuery(settled), [settled]);

  useEffect(() => {
    const id = ++requestId.current;
    const controller = new AbortController();
    fetch(`/api/talent/directory?limit=${PAGE}${query ? `&${query}` : ''}`, { cache: 'no-store', signal: controller.signal })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (id !== requestId.current) return;
        if (res.status === 403) {
          setLocked({ message: data.error ?? 'Browsing talent is for verified businesses.', hasBusiness: data.hasBusiness === true });
          setState('locked');
          return;
        }
        if (!res.ok) throw new Error(String(res.status));
        setProfiles(Array.isArray(data.profiles) ? data.profiles : []);
        setNextOffset(data.nextOffset ?? null);
        setState('ready');
      })
      .catch((error) => {
        if (error?.name === 'AbortError' || id !== requestId.current) return;
        setState('error');
      });
    return () => controller.abort();
  }, [query, attempt]);

  const loadMore = async () => {
    if (nextOffset === null) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/talent/directory?limit=${PAGE}&offset=${nextOffset}${query ? `&${query}` : ''}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setProfiles((current) => {
        const seen = new Set(current.map((p) => p.userId));
        return [...current, ...(data.profiles as DirectoryProfile[]).filter((p) => !seen.has(p.userId))];
      });
      setNextOffset(data.nextOffset ?? null);
    } catch {
      toast({ title: 'Could not load more people', variant: 'destructive' });
    } finally {
      setLoadingMore(false);
    }
  };

  const addSkill = () => {
    const skill = skillDraft.trim();
    if (!skill) return;
    setFilters((f) => (f.skills.some((s) => s.toLowerCase() === skill.toLowerCase()) || f.skills.length >= 10
      ? f
      : { ...f, skills: [...f.skills, skill] }));
    setSkillDraft('');
  };

  const handleCategoryClick = (cat: string) => {
    setActiveCategory(cat);
    if (cat === 'All') {
      setFilters((f) => ({ ...f, q: '', skills: [] }));
    } else {
      setFilters((f) => ({ ...f, skills: [cat] }));
    }
  };

  const anyFilter = Boolean(filters.q || filters.skills.length || filters.location || filters.minYears || !filters.openOnly);
  const field = 'rounded-xl border border-slate-200 bg-white text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 h-10';

  return (
    <div className="min-h-screen bg-slate-50/80">
      <SubpageNav title="Find talent" />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        {/* Top Promotional & Call-to-action Banner */}
        <div className="mb-6 rounded-3xl border border-amber-300/80 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 p-6 text-white shadow-md sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-300">
                <Sparkles className="h-3 w-3" /> Verified Talent Pool
              </span>
              <h2 className="text-xl font-black text-white sm:text-2xl">
                Looking for work or hiring staff?
              </h2>
              <p className="max-w-xl text-xs text-slate-300 sm:text-sm">
                Candidates list their profile for verified South African employers. Add your profile with one click to get matched to live vacancies.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Button asChild className="rounded-xl bg-amber-400 font-extrabold text-slate-950 hover:bg-amber-300 shadow-sm shadow-amber-400/20">
                <Link href="/talent/profile">
                  <UserPlus className="h-4 w-4 mr-1.5" /> Post My Profile
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-xl border-white/20 bg-white/10 font-bold text-white hover:bg-white/20">
                <Link href="/business/jobs">
                  <Briefcase className="h-4 w-4 mr-1.5" /> Post a Role
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {state === 'locked' ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50/70 p-8 text-center sm:p-12">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-lg font-black text-amber-950">For Verified Businesses</h3>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-amber-900">{locked?.message}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button className="rounded-xl bg-amber-400 font-bold text-slate-950 hover:bg-amber-300" asChild>
                <Link href={locked?.hasBusiness ? '/business/verify' : '/business/create'}>
                  {locked?.hasBusiness ? 'Get Verified' : 'List My Business'}
                </Link>
              </Button>
              <Button variant="outline" className="rounded-xl border-amber-300 font-bold text-amber-950" asChild>
                <Link href="/talent/profile">Looking for work? Build your profile</Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Search, Filter Bar, and Categories */}
            <div className="mb-6 space-y-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
              <div className="grid gap-2.5 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_160px]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    aria-label="Search people"
                    value={filters.q}
                    onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                    placeholder="Search name, headline, or keyword…"
                    className={cn(field, 'w-full pl-9 pr-3')}
                  />
                </div>
                <div className="relative">
                  <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    aria-label="Add a skill to filter by"
                    value={skillDraft}
                    onChange={(e) => setSkillDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addSkill(); } }}
                    onBlur={addSkill}
                    placeholder="Skill filter (press Enter)"
                    className={cn(field, 'w-full pl-9 pr-3')}
                  />
                </div>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    aria-label="Town or city"
                    value={filters.location}
                    onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value }))}
                    placeholder="Town, city or province"
                    className={cn(field, 'w-full pl-9 pr-3')}
                  />
                </div>
                <select
                  aria-label="Minimum experience"
                  value={filters.minYears}
                  onChange={(e) => setFilters((f) => ({ ...f, minYears: e.target.value }))}
                  className={cn(field, 'px-3 font-semibold text-slate-700')}
                >
                  <option value="">Any experience</option>
                  {['1', '3', '5', '10'].map((y) => <option key={y} value={y}>{y}+ years</option>)}
                </select>
              </div>

              {/* Category Pills & Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  {QUICK_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleCategoryClick(cat)}
                      className={cn(
                        'rounded-xl px-3 py-1 text-xs font-bold transition-all',
                        activeCategory === cat
                          ? 'bg-amber-400 text-slate-950 shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={filters.openOnly}
                      onChange={(e) => setFilters((f) => ({ ...f, openOnly: e.target.checked }))}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-amber-500"
                    />
                    Open to work only
                  </label>

                  {/* Grid / Compact list toggle to keep page uncluttered as userbase grows */}
                  <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5">
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      className={cn(
                        'rounded-lg p-1.5 transition-colors',
                        viewMode === 'grid' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-900'
                      )}
                      title="Grid View"
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('compact')}
                      className={cn(
                        'rounded-lg p-1.5 transition-colors',
                        viewMode === 'compact' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-900'
                      )}
                      title="Compact List View"
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Active skill tags */}
              {filters.skills.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {filters.skills.map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => setFilters((f) => ({ ...f, skills: f.skills.filter((s) => s !== skill) }))}
                      className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900 hover:bg-amber-200"
                    >
                      {skill} <X className="h-3 w-3" />
                    </button>
                  ))}
                  {anyFilter && (
                    <button
                      type="button"
                      onClick={() => { setFilters(EMPTY); setActiveCategory('All'); }}
                      className="px-2 text-xs font-bold text-slate-500 underline hover:text-slate-900"
                    >
                      Reset all filters
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Profiles Results */}
            {state === 'loading' ? (
              <div className="flex items-center justify-center rounded-3xl border border-slate-200 bg-white p-16 text-slate-500">
                <Loader2 className="mr-2 h-6 w-6 animate-spin text-amber-500" /> Loading candidate profiles…
              </div>
            ) : state === 'error' ? (
              <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
                <p className="font-bold text-red-900">The directory could not be loaded</p>
                <Button variant="outline" onClick={() => { setState('loading'); setAttempt((n) => n + 1); }} className="mt-3 border-red-300 font-bold text-red-900">
                  Try again
                </Button>
              </div>
            ) : profiles.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-16 text-center">
                <Users className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-3 text-lg font-bold text-slate-900">
                  {anyFilter ? 'No candidates match those filters' : 'No profiles listed yet'}
                </h3>
                <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                  Post a vacancy to attract candidates or be the first professional to list yourself!
                </p>
                <div className="mt-5 flex justify-center gap-3">
                  <Button className="rounded-xl bg-amber-400 font-bold text-slate-950 hover:bg-amber-300" asChild>
                    <Link href="/business/jobs?new=1">Post a Role</Link>
                  </Button>
                  <Button variant="outline" className="rounded-xl border-slate-300 font-bold text-slate-800" asChild>
                    <Link href="/talent/profile">Post My Profile</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between text-xs font-bold text-slate-500 px-1">
                  <span>{profiles.length} Verified Professionals available</span>
                  <span>Click to view details or message directly</span>
                </div>

                {viewMode === 'grid' ? (
                  <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {profiles.map((p) => (
                      <li key={p.userId}>
                        <TalentCard
                          profile={p}
                          maxSkills={6}
                          footer={(
                            <div className="flex gap-2">
                              <Button asChild size="sm" className="flex-1 rounded-xl gap-1.5 bg-amber-400 font-bold text-slate-950 hover:bg-amber-300">
                                <Link href={`/dashboard/messages?with=${p.userId}`}><MessageSquare className="h-4 w-4" /> Message</Link>
                              </Button>
                              <Button asChild size="sm" variant="outline" className="flex-1 rounded-xl border-slate-300 font-bold text-slate-800">
                                <Link href={`/talent/${p.userId}`}>View Profile</Link>
                              </Button>
                            </div>
                          )}
                        />
                      </li>
                    ))}
                  </ul>
                ) : (
                  /* Compact uncluttered list view */
                  <div className="space-y-2">
                    {profiles.map((p) => (
                      <div
                        key={p.userId}
                        className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-amber-300 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <PersonAvatar name={p.name} src={p.avatarUrl} size={44} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <Link href={`/talent/${p.userId}`} className="text-sm font-extrabold text-slate-900 hover:underline truncate">
                                {p.name}
                              </Link>
                              {p.openToWork && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                                  Open to work
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 truncate mt-0.5">{p.headline}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                              {p.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" /> {p.location}
                                </span>
                              )}
                              {p.skills.slice(0, 3).map((s) => (
                                <span key={s} className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700">
                                  {s}
                                </span>
                              ))}
                              {p.skills.length > 3 && (
                                <span className="text-slate-400">+{p.skills.length - 3}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button asChild size="sm" className="rounded-xl bg-amber-400 font-bold text-slate-950 hover:bg-amber-300">
                            <Link href={`/dashboard/messages?with=${p.userId}`}>
                              <MessageSquare className="h-3.5 w-3.5 mr-1" /> Message
                            </Link>
                          </Button>
                          <Button asChild size="sm" variant="outline" className="rounded-xl border-slate-300 font-bold text-slate-800">
                            <Link href={`/talent/${p.userId}`}>View</Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {nextOffset !== null && (
                  <div className="mt-6 flex justify-center">
                    <Button onClick={loadMore} disabled={loadingMore} variant="outline" className="gap-2 rounded-xl border-slate-300 px-6 font-bold text-slate-800">
                      {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                      Show More Candidates
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
