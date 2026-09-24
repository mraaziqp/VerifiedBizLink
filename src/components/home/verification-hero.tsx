'use client';

import Link from 'next/link';
import { CheckCircle2, ShieldCheck, Award, TrendingUp, Lock, QrCode, ArrowRight, Sparkles } from 'lucide-react';

export function VerificationHero() {
  return (
    <div className="mb-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 border border-amber-500/30 p-6 md:p-8 relative overflow-hidden shadow-xl text-white group">
      {/* Ambient background glows */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Banner content */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0 animate-float">
            <div className="absolute inset-0 bg-amber-400 rounded-2xl blur-md opacity-40 group-hover:opacity-60 transition-opacity" />
            <div className="relative bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 rounded-2xl p-3 shadow-lg">
              <ShieldCheck className="h-8 w-8 text-slate-950" />
            </div>
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              Official Verification Registry
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Trade With Certified Confidence
            </h2>
            <p className="text-slate-300 text-sm md:text-base mt-1 max-w-xl leading-relaxed">
              Every badge is verified against official CIPC company registry and SARS tax records. Cryptographically sealed with live anti-tamper checking.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            href="/verify"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2.5 text-xs font-black text-slate-950 hover:from-amber-300 hover:to-amber-400 transition-all duration-200 shadow-md shadow-amber-400/20 active:scale-98"
          >
            <QrCode className="h-4 w-4" />
            <span>Verify A Certificate</span>
            <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition-all shadow-xs"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Get Verified Badge</span>
          </Link>
        </div>
      </div>

      {/* Grid of 4 Trust Feature Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 relative z-10">
        <div className="flex flex-col items-center justify-center text-center gap-2 p-4 bg-slate-950/60 rounded-xl border border-slate-800/80 hover:border-amber-400/40 hover:bg-slate-900/80 transition-all duration-300 group/card">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover/card:scale-110 transition-transform">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">CIPC &amp; SARS</p>
            <p className="text-[11px] text-slate-400">Official Records</p>
          </div>
        </div>

        <Link
          href="/verify"
          className="flex flex-col items-center justify-center text-center gap-2 p-4 bg-slate-950/60 rounded-xl border border-slate-800/80 hover:border-amber-400/40 hover:bg-slate-900/80 transition-all duration-300 group/card"
        >
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover/card:scale-110 transition-transform">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">QR Vector Certs</p>
            <p className="text-[11px] text-slate-400">Cryptographically Signed</p>
          </div>
        </Link>

        <div className="flex flex-col items-center justify-center text-center gap-2 p-4 bg-slate-950/60 rounded-xl border border-slate-800/80 hover:border-amber-400/40 hover:bg-slate-900/80 transition-all duration-300 group/card">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover/card:scale-110 transition-transform">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">Trust Scores</p>
            <p className="text-[11px] text-slate-400">Algorithmic Vetting</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center text-center gap-2 p-4 bg-slate-950/60 rounded-xl border border-slate-800/80 hover:border-amber-400/40 hover:bg-slate-900/80 transition-all duration-300 group/card">
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover/card:scale-110 transition-transform">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">Bank-Grade</p>
            <p className="text-[11px] text-slate-400">Fraud Prevention</p>
          </div>
        </div>
      </div>
    </div>
  );
}
