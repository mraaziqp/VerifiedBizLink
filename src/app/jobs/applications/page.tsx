'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Briefcase, Check, Loader2, MessageSquare, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { SubpageNav } from '@/components/layout/subpage-nav';
import { ApplicationStatusPill } from '@/components/jobs/job-badges';
import { FilterPill } from '@/components/jobs/filter-pill';
import { CANDIDATE_STATUS_LABELS, formatDay, type ApplicationStatus } from '@/lib/talent';
import { cn } from '@/lib/utils';

interface Application {
  id: string;
  status: ApplicationStatus;
  matchScore: number | null;
  createdAt: string;
  statusNote: string | null;
  statusChangedAt: string | null;
  job: { id: string; slug: string; title: string; location: string | null; status: string };
  company: { name: string; verified: boolean };
  chat: { withUserId: string; unread: number };
}

/** The path an application normally takes, as the candidate reads it. */
const STEPS: ApplicationStatus[] = ['applied', 'reviewing', 'shortlisted', 'interview', 'hired'];
const OPEN: ApplicationStatus[] = ['applied', 'reviewing', 'shortlisted', 'interview'];

type Tab = 'active' | 'closed' | 'all';

/**
 * Where each application stands, what the employer last said, and the
 * conversation to reply in — so "did they even see it?" has an answer.
 */
