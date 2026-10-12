'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Bookmark, BookmarkCheck, Calendar, CheckCircle2, ExternalLink, Eye, Loader2, Send, Share2, Users, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Markdown } from '@/components/jobs/markdown';
import { CompanyMark, JobFactChips, JobStatusPill, MatchBadge, VerifiedChip } from '@/components/jobs/job-badges';
import { useOpenedOnce } from '@/hooks/use-opened-once';
import { CANDIDATE_STATUS_LABELS, formatDay, isApplicationStatus, jobPath } from '@/lib/talent';
import type { JobView } from '@/lib/jobs-server';
import { cn } from '@/lib/utils';

// Loaded when first opened: most visits never share, and the dialog brings
// the QR generator with it.
const ShareJobModal = dynamic(() => import('@/components/jobs/share-job-modal').then((m) => m.ShareJobModal), { ssr: false });
// Likewise the apply form: someone reading a listing has not asked for it yet.
const QuickApplyModal = dynamic(() => import('@/components/jobs/quick-apply-modal').then((m) => m.QuickApplyModal), { ssr: false });

interface JobDetailViewProps {
  view: JobView;
  /** 'page' is the public job page; 'panel' is the quick view over the feed. */
  variant: 'page' | 'panel';
  /**
   * The header is known but the body is still on its way (the quick view opens
   * from a list item, which carries no description). Shows a placeholder
   * where the text will be instead of an empty "About the role".
   */
  loadingBody?: boolean;
  onChange?: (patch: { hasApplied?: boolean; isSaved?: boolean }) => void;
}

/**
 * One role, in full: used as the public page a share link opens and as the
 * quick view on the jobs board, so both always say the same thing.
 */
