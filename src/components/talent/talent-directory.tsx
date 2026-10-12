'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Loader2, MapPin, MessageSquare, Search, ShieldAlert, Tag, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { SubpageNav } from '@/components/layout/subpage-nav';
import { TalentCard, type TalentCardData } from '@/components/talent/talent-card';
import { cn } from '@/lib/utils';

type DirectoryProfile = TalentCardData & { userId: string };

interface Filters { q: string; location: string; skills: string[]; minYears: string; openOnly: boolean }
const EMPTY: Filters = { q: '', location: '', skills: [], minYears: '', openOnly: true };
const PAGE = 24;

function toQuery(f: Filters): string {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set('q', f.q.trim());
  if (f.location.trim()) p.set('location', f.location.trim());
  if (f.skills.length) p.set('skills', f.skills.join(','));
  if (f.minYears) p.set('minYears', f.minYears);
  if (!f.openOnly) p.set('open', 'false');
  return p.toString();
}

/**
 * The talent directory: people who chose to list their profile, for verified
 * businesses to search. Contact starts with a message — the directory never
 * hands out a CV or an email address.
 */
export function TalentDirectory() {
  const { toast } = useToast();
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [settled, setSettled] = useState<Filters>(EMPTY);
  const [skillDraft, setSkillDraft] = useState('');

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

  const anyFilter = Boolean(filters.q.trim() || filters.location.trim() || filters.skills.length || filters.minYears || !filters.openOnly);
  const field = 'h-10 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-900';

  return (
    <div className="min-h-screen bg-slate-50">
      <SubpageNav title="Find talent" />

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Find talent</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              People who have listed their profile for verified businesses. Message someone to start a conversation.
            </p>
          </div>
          <Button asChild variant="outline" className="border-slate-300 font-bold text-slate-800">
            <Link href="/business/jobs">Your job posts</Link>
          </Button>
        </div>

        {state === 'locked' ? (
          <div className="flex items-start gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-5">
            <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-amber-700" />
            <div>
              <p className="font-bold text-amber-900">For verified businesses</p>
              <p className="text-sm text-amber-800">{locked?.message}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button className="bg-yellow-400 font-bold text-slate-900 hover:bg-yellow-300" asChild>
                  <Link href={locked?.hasBusiness ? '/business/verify' : '/business/create'}>
                    {locked?.hasBusiness ? 'Get verified' : 'List my business'}
                  </Link>
                </Button>
                <Button variant="outline" className="border-amber-300 font-bold text-amber-900" asChild>
                  <Link href="/talent/profile">Looking for work? Build your profile</Link>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3">
              <div className="grid gap-2 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_150px]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    aria-label="Search people"
                    value={filters.q}
                    onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                    placeholder="Name, headline or keyword"
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
                    placeholder="Skill, then Enter"
                    className={cn(field, 'w-full pl-9 pr-3')}
                  />
                </div>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    aria-label="Town or city"
                    value={filters.location}
                    onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value }))}
                    placeholder="Town or city"
                    className={cn(field, 'w-full pl-9 pr-3')}
                  />
                </div>
                <select
                  aria-label="Minimum experience"
                  value={filters.minYears}
                  onChange={(e) => setFilters((f) => ({ ...f, minYears: e.target.value }))}
                  className={cn(field, 'px-3 font-semibold')}
                >
                  <option value="">Any experience</option>
                  {['1', '3', '5', '10'].map((y) => <option key={y} value={y}>{y}+ years</option>)}
                </select>
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={filters.openOnly}
                    onChange={(e) => setFilters((f) => ({ ...f, openOnly: e.target.checked }))}
                    className="h-3.5 w-3.5 rounded border-slate-300"
                  />
                  Open to work only
                </label>
                {filters.skills.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => setFilters((f) => ({ ...f, skills: f.skills.filter((s) => s !== skill) }))}
                    className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900 hover:bg-amber-200"
                  >
                    {skill} <X className="h-3 w-3" />
                  </button>
                ))}
                {anyFilter && (
                  <button type="button" onClick={() => setFilters(EMPTY)} className="px-1 text-xs font-bold text-slate-600 underline underline-offset-2 hover:text-slate-900">
                    Reset
                  </button>
                )}
              </div>
            </div>

            {state === 'loading' ? (
              <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-slate-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading people…
              </div>
            ) : state === 'error' ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
                <p className="font-bold text-red-900">The directory could not be loaded</p>
                <Button variant="outline" onClick={() => { setState('loading'); setAttempt((n) => n + 1); }} className="mt-3 border-red-300 font-bold text-red-900">Try again</Button>
              </div>
            ) : profiles.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
                <Users className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 font-bold text-slate-900">{anyFilter && (filters.q || filters.skills.length || filters.location || filters.minYears) ? 'Nobody matches those filters' : 'Nobody has listed a profile yet'}</p>
                <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                  Posting a role is the surest way to reach people: every applicant comes with a profile and CV.
                </p>
                <Button className="mt-4 bg-yellow-400 font-bold text-slate-900 hover:bg-yellow-300" asChild>
                  <Link href="/business/jobs?new=1">Post a role</Link>
                </Button>
              </div>
            ) : (
              <>
                <ul className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                  {profiles.map((p) => (
                    <li key={p.userId}>
                      <TalentCard
                        profile={p}
                        maxSkills={6}
                        footer={(
                          <div className="flex gap-2">
                            <Button asChild size="sm" className="flex-1 gap-1.5 bg-yellow-400 font-bold text-slate-900 hover:bg-yellow-300">
                              <Link href={`/dashboard/messages?with=${p.userId}`}><MessageSquare className="h-4 w-4" /> Message</Link>
                            </Button>
                            <Button asChild size="sm" variant="outline" className="flex-1 border-slate-300 font-bold text-slate-800">
                              <Link href={`/talent/${p.userId}`}>View profile</Link>
                            </Button>
                          </div>
                        )}
                      />
                    </li>
                  ))}
                </ul>
                {nextOffset !== null && (
                  <div className="mt-5 flex justify-center">
                    <Button onClick={loadMore} disabled={loadingMore} variant="outline" className="gap-2 border-slate-300 px-6 font-bold text-slate-800">
                      {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                      Show more people
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