export default function MyApplicationsPage() {
  const { toast } = useToast();
  const [apps, setApps] = useState<Application[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('active');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/talent/applications', { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setApps(Array.isArray(data.applications) ? data.applications : []);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const counts = useMemo(() => ({
    active: apps.filter((a) => OPEN.includes(a.status)).length,
    closed: apps.filter((a) => !OPEN.includes(a.status)).length,
    all: apps.length,
    interviews: apps.filter((a) => a.status === 'interview').length,
    offers: apps.filter((a) => a.status === 'hired').length,
  }), [apps]);

  // Nothing in progress: show everything rather than an empty "active" tab.
  useEffect(() => {
    if (state === 'ready' && counts.active === 0 && counts.all > 0) setTab('all');
    // Only once the list first arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const visible = tab === 'all' ? apps : apps.filter((a) => OPEN.includes(a.status) === (tab === 'active'));

  const withdraw = async (app: Application) => {
    if (!window.confirm(`Withdraw your application for ${app.job.title}? ${app.company.name} will see that you withdrew, and this cannot be undone.`)) return;
    setBusyId(app.id);
    try {
      const res = await fetch(`/api/applications/${app.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'withdrawn' }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setApps((current) => current.map((a) => (a.id === app.id ? { ...a, status: 'withdrawn' } : a)));
        toast({ title: 'Withdrawn', description: data.message });
      } else {
        toast({ title: 'Could not withdraw', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Could not reach the server', description: 'Your application was not changed.', variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <SubpageNav title="My applications" />

      <div className="mx-auto max-w-3xl px-4 py-8">
        {state === 'loading' ? (
          <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : state === 'error' ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <p className="font-bold text-red-900">Your applications could not be loaded</p>
            <p className="mt-1 text-sm text-red-800">Nothing has been lost. Check your connection and try again.</p>
            <Button variant="outline" onClick={() => { setState('loading'); void load(); }} className="mt-4 border-red-300 font-bold text-red-900">Try again</Button>
          </div>
        ) : apps.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <Briefcase className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-bold text-slate-900">You have not applied to anything yet</p>
            <p className="mt-1 text-sm text-slate-500">Roles you apply to show up here with their progress.</p>
            <Button className="mt-4 bg-yellow-400 font-bold text-slate-900 hover:bg-yellow-300" asChild>
              <Link href="/jobs">Browse jobs</Link>
            </Button>
          </div>
        ) : (
          <>
            <dl className="mb-5 grid grid-cols-3 gap-3">
              {[
                { label: 'In progress', value: counts.active },
                { label: 'Interviews', value: counts.interviews },
                { label: 'Offers', value: counts.offers },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{stat.label}</dt>
                  <dd className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900">{stat.value}</dd>
                </div>
              ))}
            </dl>

            <div className="mb-4 flex gap-1.5">
              {([['active', 'In progress'], ['closed', 'Finished'], ['all', 'All']] as const).map(([id, label]) => (
                <FilterPill key={id} active={tab === id} onClick={() => setTab(id)} count={counts[id]}>{label}</FilterPill>
              ))}
            </div>

            {visible.length === 0 ? (
              <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Nothing here.</p>
            ) : (
              <ul className="space-y-3">
                {visible.map((a) => {
                  const stepIndex = STEPS.indexOf(a.status);
                  const off = a.status === 'rejected' || a.status === 'withdrawn';
                  return (
                    <li key={a.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link href={`/jobs/${a.job.slug}`} className="font-bold text-slate-900 hover:underline">{a.job.title}</Link>
                          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-600">
                            {a.company.name}
                            {a.company.verified && <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-label="Verified business" />}
                            {a.job.location ? ` · ${a.job.location}` : ''}
                          </p>
                        </div>
                        <ApplicationStatusPill status={a.status} labels={CANDIDATE_STATUS_LABELS} className="shrink-0" />
                      </div>

                      {/* Progress along the usual path. A declined or withdrawn
                          application has left it, so no step is highlighted. */}
                      {!off && (
                        <ol className="mt-4 flex items-center" aria-label="Application progress">
                          {STEPS.map((step, i) => {
                            const done = i < stepIndex;
                            const current = i === stepIndex;
                            return (
                              <li key={step} className={cn('flex items-center', i < STEPS.length - 1 && 'flex-1')}>
                                <span className="flex flex-col items-center gap-1">
                                  <span className={cn(
                                    'flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-black',
                                    done ? 'border-emerald-600 bg-emerald-600 text-white'
                                      : current ? 'border-slate-900 bg-slate-900 text-amber-400'
                                        : 'border-slate-200 bg-white text-slate-300',
                                  )}>
                                    {done ? <Check className="h-3 w-3" /> : i + 1}
                                  </span>
                                  <span className={cn('hidden text-[10px] font-bold sm:block', current ? 'text-slate-900' : done ? 'text-emerald-700' : 'text-slate-400')}>
                                    {CANDIDATE_STATUS_LABELS[step]}
                                  </span>
                                </span>
                                {i < STEPS.length - 1 && <span className={cn('mx-1 h-0.5 flex-1 rounded sm:mb-4', done ? 'bg-emerald-600' : 'bg-slate-200')} />}
                              </li>
                            );
                          })}
                        </ol>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span>Applied {formatDay(a.createdAt)}</span>
                        {a.statusChangedAt && a.status !== 'applied' && <span>Updated {formatDay(a.statusChangedAt)}</span>}
                        {a.matchScore !== null && (
                          <span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3" /> {a.matchScore}% match when you applied</span>
                        )}
                        {a.job.status !== 'open' && <span>This listing has since closed</span>}
                      </div>

                      {a.statusNote && (
                        <div className="mt-3 rounded-xl border-l-4 border-amber-400 bg-amber-50/60 p-3">
                          <p className="text-[11px] font-bold uppercase tracking-wide text-amber-800">{a.company.name} wrote</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{a.statusNote}</p>
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                        <Button asChild size="sm" variant="outline" className="gap-1.5 border-slate-300 font-bold text-slate-800">
                          <Link href={`/dashboard/messages?with=${a.chat.withUserId}`}>
                            <MessageSquare className="h-4 w-4" />
                            {a.chat.unread > 0 ? 'Read reply' : 'Message employer'}
                            {a.chat.unread > 0 && (
                              <span className="rounded-full bg-amber-400 px-1.5 text-[11px] font-black text-slate-900">{a.chat.unread}</span>
                            )}
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="ghost" className="font-bold text-slate-600">
                          <Link href={`/jobs/${a.job.slug}`}>View role</Link>
                        </Button>
                        {/* Only while something can still come of it. */}
                        {OPEN.includes(a.status) && (
                          <button
                            type="button"
                            disabled={busyId === a.id}
                            onClick={() => void withdraw(a)}
                            className="ml-auto text-xs font-semibold text-slate-500 hover:text-red-600 disabled:opacity-50"
                          >
                            {busyId === a.id ? 'Withdrawing…' : 'Withdraw application'}
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
