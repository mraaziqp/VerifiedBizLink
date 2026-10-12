'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Archive, Briefcase, Copy, ExternalLink, Eye, Loader2, MoreHorizontal, Pause, Pencil, Play,
  Plus, RotateCcw, Send, Share2, ShieldAlert, Trash2, Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { SubpageNav } from '@/components/layout/subpage-nav';
import { useOpenedOnce } from '@/hooks/use-opened-once';
import { JobFactChips, JobStatusPill } from '@/components/jobs/job-badges';
import { FilterPill } from '@/components/jobs/filter-pill';
import { JOB_STATUS_LABELS, formatDay, jobPath, postedAgo, type JobStatus } from '@/lib/talent';
import type { JobJson } from '@/lib/jobs-server';
import { cn } from '@/lib/utils';

// Loaded when first opened: most visits never share, and the dialog brings
// the QR generator with it.
const ShareJobModal = dynamic(() => import('@/components/jobs/share-job-modal').then((m) => m.ShareJobModal), { ssr: false });
// And the editor: the list is what this page is opened for most of the time.
const JobEditorSheet = dynamic(() => import('@/components/jobs/job-editor-sheet').then((m) => m.JobEditorSheet), { ssr: false });

interface Business { id: string; companyName: string; verified: boolean }

type Filter = 'all' | JobStatus;
const FILTERS: Filter[] = ['all', 'open', 'draft', 'paused', 'closed'];

/**
 * The employer's own roles: what is live, what is waiting, how many people
 * applied to each, and every action on a listing within one click.
 */
