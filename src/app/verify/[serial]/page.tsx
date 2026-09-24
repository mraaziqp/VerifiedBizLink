import Link from 'next/link';
import type { Metadata } from 'next';
import { verifySerial, type VerificationOutcome } from '@/lib/certificates';

export const dynamic = 'force-dynamic';

/**
 * Where a certificate's QR code lands.
 *
 * Rendered on the server so the answer is in the HTML itself — someone
 * standing in a shop on a bad connection, or a search engine, or a screen
 * reader, gets the verdict without waiting for JavaScript. Nobody is asked to
 * log in: a certificate that only its owner can check is not a certificate.
 */

export async function generateMetadata({
  params,
}: { params: Promise<{ serial: string }> }): Promise<Metadata> {
  const { serial } = await params;
  const result = await verifySerial(serial).catch(() => null);
  const name = result?.companyName;
  return {
    title: result?.outcome === 'valid' && name
      ? `${name} is verified — VerifiedBizLink`
      : 'Certificate check — VerifiedBizLink',
    description: result?.message ?? 'Check a VerifiedBizLink certificate.',
    robots: { index: false },
  };
}

const STYLE: Record<VerificationOutcome, {
  border: string; glow: string; chip: string; iconBg: string; heading: string; badgeText: string;
}> = {
  valid: {
    border: 'border-emerald-500/40 bg-slate-900/90',
    glow: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
    chip: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    iconBg: 'bg-emerald-500 text-slate-950 shadow-emerald-500/30 ring-emerald-500/20',
    heading: 'Genuine Verified Certificate',
    badgeText: 'Cryptographically Verified & Active',
  },
  not_found: {
    border: 'border-red-500/40 bg-slate-900/90',
    glow: 'from-red-500/20 via-red-500/5 to-transparent',
    chip: 'bg-red-500/10 border-red-500/30 text-red-400',
    iconBg: 'bg-red-500 text-white shadow-red-500/30 ring-red-500/20',
    heading: 'Certificate Not Found',
    badgeText: 'Unrecognized Document',
  },
  tampered: {
    border: 'border-red-500/40 bg-slate-900/90',
    glow: 'from-red-500/20 via-red-500/5 to-transparent',
    chip: 'bg-red-500/10 border-red-500/30 text-red-400',
    iconBg: 'bg-red-500 text-white shadow-red-500/30 ring-red-500/20',
    heading: 'Integrity Check Failed',
    badgeText: 'Forged or Altered Document',
  },
  revoked: {
    border: 'border-amber-500/40 bg-slate-900/90',
    glow: 'from-amber-500/20 via-amber-500/5 to-transparent',
    chip: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    iconBg: 'bg-amber-500 text-slate-950 shadow-amber-500/30 ring-amber-500/20',
    heading: 'Certificate Withdrawn',
    badgeText: 'Revoked by Platform',
  },
  no_longer_verified: {
    border: 'border-amber-500/40 bg-slate-900/90',
    glow: 'from-amber-500/20 via-amber-500/5 to-transparent',
    chip: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    iconBg: 'bg-amber-500 text-slate-950 shadow-amber-500/30 ring-amber-500/20',
    heading: 'Business No Longer Verified',
    badgeText: 'Verification Inactive',
  },
};

const za = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

