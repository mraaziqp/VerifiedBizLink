'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Columns3, ExternalLink, FileText, List, Loader2, MapPin, MessageSquare, Search, Share2, Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { CandidateDrawer } from '@/components/jobs/candidate-drawer';
import { useOpenedOnce } from '@/hooks/use-opened-once';
import { JobStatusPill, MatchBadge } from '@/components/jobs/job-badges';
import { FilterPill } from '@/components/jobs/filter-pill';
import { PersonAvatar } from '@/components/talent/person-avatar';
import type { Applicant } from '@/components/jobs/applicant-types';
import {
  APPLICATION_STATUS_LABELS, PIPELINE_STATUSES, formatDay, jobPath, statusMessageTemplate, type ApplicationStatus,
} from '@/lib/talent';
import type { JobJson } from '@/lib/jobs-server';
import { cn } from '@/lib/utils';

// Loaded when first opened: most visits never share, and the dialog brings
// the QR generator with it.
const ShareJobModal = dynamic(() => import('@/components/jobs/share-job-modal').then((m) => m.ShareJobModal), { ssr: false });

const COLUMN_TONE: Record<string, string> = {
  applied: 'border-blue-200 bg-blue-50/50',
  reviewing: 'border-sky-200 bg-sky-50/50',
  shortlisted: 'border-amber-200 bg-amber-50/50',
  interview: 'border-purple-200 bg-purple-50/50',
  hired: 'border-emerald-200 bg-emerald-50/50',
  rejected: 'border-slate-200 bg-slate-100/60',
};

type StatusFilter = 'all' | ApplicationStatus;
type SortBy = 'match' | 'newest';

interface PendingMove { applicant: Applicant; to: ApplicationStatus }

/**
 * Applicant tracking for one role: a board to move people between stages, a
 * list for scanning many at once, and a drawer with everything about one
 * candidate.
 *
 * Moving someone always passes through a confirmation that shows the message
 * they are about to receive. A stage change tells a real person something
 * about their job prospects, so it is never sent by a stray drag.
 */
