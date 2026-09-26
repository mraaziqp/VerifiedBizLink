'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2, ArrowLeft, Sparkles, Mail, MapPin, FileText, Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  APPLICATION_STATUSES, APPLICATION_STATUS_LABELS, type ApplicationStatus,
} from '@/lib/talent';

interface Applicant {
  id: string;
  status: ApplicationStatus;
  coverNote: string | null;
  matchScore: number | null;
  createdAt: string;
  headline: string | null;
  skills: string[];
  cvUrl: string | null;
  applicant: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
    location: string | null;
    summary: string | null;
  };
}

/** The stages an employer actually moves someone through, in order. */
const PIPELINE: ApplicationStatus[] = ['applied', 'shortlisted', 'interview', 'hired', 'rejected'];

const COLUMN_TONE: Record<string, string> = {
  applied: 'border-blue-200 bg-blue-50/50',
  shortlisted: 'border-amber-200 bg-amber-50/50',
  interview: 'border-purple-200 bg-purple-50/50',
  hired: 'border-emerald-200 bg-emerald-50/50',
  rejected: 'border-gray-200 bg-gray-50',
};

export default function JobApplicantsPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const [job, setJob] = useState<{ title: string } | null>(null);
  const [apps, setApps] = useState<Applicant[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${id}/applications`, { cache: 'no-store' });
      if (res.status === 403) return { forbidden: true };
      return res.ok ? await res.json() : null;
    } catch {
      return null;
    }
  }, [id]);

  useEffect(() => {
    let active = true;
    (async () => {
      const data = await load();
      if (!active) return;
      if (data?.forbidden) setForbidden(true);
      else if (data) {
        setJob(data.job ?? null);
        setApps(data.applications ?? []);
      }
      setLoaded(true);
    })();
    return () => { active = false; };
  }, [load]);

  const move = async (appId: string, status: ApplicationStatus) => {
    setBusyId(appId);
    try {
      const res = await fetch(`/api/applications/${appId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok) {
        setApps((list) => list.map((a) => (a.id === appId ? { ...a, status } : a)));
        toast({ title: 'Moved', description: data.message });
      } else {
        toast({ title: 'Could not update', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Could not update the application', variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-7 w-7 animate-spin text-yellow-500" />
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-4 text-center">
        <p className="text-lg font-bold text-gray-900">This is not your listing</p>
        <Button variant="outline" className="gap-2 border-gray-300" asChild><Link href="/business/jobs">
            <ArrowLeft className="h-4 w-4" /> Your jobs
          </Link></Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-[1400px] px-4 py-8">
        <Link href="/business/jobs" className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" /> Your jobs
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-gray-900">{job?.title ?? 'Applicants'}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
            <Users className="h-4 w-4 text-gray-400" />
            {apps.length} applicant{apps.length === 1 ? '' : 's'} · sorted by how well they match
          </p>
        </div>

        {apps.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
            <Users className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-3 font-bold text-gray-900">No applications yet</p>
            <p className="mt-1 text-sm text-gray-500">
              Candidates whose skills match this role will see it on the jobs board.
            </p>
          </div>
        ) : (
          /* Columns scroll sideways on a phone rather than squeezing five
             stages into a width that makes each card unreadable. */
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {PIPELINE.map((stage) => {
              const inStage = apps.filter((a) => a.status === stage);
              return (
                <div key={stage} className={`rounded-2xl border ${COLUMN_TONE[stage]} p-3`}>
                  <div className="mb-3 flex items-center justify-between px-1">
                    <h2 className="text-sm font-bold text-gray-900">
                      {APPLICATION_STATUS_LABELS[stage]}
                    </h2>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-gray-600">
                      {inStage.length}
                    </span>
                  </div>

                  <ul className="space-y-2.5">
                    {inStage.map((a) => (
                      <li key={a.id} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-bold text-gray-900">{a.applicant.fullName}</p>
                            {a.headline && (
                              <p className="mt-0.5 line-clamp-2 text-xs text-gray-600">{a.headline}</p>
                            )}
                          </div>
                          {a.matchScore !== null && (
                            <span className={`shrink-0 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                              a.matchScore >= 75 ? 'bg-emerald-100 text-emerald-700'
                                : a.matchScore >= 40 ? 'bg-amber-100 text-amber-700'
                                  : 'bg-gray-100 text-gray-600'
                            }`}>
                              <Sparkles className="h-2.5 w-2.5" />{a.matchScore}%
                            </span>
                          )}
                        </div>

                        {a.applicant.location && (
                          <p className="mt-1.5 flex items-center gap-1 text-[11px] text-gray-500">
                            <MapPin className="h-3 w-3" /> {a.applicant.location}
                          </p>
                        )}

                        {a.skills.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {a.skills.slice(0, 4).map((s) => (
                              <span key={s} className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-700">
                                {s}
                              </span>
                            ))}
                            {a.skills.length > 4 && (
                              <span className="text-[10px] text-gray-400">+{a.skills.length - 4}</span>
                            )}
                          </div>
                        )}

                        {a.coverNote && (
                          <p className="mt-2 line-clamp-3 rounded bg-gray-50 p-2 text-[11px] text-gray-700">
                            {a.coverNote}
                          </p>
                        )}

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                          <a href={`mailto:${a.applicant.email}`} className="inline-flex items-center gap-1 text-yellow-700 hover:underline">
                            <Mail className="h-3 w-3" /> Email
                          </a>
                          {a.cvUrl && (
                            <a href={a.cvUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-yellow-700 hover:underline">
                              <FileText className="h-3 w-3" /> CV
                            </a>
                          )}
                        </div>

                        {/* Buttons rather than drag and drop: this works on a
                            phone, with a keyboard, and with a screen reader.
                            Dragging comes in the next slice. */}
                        <div className="mt-2.5 flex flex-wrap gap-1 border-t border-gray-100 pt-2">
                          {APPLICATION_STATUSES
                            .filter((s) => s !== a.status && s !== 'withdrawn')
                            .map((s) => (
                              <button
                                key={s}
                                type="button"
                                disabled={busyId === a.id}
                                onClick={() => move(a.id, s)}
                                className="rounded border border-gray-200 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 hover:border-yellow-400 hover:text-gray-900 disabled:opacity-50"
                              >
                                {s === 'rejected' ? 'Decline' : APPLICATION_STATUS_LABELS[s]}
                              </button>
                            ))}
                        </div>
                      </li>
                    ))}

                    {inStage.length === 0 && (
                      <li className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">
                        Nobody here
                      </li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