export default async function VerifyCertificatePage({
  params,
}: { params: Promise<{ serial: string }> }) {
  const { serial } = await params;
  const result = await verifySerial(serial, { countScan: true });
  const style = STYLE[result.outcome];
  const good = result.outcome === 'valid';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8 sm:py-12 relative overflow-hidden flex flex-col justify-between">
      {/* Dynamic ambient backlight according to outcome */}
      <div className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[34rem] h-[34rem] rounded-full blur-3xl pointer-events-none bg-gradient-to-b ${style.glow} animate-pulse-glow`} />

      <div className="mx-auto max-w-2xl w-full relative z-10">
        {/* Brand Header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <Link href="/" className="inline-block transition-transform hover:scale-105 duration-200">
            <span className="text-2xl font-black tracking-tight text-white">
              Verified<span className="text-amber-400">BizLink</span>
            </span>
          </Link>
          <span className="text-xs text-slate-400 font-mono mt-1">Official Registry Ledger Check</span>
        </div>

        {/* Verification Verdict Card */}
        <div className={`rounded-3xl border ${style.border} backdrop-blur-xl p-6 sm:p-9 shadow-2xl shadow-black/80 relative overflow-hidden transition-all duration-300`}>
          {/* Top accent bar */}
          <div className={`absolute top-0 left-0 right-0 h-1.5 ${good ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500' : 'bg-gradient-to-r from-amber-500 to-red-500'}`} />

          <div className="flex flex-col items-center text-center">
            {/* Animated Status Shield */}
            <div className="relative animate-float">
              <div className={`flex h-20 w-20 items-center justify-center rounded-2xl ${style.iconBg} shadow-xl ring-4 transition-all duration-300`}>
                {good ? (
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                )}
              </div>
            </div>

            {/* Status Pill Badge */}
            <div className={`mt-5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${style.chip}`}>
              <span className={`h-2 w-2 rounded-full ${good ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
              {style.badgeText}
            </div>

            <h1 className="mt-3 text-2xl sm:text-3xl font-black text-white tracking-tight">{style.heading}</h1>
            <p className="mt-2 max-w-md text-sm text-slate-300 leading-relaxed">{result.message}</p>

            {result.companyName && (
              <div className="mt-6 p-4 rounded-2xl bg-slate-950/70 border border-slate-800 w-full max-w-lg">
                <p className="text-xl sm:text-2xl font-black text-white tracking-tight">{result.companyName}</p>
                {result.regNumber && (
                  <p className="text-xs text-amber-400 font-mono mt-1 font-semibold">CIPC Reg: {result.regNumber}</p>
                )}
              </div>
            )}
          </div>

          {result.companyName && (
            <dl className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-slate-800 bg-slate-800 sm:grid-cols-2">
              <div className="bg-slate-900/90 p-4">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Certificate Serial</dt>
                <dd className="mt-1 font-mono text-sm font-bold text-amber-300">{result.serial}</dd>
              </div>
              <div className="bg-slate-900/90 p-4">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Check Code (Security Code)</dt>
                <dd className="mt-1 font-mono text-sm font-bold text-slate-200">{result.checkCode ?? '—'}</dd>
              </div>
              <div className="bg-slate-900/90 p-4">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Issued On</dt>
                <dd className="mt-1 text-sm font-medium text-slate-200">{za(result.issuedAt)}</dd>
              </div>
              <div className="bg-slate-900/90 p-4">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {good ? 'Verified Since' : 'Current Status'}
                </dt>
                <dd className={`mt-1 text-sm font-bold ${good ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {good ? za(result.verifiedSince) : (result.currentStatus ?? 'Unknown')}
                </dd>
              </div>
            </dl>
          )}

          {/* Cryptographic assurance disclaimer */}
          {result.checkCode && (
            <div className="mt-4 rounded-xl bg-slate-950/60 border border-slate-800/80 p-3.5 text-center text-xs text-slate-400 leading-relaxed">
              <span className="font-semibold text-slate-300">Cross-Reference Check:</span> Compare the certificate serial (<span className="text-amber-300 font-mono font-bold">{result.serial}</span>) and check code (<span className="text-slate-200 font-mono font-bold">{result.checkCode}</span>) above against the physical/PDF certificate. Both must match exactly.
            </div>
          )}

          {result.revokedAt && (
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-sm text-amber-200">
              <span className="font-bold text-amber-300">Revocation Notice:</span> Withdrawn on {za(result.revokedAt)}
              {result.revokeReason ? ` — ${result.revokeReason}` : ''}.
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            {good && result.businessId && (
              <Link
                href={`/business/${result.businessId}`}
                className="flex-1 flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-6 font-bold text-slate-950 hover:from-amber-300 hover:to-amber-400 transition-all duration-200 shadow-md shadow-amber-400/20"
              >
                <span>View Verified Business Profile</span>
              </Link>
            )}

            <Link
              href="/verify"
              className="flex-1 flex h-12 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/80 px-6 font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-all text-sm"
            >
              Check A Different Certificate
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400 leading-relaxed">
          This cryptographic lookup executes against the live database ledger.
          A document that was genuine when printed will automatically show as no longer verified if compliance expires or revokes.
        </p>
      </div>

      <div className="text-center text-[11px] text-slate-400 relative z-10 mt-6">
        VerifiedBizLink &copy; {new Date().getFullYear()} &bull; Trust &amp; Compliance Services
      </div>
    </div>
  );
}