export function ManageJobsDashboard() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [jobs, setJobs] = useState<JobJson[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [filter, setFilter] = useState<Filter>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<JobJson | null>(null);
  const [sharing, setSharing] = useState<JobJson | null>(null);
  // Kept while the dialog animates shut, so it does not blank mid-close.
  const [lastShared, setLastShared] = useState<JobJson | null>(null);
  const editorOpened = useOpenedOnce(editorOpen);
  const shareOpened = useOpenedOnce(sharing !== null);

  useEffect(() => {
    if (sharing) setLastShared(sharing);
  }, [sharing]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/jobs?mine=true&limit=60', { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setJobs(Array.isArray(data.jobs) ? data.jobs : []);
      setBusiness(data.business ?? null);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  // "Post a Job" links from elsewhere in the app land here with ?new=1.
  useEffect(() => {
    if (state !== 'ready' || !business || searchParams.get('new') !== '1') return;
    setEditing(null);
    setEditorOpen(true);
    router.replace('/business/jobs', { scroll: false });
  }, [state, business, searchParams, router]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: jobs.length, draft: 0, open: 0, paused: 0, closed: 0 };
    for (const j of jobs) c[j.status] += 1;
    return c;
  }, [jobs]);

  const totals = useMemo(() => ({
    applicants: jobs.reduce((n, j) => n + j.applicationCount, 0),
    views: jobs.reduce((n, j) => n + j.viewsCount, 0),
  }), [jobs]);

  const visible = filter === 'all' ? jobs : jobs.filter((j) => j.status === filter);

  const openEditor = (job: JobJson | null) => {
    setEditing(job);
    setEditorOpen(true);
  };

  /** A single status change or action; the list is re-read afterwards so counts stay true. */
  const act = async (job: JobJson, request: () => Promise<Response>, fallbackTitle: string) => {
    setBusyId(job.id);
    try {
      const res = await request();
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast({ title: data.message ?? fallbackTitle });
        await refresh();
      } else {
        toast({ title: 'That did not work', description: data.error ?? 'Please try again.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Could not reach the server', variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const setStatus = (job: JobJson, status: JobStatus) => act(job, () => fetch(`/api/jobs/${job.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  }), 'Updated.');

  const duplicate = (job: JobJson) => act(job, () => fetch(`/api/jobs/${job.id}/duplicate`, { method: 'POST' }), 'Copied as a draft.');

  const archive = (job: JobJson) => {
    const applicants = job.applicationCount;
    const detail = applicants > 0
      ? ` ${applicants} applicant${applicants === 1 ? ' keeps' : 's keep'} their history, and you can reopen it later.`
      : ' You can reopen it later.';
    if (!window.confirm(`Archive "${job.title}"? It comes off the jobs board.${detail}`)) return;
    void setStatus(job, 'closed');
  };

  const removeDraft = (job: JobJson) => {
    if (!window.confirm(`Delete the draft "${job.title}"? This cannot be undone.`)) return;
    void act(job, () => fetch(`/api/jobs/${job.id}`, { method: 'DELETE' }), 'Draft deleted.');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <SubpageNav title="Jobs & hiring" />

      {/* Extra room at the bottom so the last row's actions scroll clear of
          the floating chat buttons. */}
      <div className="mx-auto max-w-6xl px-4 pb-28 pt-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Your roles</h1>
            <p className="mt-1 text-sm text-slate-600">
              Candidates see that your business is verified before they apply.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="gap-2 border-slate-300 font-bold text-slate-800">
              <Link href="/talent"><Users className="h-4 w-4" /> Find talent</Link>
            </Button>
            {business && (
              <Button onClick={() => openEditor(null)} className="gap-2 bg-yellow-400 font-bold text-slate-900 hover:bg-yellow-300">
                <Plus className="h-4 w-4" /> Post a role
              </Button>
            )}
          </div>
        </div>

        {state === 'ready' && business && !business.verified && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-5">
            <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-amber-700" />
            <div>
              <p className="font-bold text-amber-900">Only verified businesses can publish jobs</p>
              <p className="text-sm text-amber-800">
                That is what makes a listing here worth applying to. You can write and save drafts now;
                they go live as soon as you are verified.
              </p>
              <Button className="mt-3 bg-yellow-400 font-bold text-slate-900 hover:bg-yellow-300" asChild>
                <Link href="/business/verify">Get verified</Link>
              </Button>
            </div>
          </div>
        )}

        {state === 'loading' && (
          <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading your roles…
          </div>
        )}

        {state === 'error' && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <p className="font-bold text-red-900">Your roles could not be loaded</p>
            <p className="mt-1 text-sm text-red-800">Nothing has been lost. Check your connection and try again.</p>
            <Button onClick={() => { setState('loading'); void refresh(); }} variant="outline" className="mt-4 border-red-300 font-bold text-red-900">
              Try again
            </Button>
          </div>
        )}

        {state === 'ready' && !business && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <Briefcase className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-lg font-bold text-slate-900">Hiring starts with a business profile</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
              Roles are posted by a business, so candidates know who they are applying to. Listing yours is free.
            </p>
            <Button className="mt-4 bg-yellow-400 font-bold text-slate-900 hover:bg-yellow-300" asChild>
              <Link href="/business/create">List my business</Link>
            </Button>
          </div>
        )}

        {state === 'ready' && business && (
          <>
            <dl className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Live roles', value: counts.open },
                { label: 'Applicants', value: totals.applicants },
                { label: 'Views', value: totals.views },
                { label: 'Drafts', value: counts.draft },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{stat.label}</dt>
                  <dd className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900">{stat.value}</dd>
                </div>
              ))}
            </dl>

            <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
              {FILTERS.map((f) => (
                <FilterPill key={f} active={filter === f} onClick={() => setFilter(f)} count={counts[f]}>
                  {f === 'all' ? 'All' : JOB_STATUS_LABELS[f]}
                </FilterPill>
              ))}
            </div>

            {jobs.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
                <Briefcase className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 font-bold text-slate-900">No roles posted yet</p>
                <p className="mt-1 text-sm text-slate-500">Post one and it appears on the jobs board with your verified badge.</p>
                <Button onClick={() => openEditor(null)} className="mt-4 gap-2 bg-yellow-400 font-bold text-slate-900 hover:bg-yellow-300">
                  <Plus className="h-4 w-4" /> Post your first role
                </Button>
              </div>
            ) : visible.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
                No {filter !== 'all' ? JOB_STATUS_LABELS[filter].toLowerCase() : ''} roles.
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="hidden grid-cols-[minmax(0,1fr)_120px_130px_90px_190px] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-500 md:grid">
                  <span>Role</span>
                  <span>Status</span>
                  <span>Applicants</span>
                  <span>Views</span>
                  <span className="text-right">Actions</span>
                </div>

                <ul className="divide-y divide-slate-100">
                  {visible.map((job) => {
                    const busy = busyId === job.id;
                    const applicantsHref = `/business/jobs/${job.id}`;
                    return (
                      <li
                        key={job.id}
                        className={cn(
                          'grid grid-cols-1 gap-3 px-4 py-4 sm:px-5 md:grid-cols-[minmax(0,1fr)_120px_130px_90px_190px] md:items-center md:gap-4',
                          busy && 'opacity-60',
                        )}
                      >
                        <div className="min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            {job.status === 'draft' ? (
                              <button type="button" onClick={() => openEditor(job)} className="truncate text-left text-base font-bold text-slate-900 hover:underline">
                                {job.title}
                              </button>
                            ) : (
                              <Link href={applicantsHref} className="truncate text-base font-bold text-slate-900 hover:underline">
                                {job.title}
                              </Link>
                            )}
                            <JobStatusPill status={job.status} className="shrink-0 md:hidden" />
                          </div>
                          <JobFactChips job={job} showPosted={false} className="mt-1.5" />
                          <p className="mt-1.5 text-xs text-slate-500">
                            {job.status === 'draft'
                              ? `Draft · last edited ${postedAgo(job.updatedAt).toLowerCase()}`
                              : `Posted ${postedAgo(job.publishedAt ?? job.createdAt).toLowerCase()}`}
                            {job.applicationDeadline ? ` · closes ${formatDay(job.applicationDeadline)}` : ''}
                            {!job.salaryVisible && (job.salaryMinCents || job.salaryMaxCents) ? ' · pay hidden from candidates' : ''}
                          </p>
                        </div>

                        <div className="hidden md:block"><JobStatusPill status={job.status} /></div>

                        <div className="flex items-center gap-4 md:contents">
                          <Link
                            href={applicantsHref}
                            className={cn(
                              'inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-bold tabular-nums transition-colors',
                              job.applicationCount > 0
                                ? 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                                : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100',
                            )}
                            aria-label={`${job.applicationCount} applicants for ${job.title}`}
                          >
                            <Users className="h-3.5 w-3.5" />
                            {job.applicationCount}
                            <span className="font-semibold md:hidden">applicant{job.applicationCount === 1 ? '' : 's'}</span>
                          </Link>

                          <span className="inline-flex items-center gap-1.5 text-sm tabular-nums text-slate-600">
                            <Eye className="h-3.5 w-3.5 text-slate-400" /> {job.viewsCount}
                            <span className="md:hidden">views</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 md:justify-end">
                          {job.status === 'draft' ? (
                            <Button size="sm" onClick={() => openEditor(job)} disabled={busy} className="gap-1.5 bg-slate-900 font-bold text-white hover:bg-slate-800">
                              <Pencil className="h-3.5 w-3.5" /> Finish
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => setSharing(job)} disabled={busy} className="gap-1.5 border-slate-300 font-bold text-slate-800">
                              <Share2 className="h-3.5 w-3.5" /> Share
                            </Button>
                          )}

                          {/* Not modal: several items open a dialog or the editor
                              sheet. A modal menu and the dialog it opens both
                              lock the page, and the menu's unlock can land
                              after the dialog's lock — leaving the page
                              ignoring every click once the dialog is closed. */}
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="outline" disabled={busy} aria-label={`More actions for ${job.title}`} className="border-slate-300 px-2 text-slate-700">
                                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuItem onSelect={() => openEditor(job)}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              {job.status !== 'draft' && (
                                <DropdownMenuItem asChild>
                                  <Link href={jobPath(job)} target="_blank">
                                    <ExternalLink className="mr-2 h-4 w-4" /> View public page
                                  </Link>
                                </DropdownMenuItem>
                              )}
                              {job.status === 'draft' && (
                                <DropdownMenuItem onSelect={() => void setStatus(job, 'open')}>
                                  <Send className="mr-2 h-4 w-4" /> Publish
                                </DropdownMenuItem>
                              )}
                              {job.status === 'open' && (
                                <DropdownMenuItem onSelect={() => void setStatus(job, 'paused')}>
                                  <Pause className="mr-2 h-4 w-4" /> Pause
                                </DropdownMenuItem>
                              )}
                              {job.status === 'paused' && (
                                <DropdownMenuItem onSelect={() => void setStatus(job, 'open')}>
                                  <Play className="mr-2 h-4 w-4" /> Resume
                                </DropdownMenuItem>
                              )}
                              {job.status === 'closed' && (
                                <DropdownMenuItem onSelect={() => void setStatus(job, 'open')}>
                                  <RotateCcw className="mr-2 h-4 w-4" /> Reopen
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onSelect={() => void duplicate(job)}>
                                <Copy className="mr-2 h-4 w-4" /> Duplicate
                              </DropdownMenuItem>
                              {job.status !== 'draft' && (
                                <DropdownMenuItem onSelect={() => setSharing(job)}>
                                  <Share2 className="mr-2 h-4 w-4" /> Share &amp; distribute
                                </DropdownMenuItem>
                              )}
                              {job.status !== 'closed' && <DropdownMenuSeparator />}
                              {job.status === 'draft' ? (
                                <DropdownMenuItem onSelect={() => removeDraft(job)} className="text-red-700 focus:text-red-700">
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete draft
                                </DropdownMenuItem>
                              ) : job.status !== 'closed' ? (
                                <DropdownMenuItem onSelect={() => archive(job)} className="text-red-700 focus:text-red-700">
                                  <Archive className="mr-2 h-4 w-4" /> Archive
                                </DropdownMenuItem>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      {editorOpened && <JobEditorSheet
        open={editorOpen}
        onOpenChange={setEditorOpen}
        job={editing}
        businessVerified={business?.verified === true}
        onSaved={(message) => {
          toast({ title: message });
          void refresh();
        }}
      />}
      {shareOpened && (
        <ShareJobModal job={sharing ?? lastShared} open={sharing !== null} onOpenChange={(o) => { if (!o) setSharing(null); }} />
      )}
    </div>
  );
}
