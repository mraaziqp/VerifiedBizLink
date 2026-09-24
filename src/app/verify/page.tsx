'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, Search, QrCode, Sparkles, ArrowRight, ShieldAlert, CheckCircle2, Lock } from 'lucide-react';
import { VBLLogo } from '@/components/ui/vbl-logo';

/**
 * Certificate verification portal with high-end security visuals & animations.
 */
export default function VerifyLookupPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [isHovering, setIsHovering] = useState(false);

  const go = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = code.trim().toUpperCase().replace(/\s+/g, '');
    if (cleaned) router.push(`/verify/${encodeURIComponent(cleaned)}`);
  };

  const handleFormat = (val: string) => {
    const raw = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (raw.length <= 3) {
      setCode(raw);
    } else if (raw.length <= 7) {
      setCode(`${raw.slice(0, 3)}-${raw.slice(3)}`);
    } else if (raw.length <= 11) {
      setCode(`${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7)}`);
    } else {
      setCode(`${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7, 11)}-${raw.slice(11, 15)}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between px-4 py-8 sm:py-12 relative overflow-hidden">
      {/* Background ambient lighting & floating orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[36rem] h-[36rem] bg-amber-500/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="mx-auto max-w-xl w-full relative z-10">
        {/* Brand Header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <Link href="/" className="inline-block transition-transform hover:scale-105 duration-200">
            <VBLLogo variant="full" size="md" iconSize={44} theme="light" />
          </Link>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-xs font-bold text-amber-400">
            <Sparkles className="h-3 w-3" />
            Official Public Verification Gateway
          </div>
        </div>

        {/* Main Verification Card */}
        <div 
          className="rounded-3xl border border-amber-400/30 bg-slate-900/90 backdrop-blur-xl p-6 sm:p-9 shadow-2xl shadow-black/80 relative group overflow-hidden transition-all duration-300 hover:border-amber-400/50"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          {/* Animated Scanning Beam effect */}
          <div 
            className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent transition-opacity duration-500 ${
              isHovering ? 'opacity-100 animate-shimmer' : 'opacity-40'
            }`} 
          />

          <div className="text-center">
            {/* Glowing Shield Icon */}
            <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 shadow-lg shadow-amber-400/20 animate-float">
              <ShieldCheck className="h-9 w-9 text-slate-950" />
            </div>

            <h1 className="mt-5 text-2xl sm:text-3xl font-black text-white tracking-tight">
              Verify a Business Certificate
            </h1>
            <p className="mt-2 text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
              Every genuine VerifiedBizLink certificate is backed by an immutable cryptographic signature.
              Check live CIPC registration &amp; SARS compliance status in real-time.
            </p>
          </div>

          <form onSubmit={go} className="mt-8 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="serial" className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Certificate Number
                </label>
                <span className="text-[11px] text-slate-400 font-mono">Format: VBL-YYYY-XXXX-XXXX</span>
              </div>
              <div className="relative">
                <input
                  id="serial"
                  value={code}
                  onChange={(e) => handleFormat(e.target.value)}
                  placeholder="VBL-2026-XXXX-XXXX"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  className="h-14 w-full rounded-2xl border-2 border-slate-700 bg-slate-950/80 px-4 text-center font-mono text-lg sm:text-xl font-bold uppercase tracking-wider text-amber-300 placeholder:text-slate-600 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 transition-all shadow-inner"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!code.trim()}
              className="group relative flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 py-3.5 font-black text-slate-950 transition-all duration-200 hover:from-amber-300 hover:to-amber-400 hover:shadow-lg hover:shadow-amber-400/25 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Search className="h-5 w-5 transition-transform group-hover:scale-110" />
              <span>Verify Authenticity</span>
              <ArrowRight className="h-4 w-4 ml-1 opacity-70 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          {/* QR code information box */}
          <div className="mt-7 flex items-start gap-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 p-4">
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-amber-400 shrink-0">
              <QrCode className="h-5 w-5" />
            </div>
            <div className="text-xs text-slate-300 space-y-1">
              <p className="font-bold text-white flex items-center gap-1.5">
                Instant QR Verification
              </p>
              <p className="text-slate-400 leading-relaxed">
                Scan the QR code on any printed or digital VerifiedBizLink certificate with any smartphone camera.
                No app installation or account required.
              </p>
            </div>
          </div>

          {/* Security Assurance Badges */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center text-[10px] text-slate-400">
            <div className="flex flex-col items-center gap-1">
              <Lock className="h-3.5 w-3.5 text-amber-400" />
              <span>HMAC-SHA256 Signed</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>CIPC &amp; SARS Verified</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
              <span>Anti-Tamper Live Sync</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="mt-8 text-center text-xs text-slate-400">
          Suspect an altered or counterfeit certificate?{' '}
          <Link href="/contact" className="font-bold text-amber-400 hover:text-amber-300 underline underline-offset-4">
            Report fraud to compliance
          </Link>
          .
        </p>
      </div>

      <div className="text-center text-[11px] text-slate-400 relative z-10 mt-6">
        VerifiedBizLink &copy; {new Date().getFullYear()} &bull; Official South African Business Verification Registry
      </div>
    </div>
  );
}
