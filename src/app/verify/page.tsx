'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck, Search, QrCode, Sparkles, ArrowRight, ShieldAlert,
  CheckCircle2, Lock, Loader2
} from 'lucide-react';
import { VBLLogo } from '@/components/ui/vbl-logo';
import { extractSerial, formatSerialInput } from '@/lib/certificate-serial';

/**
 * Certificate Verification Portal
 * Light Theme Edition: High-contrast, elegant slate-50 background,
 * clean typography, accessible cards, and zero low-contrast text.
 */
export default function VerifyLookupPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const go = (e: React.FormEvent) => {
    e.preventDefault();
    const serial = extractSerial(code);
    if (!serial) {
      setError('That is not a complete certificate number. It looks like VBL-2026-XXXX-XXXX.');
      return;
    }
    setError(null);
    setSubmitting(true);
    router.push(`/verify/${encodeURIComponent(serial)}`);
  };

  const handleChange = (val: string) => {
    setError(null);
    setCode(formatSerialInput(val));
  };

  // A pasted QR link or a serial copied with surrounding text would otherwise
  // be flattened by the input mask into garbage.
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const serial = extractSerial(e.clipboardData.getData('text'));
    if (serial) {
      e.preventDefault();
      setError(null);
      setCode(serial);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between px-4 py-8 sm:py-12 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-1/4 w-[36rem] h-[36rem] bg-slate-200/50 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-emerald-100/40 rounded-full blur-3xl pointer-events-none" />

      <div className="mx-auto max-w-xl w-full relative z-10">
        {/* Brand Header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <Link href="/" className="inline-block transition-transform hover:scale-105 duration-200">
            <VBLLogo variant="full" size="md" iconSize={44} theme="dark" />
          </Link>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200/80 border border-slate-300 text-xs font-bold text-slate-800">
            <Sparkles className="h-3 w-3 text-amber-700" />
            Official Public Verification Gateway
          </div>
        </div>

        {/* Main Verification Card */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-9 shadow-xl relative overflow-hidden">
          {/* Top highlight bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-slate-900 via-amber-500 to-slate-900" />

          <div className="text-center">
            {/* Shield Icon */}
            <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-md animate-float">
              <ShieldCheck className="h-9 w-9 text-emerald-400" />
            </div>

            <h1 className="mt-5 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Verify a Business Certificate
            </h1>
            <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              Every genuine VerifiedBizLink certificate is backed by an immutable cryptographic signature.
              Check live CIPC registration &amp; SARS compliance status in real-time.
            </p>
          </div>

          <form onSubmit={go} className="mt-8 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="serial" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Certificate Serial Number
                </label>
                <span className="hidden sm:inline text-[11px] text-slate-500 font-mono">Format: VBL-YYYY-XXXX-XXXX</span>
              </div>
              <div className="relative">
                <input
                  id="serial"
                  value={code}
                  onChange={(e) => handleChange(e.target.value)}
                  onPaste={handlePaste}
                  inputMode="text"
                  aria-invalid={!!error}
                  aria-describedby={error ? 'serial-error' : undefined}
                  placeholder="VBL-2026-XXXX-XXXX"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  className="h-14 w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 text-center font-mono text-lg sm:text-xl font-bold uppercase tracking-wider text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner"
                />
              </div>
              {error && (
                <p id="serial-error" role="alert" className="mt-2 text-xs font-semibold text-rose-700">
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={!code.trim() || submitting}
              className="group relative flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3.5 font-bold text-white transition-all duration-200 hover:bg-slate-800 hover:shadow-lg active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Search className="h-5 w-5 transition-transform group-hover:scale-110" />
              )}
              <span>{submitting ? 'Checking registry…' : 'Verify Authenticity'}</span>
              <ArrowRight className="h-4 w-4 ml-1 opacity-70 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          {/* QR code info box */}
          <div className="mt-7 flex items-start gap-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 p-4">
            <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 shrink-0 shadow-2xs">
              <QrCode className="h-5 w-5" />
            </div>
            <div className="text-xs text-slate-600 space-y-1">
              <p className="font-bold text-slate-900">
                Instant Mobile QR Verification
              </p>
              <p className="leading-relaxed">
                Scan the QR code on any printed or digital VerifiedBizLink certificate with your smartphone camera.
                Direct anti-tamper lookup without installing any apps.
              </p>
            </div>
          </div>

          {/* Security Assurance Badges */}
          <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-[10px] text-slate-500 font-semibold">
            <div className="flex flex-col items-center gap-1">
              <Lock className="h-4 w-4 text-slate-700" />
              <span>HMAC-SHA256 Signed</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>CIPC &amp; SARS Verified</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <ShieldAlert className="h-4 w-4 text-slate-700" />
              <span>Anti-Tamper Sync</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="mt-8 text-center text-xs text-slate-500">
          Suspect an altered or counterfeit certificate?{' '}
          <Link href="/contact" className="font-bold text-slate-900 hover:underline underline-offset-4">
            Report fraud to compliance
          </Link>
          .
        </p>
      </div>

      <div className="text-center text-[11px] text-slate-500 relative z-10 mt-6">
        VerifiedBizLink &copy; {new Date().getFullYear()} &bull; Official South African Business Verification Registry
      </div>
    </div>
  );
}
