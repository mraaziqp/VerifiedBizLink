'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, Search, QrCode } from 'lucide-react';

/**
 * Type a certificate number in by hand.
 *
 * The QR code covers most cases, but a certificate can arrive as a photocopy,
 * a fax, a photograph taken at an angle, or a number read out over the phone.
 * Anyone holding only the number still has to be able to check it.
 */
export default function VerifyLookupPage() {
  const router = useRouter();
  const [code, setCode] = useState('');

  const go = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = code.trim().toUpperCase().replace(/\s+/g, '');
    if (cleaned) router.push(`/verify/${encodeURIComponent(cleaned)}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-12">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 text-center">
          <span className="text-xl font-black tracking-tight text-white">
            Verified<span className="text-yellow-400">BizLink</span>
          </span>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-2xl sm:p-9">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-400">
              <ShieldCheck className="h-7 w-7 text-slate-950" />
            </div>
            <h1 className="mt-4 text-2xl font-extrabold text-gray-900">Check a certificate</h1>
            <p className="mt-2 text-sm text-gray-600">
              Enter the certificate number printed on the document. We will tell you
              whether we issued it and whether the business is verified right now.
            </p>
          </div>

          <form onSubmit={go} className="mt-7">
            <label htmlFor="serial" className="text-sm font-bold text-gray-700">
              Certificate number
            </label>
            <input
              id="serial"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="VBL-2026-XXXX-XXXX"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="mt-2 h-14 w-full rounded-xl border-2 border-gray-200 bg-white px-4 text-center font-mono text-lg font-bold uppercase tracking-wider text-gray-900 outline-none focus:border-yellow-400"
            />
            <button
              type="submit"
              disabled={!code.trim()}
              className="mt-4 flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 py-3.5 font-bold text-gray-900 transition hover:bg-yellow-300 disabled:opacity-50"
            >
              <Search className="h-5 w-5" /> Check this certificate
            </button>
          </form>

          <div className="mt-7 flex items-start gap-3 rounded-xl bg-gray-50 p-4">
            <QrCode className="mt-0.5 h-5 w-5 shrink-0 text-gray-500" />
            <p className="text-xs text-gray-600">
              Every VerifiedBizLink certificate carries a QR code. Scanning it with any
              phone camera opens this same check — you do not need an account, and you
              do not need this page.
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Handed a certificate that fails this check?{' '}
          <Link href="/contact" className="font-semibold text-yellow-400 hover:underline">
            Tell us about it
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