export function ApplicantManager({ jobId }: { jobId: string }) {
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [job, setJob] = useState<JobJson | null>(null);
  const [apps, setApps] = useState<Applicant[]>([]);
  /** Everyone who applied; larger than `apps` only for a role with more than the board loads. */
  const [total, setTotal] = useState<number | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');

  const [view, setView] = useState<'board' | 'list'>('board');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('match');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingMove | null>(null);
  const [moveMessage, setMoveMessage] = useState('');
  const [moveNotify, setMoveNotify] = useState(true);
  const [moving, setMoving] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<ApplicationStatus | null>(null);
  const [sharing, setSharing] = useState(false);
  const shareOpened = useOpenedOnce(sharing);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/applications`, { cache: 'no-store' });
      if (res.status === 403) { setState('forbidden'); return; }
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setJob(data.job ?? null);
      setApps(Array.isArray(data.applications) ? data.applications : []);
      setTotal(typeof data.total === 'number' ? data.total : null);
      setState('ready');
    } catch {
      setState('error');
    }
  }, [jobId]);

  useEffect(() => { void load(); }, [load]);

  // A board with six columns needs width; on a phone the list is the better default.
  useEffect(() => {
    if (window.matchMedia('(max-width: 767px)').matches) setView('list');
  }, []);

  // The "Review application" link in the new-applicant email opens straight onto that person.
  const linked = searchParams.get('applicant');
  useEffect(() => {
    if (state === 'ready' && linked && apps.some((a) => a.id === linked)) setSelectedId(linked);
    // Only on first load: closing the drawer must not reopen it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, linked]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: apps.length, withdrawn: 0 };
    for (const s of PIPELINE_STATUSES) c[s] = 0;
    for (const a of apps) c[a.status] = (c[a.status] ?? 0) + 1;
    return c;
  }, [apps]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = apps.filter((a) => {
      if (filter !== 'all' && a.status !== filter) return false;
      if (!q) return true;
      return [a.applicant.fullName, a.headline, a.applicant.location, ...a.skills]
        .some((v) => String(v ?? '').toLowerCase().includes(q));
    });
    return [...list].sort((x, y) => (sortBy === 'match'
      ? (y.matchScore ?? -1) - (x.matchScore ?? -1) || x.createdAt.localeCompare(y.createdAt)
      : y.createdAt.localeCompare(x.createdAt)));
  }, [apps, filter, query, sortBy]);

  const selected = apps.find((a) => a.id === selectedId) ?? null;

  const requestMove = (applicant: Applicant, to: ApplicationStatus) => {
    if (applicant.status === to || applicant.status === 'withdrawn') return;
    const template = job
      ? statusMessageTemplate(to, { candidateName: applicant.applicant.fullName, jobTitle: job.title, companyName: job.companyName })
      : null;
    setMoveMessage(template ?? '');
    // Moving someone back to "New" is tidying up, not news for them.
    setMoveNotify(template !== null);
    setPending({ applicant, to });
  };

  const confirmMove = async () => {
    if (!pending) return;
    const { applicant, to } = pending;
    setMoving(true);
    try {
      const res = await fetch(`/api/applications/${applicant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: to, notify: moveNotify, message: moveNotify ? moveMessage : '' }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setApps((list) => list.map((a) => (a.id === applicant.id
          ? { ...a, status: to, statusNote: data.application?.statusNote ?? null, statusChangedAt: data.application?.statusChangedAt ?? a.statusChangedAt }
          : a)));
        toast({ title: data.message ?? 'Moved.' });
        setPending(null);
      } else {
        toast({ title: 'Could not update', description: data.error ?? 'Please try again.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Could not reach the server', description: 'Nothing was changed.', variant: 'destructive' });
    } finally {
      setMoving(false);
    }
  };

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-7 w-7 animate-spin text-slate-700" />
      </div>
    );
  }

  if (state === 'forbidden' || state === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center">
        <p className="text-lg font-bold text-slate-900">
          {state === 'forbidden' ? 'This is not your listing' : 'The applicants could not be loaded'}
        </p>
        {state === 'error' && <p className="text-sm text-slate-600">Nothing has been lost. Check your connection and try again.</p>}
        <div className="flex gap-2">
          {state === 'error' && (
            <Button onClick={() => { setState('loading'); void load(); }} className="bg-slate-900 font-bold text-white hover:bg-slate-800">Try again</Button>
          )}
          <Button variant="outline" className="gap-2 border-slate-300" asChild>
            <Link href="/business/jobs"><ArrowLeft className="h-4 w-4" /> Your jobs</Link>
          </Button>
        </div>
      </div>
    );
  }

  const card = (a: Applicant, compact: boolean) => (
    <div
      key={a.id}
      draggable={compact && a.status !== 'withdrawn'}
      onDragStart={(e) => {
        setDragId(a.id);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', a.id);
      }}
      onDragEnd={() => { setDragId(null); setDropTarget(null); }}
      className={cn(
        'rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md',
        compact && a.status !== 'withdrawn' && 'cursor-grab active:cursor-grabbing',
        dragId === a.id && 'opacity-40',
      )}
    >
      <button
        type="button"
        onClick={() => setSelectedId(a.id)}
        className="block w-full rounded-t-xl p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
        aria-label={`Open ${a.applicant.fullName}'s application`}
      >
        <div className="flex items-start gap-2.5">
          <PersonAvatar name={a.applicant.fullName} src={a.applicant.avatarUrl} size={36} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate text-sm font-bold text-slate-900">{a.applicant.fullName}</p>
              {/* Just the figure on the board: a column is too narrow for the name and the word "match". */}
              {a.matchScore !== null && <MatchBadge score={a.matchScore} compact={compact} className="shrink-0 px-1.5 text-[11px]" />}
            </div>
            {a.headline && <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{a.headline}</p>}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
          {a.applicant.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {a.applicant.location}</span>}
          <span>Applied {formatDay(a.createdAt)}</span>
          {a.cvUrl && <span className="inline-flex items-center gap-1"><FileText className="h-3 w-3" /> CV</span>}
          {a.unreadMessages > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-1.5 font-black text-slate-900">
              <MessageSquare className="h-3 w-3" /> {a.unreadMessages} new
            </span>
          )}
        </div>

        {a.skills.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {a.skills.slice(0, compact ? 3 : 6).map((s) => (
              <span key={s} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">{s}</span>
            ))}
            {a.skills.length > (compact ? 3 : 6) && (
              <span className="text-[10px] text-slate-400">+{a.skills.length - (compact ? 3 : 6)}</span>
            )}
          </div>
        )}
      </button>

      {/* A select as well as dragging: this is what works on a phone, with a
          keyboard, and with a screen reader. */}
      <div className="flex items-center gap-2 border-t border-slate-100 px-3 py-2">
        {a.status === 'withdrawn' ? (
          <span className="text-[11px] font-semibold text-slate-500">Withdrawn by the candidate</span>
        ) : (
          <label className="flex min-w-0 flex-1 items-center gap-1.5 text-[11px] font-bold text-slate-500">
            <span className="sr-only">Move {a.applicant.fullName} to</span>
            <span aria-hidden>Stage</span>
            <select
              value={a.status}
              onChange={(e) => requestMove(a, e.target.value as ApplicationStatus)}
              className="h-7 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-1.5 text-xs font-semibold text-slate-800"
            >
              {PIPELINE_STATUSES.map((s) => <option key={s} value={s}>{APPLICATION_STATUS_LABELS[s]}</option>)}
            </select>
          </label>
        )}
        <Link
          href={`/dashboard/messages?with=${a.applicant.id}`}
          aria-label={`Message ${a.applicant.fullName}`}
          className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:border-slate-400 hover:text-slate-900"
        >
          <MessageSquare className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );

  const boardColumns = filter === 'all' ? PIPELINE_STATUSES : PIPELINE_STATUSES.filter((s) => s === filter);
  const filters: StatusFilter[] = ['all', ...PIPELINE_STATUSES, ...(counts.withdrawn > 0 ? ['withdrawn' as const] : [])];
  const firstName = pending?.applicant.applicant.fullName?.trim().split(/\s+/)[0] || 'the candidate';

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:py-8">
        <Link href="/business/jobs" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Your jobs
        </Link>

        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{job?.title ?? 'Applicants'}</h1>
              {job && <JobStatusPill status={job.status} />}
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
              <Users className="h-4 w-4 text-slate-400" />
              {total ?? apps.length} applicant{(total ?? apps.length) === 1 ? '' : 's'}
              {total !== null && total > apps.length ? ` (showing the ${apps.length} best matches)` : ''}
              {job ? ` · ${job.viewsCount} view${job.viewsCount === 1 ? '' : 's'}` : ''}
            </p>
          </div>
          {job && job.status !== 'draft' && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild className="gap-2 border-slate-300 font-bold text-slate-800">
                <Link href={jobPath(job)} target="_blank"><ExternalLink className="h-4 w-4" /> Public page</Link>
              </Button>
              <Button onClick={() => setSharing(true)} className="gap-2 bg-yellow-400 font-bold text-slate-900 hover:bg-yellow-300">
                <Share2 className="h-4 w-4" /> Share
              </Button>
            </div>
          )}
        </div>

        {apps.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <Users className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-bold text-slate-900">No applications yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
              {job?.status === 'open'
                ? 'Sharing the role is the fastest way to get it in front of people — WhatsApp groups and LinkedIn work well.'
                : 'This role is not live, so nobody can apply to it at the moment.'}
            </p>
            {job?.status === 'open' && (
              <Button onClick={() => setSharing(true)} className="mt-4 gap-2 bg-yellow-400 font-bold text-slate-900 hover:bg-yellow-300">
                <Share2 className="h-4 w-4" /> Share this role
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center">
              <div className="relative lg:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name, headline or skill"
                  aria-label="Search applicants"
                  className="h-10 border-slate-200 bg-white pl-9 text-slate-900"
                />
              </div>

              <div className="flex flex-1 gap-1.5 overflow-x-auto pb-1 lg:pb-0">
                {filters.map((f) => (
                  <FilterPill key={f} size="sm" active={filter === f} onClick={() => setFilter(f)} count={counts[f] ?? 0}>
                    {f === 'all' ? 'All' : APPLICATION_STATUS_LABELS[f]}
                  </FilterPill>
                ))}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  aria-label="Sort applicants"
                  className="h-10 rounded-md border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-800"
                >
                  <option value="match">Best match first</option>
                  <option value="newest">Newest first</option>
                </select>
                <div className="flex rounded-lg border border-slate-200 bg-white p-0.5" role="group" aria-label="Layout">
                  {([['board', Columns3, 'Board'], ['list', List, 'List']] as const).map(([id, Icon, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setView(id)}
                      aria-pressed={view === id}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-bold',
                        view === id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900',
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" /> {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
                Nobody matches that.{' '}
                <button type="button" className="font-bold text-slate-900 underline" onClick={() => { setQuery(''); setFilter('all'); }}>
                  Clear filters
                </button>
              </div>
            ) : view === 'board' && filter !== 'withdrawn' ? (
              /* Columns scroll sideways rather than squeezing six stages into
                 a width that makes each card unreadable. */
              <div className="flex gap-3 overflow-x-auto pb-4">
                {boardColumns.map((stage) => {
                  const inStage = filtered.filter((a) => a.status === stage);
                  const dragged = apps.find((a) => a.id === dragId);
                  const canDrop = Boolean(dragged) && dragged!.status !== stage;
                  return (
                    <div
                      key={stage}
                      onDragOver={(e) => { if (canDrop) { e.preventDefault(); setDropTarget(stage); } }}
                      onDragLeave={() => setDropTarget((t) => (t === stage ? null : t))}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDropTarget(null);
                        if (dragged) requestMove(dragged, stage);
                      }}
                      className={cn(
                        'flex w-[272px] shrink-0 flex-col rounded-2xl border p-2.5 transition-colors',
                        boardColumns.length === 1 && 'w-full max-w-xl',
                        COLUMN_TONE[stage],
                        dropTarget === stage && 'ring-2 ring-slate-900',
                      )}
                    >
                      <div className="mb-2.5 flex items-center justify-between px-1">
                        <h2 className="text-sm font-bold text-slate-900">{APPLICATION_STATUS_LABELS[stage]}</h2>
                        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold tabular-nums text-slate-600">{inStage.length}</span>
                      </div>
                      <div className="space-y-2.5">
                        {inStage.map((a) => card(a, true))}
                        {inStage.length === 0 && (
                          <p className="rounded-xl border border-dashed border-slate-300/70 p-4 text-center text-xs text-slate-400">
                            {dragId ? 'Drop here' : 'Nobody here'}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {/* Each card's stage selector already says where the person
                    is, so the list needs no separate status chip. */}
                {filtered.map((a) => <li key={a.id}>{card(a, false)}</li>)}
              </ul>
            )}

            {view === 'board' && filter === 'all' && counts.withdrawn > 0 && (
              <button type="button" onClick={() => setFilter('withdrawn')} className="mt-1 text-xs font-semibold text-slate-500 underline underline-offset-2 hover:text-slate-900">
                {counts.withdrawn} withdrawn application{counts.withdrawn === 1 ? '' : 's'} not shown on the board
              </button>
            )}
          </>
        )}
      </div>

      <CandidateDrawer
        applicant={selected}
        requiredSkills={job?.requiredSkills ?? []}
        onClose={() => setSelectedId(null)}
        onMove={requestMove}
        onNotesSaved={(applicationId, notes) =>
          setApps((list) => list.map((a) => (a.id === applicationId ? { ...a, employerNotes: notes } : a)))}
      />

      <Dialog open={pending !== null} onOpenChange={(open) => { if (!open && !moving) setPending(null); }}>
        <DialogContent className="max-w-md rounded-2xl bg-white">
          {pending && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-extrabold text-slate-900">
                  Move to {APPLICATION_STATUS_LABELS[pending.to]}?
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-600">
                  {pending.applicant.applicant.fullName} · currently {APPLICATION_STATUS_LABELS[pending.applicant.status]}
                </DialogDescription>
              </DialogHeader>

              <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <input
                  type="checkbox"
                  checked={moveNotify}
                  onChange={(e) => setMoveNotify(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300"
                />
                <span>
                  <span className="block text-sm font-bold text-slate-900">Tell {firstName}</span>
                  <span className="block text-xs text-slate-600">
                    Sent as a message from you and by email, and they can reply to it. Untick to move them without contacting them.
                  </span>
                </span>
              </label>

              {moveNotify && (
                <div>
                  <label htmlFor="move-message" className="text-xs font-bold uppercase tracking-wide text-slate-500">Message</label>
                  <Textarea
                    id="move-message"
                    value={moveMessage}
                    onChange={(e) => setMoveMessage(e.target.value)}
                    rows={5}
                    maxLength={1500}
                    className="mt-1 border-slate-200 bg-white text-slate-900"
                  />
                </div>
              )}

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" disabled={moving} onClick={() => setPending(null)} className="border-slate-300 text-slate-800">Cancel</Button>
                <Button
                  disabled={moving || (moveNotify && !moveMessage.trim())}
                  onClick={confirmMove}
                  className="gap-2 bg-slate-900 font-bold text-white hover:bg-slate-800"
                >
                  {moving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {moveNotify ? 'Move and send' : 'Move'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {shareOpened && <ShareJobModal job={job} open={sharing} onOpenChange={setSharing} />}
    </div>
  );
}
