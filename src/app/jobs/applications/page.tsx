'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, ShieldCheck, Briefcase, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { SubpageNav } from '@/components/layout/subpage-nav';
import { APPLICATION_STATUS_LABELS, type ApplicationStatus } from '@/lib/talent';

interface Application {
  id: string;
  status: ApplicationStatus;
  matchScore: number | null;
  createdAt: string;
  statusNote: string | null;
  statusChangedAt: string | null;
  job: { id: string; title: string; location: string | null; status: string };
  company: { name: string; verified: boolean };
}

const STATUS_STYLE: Record<string, string> = {
  applied: 'bg-blue-50 text-blue-700 border-blue-200',
  shortlisted: 'bg-amber-50 text-amber-700 border-amber-200',
  interview: 'bg-purple-50 text-purple-700 border-purple-200',
  hired: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-gray-100 text-gray-600 border-gray-200',
  withdrawn: 'bg-gray-100 text-gray-500 border-gray-200',
};

export default function MyApplicationsPage() {
  const { toast } = useToast();
  const [apps, setApps] = useState<Application[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/talent/applications', { cache: 'no-store' });
      return res.ok ? await res.json() : null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const data = await load();
      if (!active) return;
      if (data?.applications) setApps(data.applications);
      setLoaded(true);
    })();
    return () => { active = false; };
  }, [load]);

  const withdraw = async (id: string) => {
    if (!window.confirm('Withdraw this application? The employer will see it as withdrawn.')) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'withdrawn' }),
      });
      const data = await res.json();
      if (res.ok) {
        setApps((list) => list.map((a) => (a.id === id ? { ...a, status: 'withdrawn' } : a)));
        toast({ title: 'Withdrawn', description: data.message });
      } else {
        toast({ title: 'Could not withdraw', description: data.error, variant: 'destructive' });
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SubpageNav title="My applications" />

      <div className="mx-auto max-w-3xl px-4 py-8">
        {!loaded ? (
          <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white p-12 text-gray-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : apps.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
            <Briefcase className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-3 font-bold text-gray-900">You have not applied to anything yet</p>
            <Button className="mt-4 bg-yellow-400 font-bold text-gray-900 hover:bg-yellow-300" asChild><Link href="/jobs">
                Browse jobs
              </Link></Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {apps.map((a) => (
              <li key={a.id} className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/jobs/${a.job.id}`} className="font-bold text-gray-900 hover:underline">
                      {a.job.title}
                    </Link>
                    <p className="mt-0.5 flex items-center gap-2 text-sm text-gray-600">
                      {a.company.name}
                      {a.company.verified && <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold ${STATUS_STYLE[a.status] ?? STATUS_STYLE.applied}`}>
                    {APPLICATION_STATUS_LABELS[a.status] ?? a.status}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                  <span>Applied {new Date(a.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  {a.matchScore !== null && (
                    <span className="inline-flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> {a.matchScore}% match when you applied
                    </span>
                  )}
                  {a.job.status !== 'open' && <span>This listing has since closed</span>}
                </div>

                {a.statusNote && (
                  <p className="mt-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">{a.statusNote}</p>
                )}

                {/* Only while something can still come of it. */}
                {!['withdrawn', 'rejected', 'hired'].includes(a.status) && (
                  <button
                    type="button"
                    disabled={busyId === a.id}
                    onClick={() => withdraw(a.id)}
                    className="mt-3 text-xs font-semibold text-gray-500 hover:text-red-600"
                  >
                    Withdraw application
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
