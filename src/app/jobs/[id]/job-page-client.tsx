'use client';

import Link from 'next/link';
import { ArrowLeft, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VBLLogo } from '@/components/ui/vbl-logo';
import { JobDetailView } from '@/components/jobs/job-detail-view';
import { jobPath } from '@/lib/talent';
import type { JobView } from '@/lib/jobs-server';

/**
 * The public job page around the shared detail view. Its header works for
 * someone with no account — the usual in-app header leads to pages that
 * would only bounce a visitor to the sign-in screen.
 */
export function JobPageClient({ view }: { view: JobView }) {
  const signedIn = view.viewer.signedIn;
  const from = encodeURIComponent(jobPath(view.job));

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="safe-area-pt sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4">
          <Link href={signedIn ? '/' : '/explore'} aria-label="VerifiedBizLink home" className="flex items-center gap-2 hover:opacity-80">
            <VBLLogo variant="icon" size="sm" iconSize={32} theme="dark" />
            <span className="text-base font-extrabold tracking-tight text-slate-900">
              Verified<span className="font-black text-amber-700">BizLink</span>
            </span>
          </Link>

          {signedIn ? (
            <Button asChild variant="outline" size="sm" className="gap-1.5 rounded-xl border-slate-300 font-bold text-slate-800">
              <Link href="/jobs"><ArrowLeft className="h-4 w-4" /> All jobs</Link>
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="rounded-xl font-bold text-slate-700">
                <Link href={`/login?from=${from}`}>Sign in</Link>
              </Button>
              <Button asChild size="sm" className="rounded-xl bg-yellow-400 font-bold text-slate-900 hover:bg-yellow-300">
                <Link href={`/signup?from=${from}`}>Join free</Link>
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
        <JobDetailView view={view} variant="page" />

        <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-5 text-center">
          <Briefcase className="h-6 w-6 text-slate-400" />
          <p className="font-bold text-slate-900">More roles at verified businesses</p>
          <p className="max-w-md text-sm text-slate-600">
            Every employer on VerifiedBizLink has had its company registration checked.
          </p>
          <Button asChild variant="outline" className="mt-1 border-slate-300 font-bold text-slate-800">
            <Link href="/jobs">Browse all jobs</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
