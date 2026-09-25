'use client';

import Link from 'next/link';
import { CheckCircle2, ShieldCheck, Award, TrendingUp, Lock, QrCode, ArrowRight, Sparkles } from 'lucide-react';

const FEATURES = [
  { href: '/verify', icon: CheckCircle2, title: 'CIPC & SARS', sub: 'Official records', tone: 'text-emerald-600 bg-emerald-50 border-emerald-200/80' },
  { href: '/verify', icon: Award, title: 'QR Certificates', sub: 'Cryptographically signed', tone: 'text-amber-700 bg-amber-50 border-amber-200/80' },
  { href: '/vetting', icon: TrendingUp, title: 'Trust Scores', sub: 'Algorithmic vetting', tone: 'text-sky-600 bg-sky-50 border-sky-200/80' },
  { href: '/verify', icon: Lock, title: 'Bank-Grade', sub: 'Fraud prevention', tone: 'text-violet-600 bg-violet-50 border-violet-200/80' },
];

/**
 * Home feed banner for the certificate registry.
 *
 * Always stacked, never side by side: it lives in the middle feed column,
 * which is at most ~600px wide even on a large monitor. Switching to a row
 * layout on a viewport breakpoint (lg:) put the buttons beside the heading in
 * that narrow column and crushed the heading to one letter per line.
 */
export function VerificationHero() {
  return (
    <section
      aria-labelledby="verification-hero-heading"
      className="relative w-full overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/90 via-white to-white p-4 sm:p-6 shadow-sm"
    >
      <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-amber-200/30 blur-3xl" />

      <div className="relative flex items-start gap-3 sm:gap-4">
        <div className="shrink-0 rounded-xl bg-slate-900 p-2.5 shadow-sm">
          <ShieldCheck className="h-6 w-6 text-amber-400" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Official Verification Registry
          </span>
          <h2
            id="verification-hero-heading"
            className="mt-2 text-xl sm:text-2xl font-extrabold leading-tight tracking-tight text-slate-900 text-balance"
          >
            Trade with certified confidence
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
            Every badge is checked against the CIPC company registry and SARS tax records, then sealed with a signed, tamper-evident certificate.
          </p>
        </div>
      </div>

      <div className="relative mt-4 grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
        <Link
          href="/verify"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
        >
          <QrCode className="h-4 w-4 text-amber-400" aria-hidden />
          <span>Verify a certificate</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
        <Link
          href="/pricing"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-4 text-sm font-bold text-amber-900 shadow-xs transition-colors hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
        >
          <Sparkles className="h-4 w-4 text-amber-500" aria-hidden />
          <span>Get verified badge</span>
        </Link>
      </div>

      <ul className="relative mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 border-t border-amber-100 pt-4">
        {FEATURES.map(({ href, icon: Icon, title, sub, tone }) => (
          <li key={title}>
            <Link
              href={href}
              className="flex h-full items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white/80 p-2.5 transition-colors hover:border-amber-300 hover:bg-white sm:flex-col sm:items-center sm:text-center sm:gap-1.5"
            >
              <span className={`shrink-0 rounded-lg border p-1.5 ${tone}`}>
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-bold text-slate-900 leading-tight">{title}</span>
                <span className="block text-[11px] text-slate-500 leading-tight mt-0.5">{sub}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