export function JobDetailView({ view, variant, loadingBody = false, onChange }: JobDetailViewProps) {
  const { toast } = useToast();
  const { job, isOwner, viewer } = view;

  const [hasApplied, setHasApplied] = useState(view.hasApplied);
  const [isSaved, setIsSaved] = useState(view.isSaved);
  const [applying, setApplying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [applyMode, setApplyMode] = useState<'note' | 'fresh' | null>(null);
  const [sharing, setSharing] = useState(false);
  // The form keeps showing the mode it was opened in while it animates shut.
  const [lastApplyMode, setLastApplyMode] = useState<'note' | 'fresh'>('note');
  const applyOpened = useOpenedOnce(applyMode !== null);
  const shareOpened = useOpenedOnce(sharing);

  useEffect(() => {
    if (applyMode) setLastApplyMode(applyMode);
  }, [applyMode]);

  useEffect(() => {
    setHasApplied(view.hasApplied);
    setIsSaved(view.isSaved);
  }, [view.job.id, view.hasApplied, view.isSaved]);

  const path = jobPath(job);
  const loginHref = `/login?from=${encodeURIComponent(path)}`;
  const signupHref = `/signup?from=${encodeURIComponent(path)}`;

  const applied = (message: string) => {
    setHasApplied(true);
    setIsSaved(false);
    onChange?.({ hasApplied: true, isSaved: false });
    toast({ title: 'Application sent', description: message });
  };

  /** The one-click path: the profile is ready, so there is nothing to ask. */
  const quickApply = async () => {
    setApplying(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) applied(data.message ?? 'Application sent.');
      else if (data.needsProfile) setApplyMode('fresh');
      else toast({ title: 'Could not apply', description: data.error ?? 'Please try again.', variant: 'destructive' });
    } catch {
      toast({ title: 'Could not send your application', description: 'Check your connection and try again.', variant: 'destructive' });
    } finally {
      setApplying(false);
    }
  };

  const toggleSave = async () => {
    if (!viewer.signedIn) {
      window.location.href = loginHref;
      return;
    }
    const next = !isSaved;
    setSaving(true);
    setIsSaved(next); // optimistic; put back if the server disagrees
    try {
      const res = await fetch(`/api/jobs/${job.id}/save`, { method: next ? 'POST' : 'DELETE' });
      if (!res.ok) throw new Error(String(res.status));
      onChange?.({ isSaved: next });
    } catch {
      setIsSaved(!next);
      toast({ title: next ? 'Could not save this job' : 'Could not remove it', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const Title = variant === 'page' ? 'h1' : 'h2';
  const status = view.applicationStatus;

  const applyPanel = isOwner ? (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div>
        <p className="font-bold text-slate-900">This is your listing</p>
        <p className="flex flex-wrap items-center gap-x-3 text-sm text-slate-600">
          <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {job.applicationCount} applicant{job.applicationCount === 1 ? '' : 's'}</span>
          <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {job.viewsCount} view{job.viewsCount === 1 ? '' : 's'}</span>
        </p>
      </div>
      <Button className="gap-2 bg-yellow-400 font-bold text-slate-900 hover:bg-yellow-300" asChild>
        <Link href={`/business/jobs/${job.id}`}>View applicants</Link>
      </Button>
    </div>
  ) : hasApplied ? (
    <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
      <div className="min-w-0">
        <p className="font-bold text-emerald-900">
          You have applied to this role
          {isApplicationStatus(status) && status !== 'applied' ? ` · ${CANDIDATE_STATUS_LABELS[status]}` : ''}
        </p>
        <Link href="/jobs/applications" className="text-sm font-semibold text-emerald-800 underline underline-offset-2">
          Track your applications
        </Link>
      </div>
    </div>
  ) : !job.acceptingApplications ? (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-600">
      This role is no longer accepting applications.{' '}
      <Link href="/jobs" className="font-bold text-slate-900 underline underline-offset-2">See open roles</Link>
    </div>
  ) : !viewer.signedIn ? (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <p className="font-bold text-slate-900">Apply in a minute</p>
      <p className="mt-0.5 text-sm text-slate-600">
        Create a free account, attach your CV and send.
        {job.businessVerified && ` ${job.companyName} is a verified business, so you know who is on the other end.`}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button className="h-11 gap-2 bg-yellow-400 px-5 font-bold text-slate-900 hover:bg-yellow-300" asChild>
          <Link href={signupHref}><Send className="h-4 w-4" /> Create account &amp; apply</Link>
        </Button>
        <Button variant="outline" className="h-11 border-slate-300 font-bold text-slate-800" asChild>
          <Link href={loginHref}>I already have an account</Link>
        </Button>
      </div>
    </div>
  ) : viewer.canQuickApply ? (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={quickApply} disabled={applying} className="h-11 flex-1 gap-2 bg-yellow-400 px-5 text-base font-bold text-slate-900 hover:bg-yellow-300 sm:flex-none">
          {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          Quick apply
        </Button>
        <Button variant="outline" disabled={applying} onClick={() => setApplyMode('note')} className="h-11 border-slate-300 font-bold text-slate-800">
          Apply with a note
        </Button>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Quick apply sends your profile{viewer.hasCv ? ' and CV as they are' : ' as it is'} right now.{' '}
        <Link href="/talent/profile" className="font-semibold underline underline-offset-2">Review my profile</Link>
      </p>
    </div>
  ) : (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <Button onClick={() => setApplyMode('fresh')} className="h-11 w-full gap-2 bg-yellow-400 text-base font-bold text-slate-900 hover:bg-yellow-300 sm:w-auto sm:px-6">
        <Send className="h-4 w-4" /> Apply now
      </Button>
      <p className="mt-2 text-xs text-slate-500">Attach your CV and send — no separate profile form to fill in first.</p>
    </div>
  );

  return (
    <article className={cn(variant === 'page' ? 'space-y-5' : 'space-y-4')}>
      <header className={cn(variant === 'page' && 'rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7')}>
        <div className="flex items-start gap-3.5">
          <CompanyMark name={job.companyName} logoUrl={job.logoUrl} size={variant === 'page' ? 56 : 48} />
          <div className="min-w-0 flex-1">
            <Title className={cn('font-extrabold leading-tight tracking-tight text-slate-900', variant === 'page' ? 'text-2xl sm:text-3xl' : 'text-xl')}>
              {job.title}
            </Title>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-700">
              <Link href={`/business/${job.businessId}`} className="font-semibold hover:underline">{job.companyName}</Link>
              {job.businessVerified && <VerifiedChip />}
              {(isOwner || job.status !== 'open') && <JobStatusPill status={job.status} />}
            </p>
          </div>
          {view.matchScore !== null && !isOwner && <MatchBadge score={view.matchScore} className="hidden shrink-0 sm:inline-flex" />}
        </div>

        <JobFactChips job={job} className="mt-4" />

        {(job.applicationDeadline || (view.matchScore !== null && !isOwner)) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-600">
            {job.applicationDeadline && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-slate-400" /> Closes {formatDay(job.applicationDeadline, 'long')}
              </span>
            )}
            {view.matchScore !== null && !isOwner && <MatchBadge score={view.matchScore} className="sm:hidden" />}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {!isOwner && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleSave}
              disabled={saving}
              aria-pressed={isSaved}
              className={cn('gap-1.5 font-bold', isSaved ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-slate-300 text-slate-800')}
            >
              {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              {isSaved ? 'Saved' : 'Save'}
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => setSharing(true)} className="gap-1.5 border-slate-300 font-bold text-slate-800">
            <Share2 className="h-4 w-4" /> Share
          </Button>
          {variant === 'panel' && (
            <Button variant="ghost" size="sm" asChild className="gap-1.5 font-bold text-slate-600">
              <Link href={path} target="_blank"><ExternalLink className="h-4 w-4" /> Full page</Link>
            </Button>
          )}
        </div>
      </header>

      {applyPanel}

      <div className={cn('space-y-6', variant === 'page' && 'rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7')}>
        <section aria-busy={loadingBody}>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">About the role</h3>
          {loadingBody ? (
            <div className="animate-pulse space-y-2.5" aria-label="Loading the description">
              {['w-full', 'w-11/12', 'w-4/5', 'w-full', 'w-2/3'].map((w, i) => (
                <div key={i} className={cn('h-3.5 rounded bg-slate-200', w)} />
              ))}
            </div>
          ) : (
            <Markdown source={job.description} />
          )}
        </section>

        {job.requirements && (
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Requirements</h3>
            <Markdown source={job.requirements} />
          </section>
        )}

        {job.requiredSkills.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Skills they are looking for</h3>
            <div className="flex flex-wrap gap-2">
              {job.requiredSkills.map((s) => {
                const have = view.matchedSkills.includes(s);
                return (
                  <span
                    key={s}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium',
                      have ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-700',
                    )}
                  >
                    {have && <CheckCircle2 className="h-3.5 w-3.5" />}
                    {s}
                  </span>
                );
              })}
            </div>
            {view.matchScore !== null && !isOwner && view.missingSkills.length > 0 && view.matchedSkills.length > 0 && (
              <p className="mt-2 text-xs text-slate-500">
                Green are skills already on your profile. You can still apply without the rest.
              </p>
            )}
          </section>
        )}

        {job.benefits && (
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Benefits</h3>
            <Markdown source={job.benefits} />
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <CompanyMark name={job.companyName} logoUrl={job.logoUrl} size={40} />
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 font-bold text-slate-900">
                {job.companyName}
                {job.businessVerified && <VerifiedChip />}
              </p>
              {job.industry && <p className="text-xs text-slate-500">{job.industry}</p>}
              {job.companyDescription && (
                <p className="mt-1.5 line-clamp-4 text-sm leading-relaxed text-slate-700">{job.companyDescription}</p>
              )}
              <Link href={`/business/${job.businessId}`} className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-slate-900 underline underline-offset-2">
                View business profile <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>
      </div>

      {applyOpened && (
        <QuickApplyModal
          job={job}
          open={applyMode !== null}
          mode={applyMode ?? lastApplyMode}
          onOpenChange={(open) => { if (!open) setApplyMode(null); }}
          onApplied={applied}
        />
      )}
      {shareOpened && <ShareJobModal job={job} open={sharing} onOpenChange={setSharing} />}
    </article>
  );
}
