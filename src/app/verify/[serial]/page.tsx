import { cache } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ShieldCheck, ShieldAlert, XCircle, AlertTriangle, ArrowRight, RefreshCw, Building2 } from 'lucide-react';
import { verifySerial, type VerificationOutcome, type VerificationResult } from '@/lib/certificates';
import { VBLLogo } from '@/components/ui/vbl-logo';

export const dynamic = 'force-dynamic';

/**
 * Where a certificate's QR code lands.
 *
 * Rendered on the server so the answer is in the HTML itself — someone
 * standing in a shop on a bad connection, or a search engine, or a screen
 * reader, gets the verdict without waiting for JavaScript. Nobody is asked to
 * log in: a certificate that only its owner can check is not a certificate.
 */

/**
 * One lookup per request. generateMetadata and the page both need the result;
 * without this each ran its own query, and a scan was counted once per page
 * view instead of once per check.
 */
const checkCertificate = cache(
  (serial: string): Promise<VerificationResult | null> =>
    verifySerial(serial, { countScan: true }).catch((error) => {
      console.error('Certificate page lookup failed:', error);
      return null;
    }),
);

export async function generateMetadata({
  params,
}: { params: Promise<{ serial: string }> }): Promise<Metadata> {
  const { serial } = await params;
  const result = await checkCertificate(serial);
  const name = result?.companyName;
  return {
    title: result?.outcome === 'valid' && name
      ? `${name} is verified — VerifiedBizLink`
      : 'Certificate check — VerifiedBizLink',
    description: result?.message ?? 'Check a VerifiedBizLink certificate.',
    robots: { index: false },
  };
}

interface OutcomeVisuals {
  border: string;
  glow: string;
  chip: string;
  dotColor: string;
  iconBg: string;
  accentBar: string;
  heading: string;
  badgeText: string;
}

const STYLE: Record<VerificationOutcome, OutcomeVisuals> = {
  valid: {
    border: 'border-emerald-200 bg-white',
    glow: 'bg-emerald-100/50',
    chip: 'bg-emerald-50 border-emerald-300 text-emerald-800',
    dotColor: 'bg-emerald-600',
    iconBg: 'bg-emerald-600 text-white shadow-emerald-600/20 ring-emerald-100',
    accentBar: 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600',
    heading: 'Genuine Verified Certificate',
    badgeText: 'Cryptographically Verified & Active',
  },
  not_found: {
    border: 'border-rose-200 bg-white',
    glow: 'bg-rose-100/50',
    chip: 'bg-rose-50 border-rose-300 text-rose-800',
    dotColor: 'bg-rose-600',
    iconBg: 'bg-rose-600 text-white shadow-rose-600/20 ring-rose-100',
    accentBar: 'bg-gradient-to-r from-rose-500 to-red-600',
    heading: 'Certificate Not Found',
    badgeText: 'Unrecognized Document',
  },
  tampered: {
    border: 'border-red-200 bg-white',
    glow: 'bg-red-100/50',
    chip: 'bg-red-50 border-red-300 text-red-800',
    dotColor: 'bg-red-600',
    iconBg: 'bg-red-600 text-white shadow-red-600/20 ring-red-100',
    accentBar: 'bg-gradient-to-r from-red-600 to-rose-700',
    heading: 'Integrity Check Failed',
    badgeText: 'Forged or Altered Document',
  },
  revoked: {
    border: 'border-amber-200 bg-white',
    glow: 'bg-amber-100/50',
    chip: 'bg-amber-50 border-amber-300 text-amber-900',
    dotColor: 'bg-amber-600',
    iconBg: 'bg-amber-600 text-white shadow-amber-600/20 ring-amber-100',
    accentBar: 'bg-gradient-to-r from-amber-500 to-orange-600',
    heading: 'Certificate Withdrawn',
    badgeText: 'Revoked by Platform',
  },
  no_longer_verified: {
    border: 'border-amber-200 bg-white',
    glow: 'bg-amber-100/50',
    chip: 'bg-amber-50 border-amber-300 text-amber-900',
    dotColor: 'bg-amber-600',
    iconBg: 'bg-amber-600 text-white shadow-amber-600/20 ring-amber-100',
    accentBar: 'bg-gradient-to-r from-amber-500 to-slate-700',
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
  const result = await checkCertificate(serial);
  if (!result) return <RegistryUnavailable serial={serial} />;
  const style = STYLE[result.outcome];
  const good = result.outcome === 'valid';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 px-4 py-8 sm:py-12 relative overflow-hidden flex flex-col justify-between">
      {/* Dynamic ambient backlight */}
      <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[34rem] h-[34rem] rounded-full blur-3xl pointer-events-none ${style.glow}`} />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-slate-200/50 rounded-full blur-3xl pointer-events-none" />

      <div className="mx-auto max-w-2xl w-full relative z-10">
        {/* Brand Header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <Link href="/" className="inline-block transition-transform hover:scale-105 duration-200">
            <VBLLogo variant="full" size="md" iconSize={42} theme="dark" />
          </Link>
          <span className="text-xs text-slate-500 font-mono mt-2 tracking-wide uppercase font-semibold">
            Official Registry Ledger Verification
          </span>
        </div>

        {/* Verification Verdict Card */}
        <div className={`rounded-3xl border ${style.border} p-6 sm:p-9 shadow-xl relative overflow-hidden transition-all duration-300`}>
          {/* Top accent bar */}
          <div className={`absolute top-0 left-0 right-0 h-1.5 ${style.accentBar}`} />

          <div className="flex flex-col items-center text-center">
            {/* Animated Status Shield */}
            <div className="relative animate-float">
              <div className={`flex h-20 w-20 items-center justify-center rounded-2xl ${style.iconBg} shadow-xl ring-4 transition-all duration-300`}>
                {good ? (
                  <ShieldCheck className="h-10 w-10 text-white stroke-[2.5]" />
                ) : result.outcome === 'not_found' ? (
                  <XCircle className="h-10 w-10 text-white stroke-[2.5]" />
                ) : (
                  <ShieldAlert className="h-10 w-10 text-white stroke-[2.5]" />
                )}
              </div>
            </div>

            {/* Status Pill Badge */}
            <div className={`mt-5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-bold ${style.chip}`}>
              <span className={`h-2 w-2 rounded-full ${style.dotColor} ${good ? 'animate-ping' : ''}`} />
              {style.badgeText}
            </div>

            <h1 className="mt-3 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {style.heading}
            </h1>
            <p className="mt-2 max-w-md text-sm text-slate-600 leading-relaxed font-medium">
              {result.message}
            </p>

            {result.companyName && (
              <div className="mt-6 p-5 rounded-2xl bg-slate-50 border border-slate-200/90 w-full max-w-lg shadow-inner">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Building2 className="h-5 w-5 text-slate-700" />
                  <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {result.companyName}
                  </p>
                </div>
                {result.regNumber && (
                  <p className="text-xs text-slate-700 font-mono font-bold mt-1 tracking-wide">
                    CIPC Registration: <span className="text-slate-900 font-extrabold">{result.regNumber}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {result.companyName && (
            <dl className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Certificate Serial</dt>
                <dd className="mt-1 font-mono text-sm font-bold text-slate-900 break-all select-all">{result.serial}</dd>
              </div>
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Security Check Code</dt>
                <dd className="mt-1 font-mono text-sm font-bold text-slate-900 select-all">{result.checkCode ?? '—'}</dd>
              </div>
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Issued On</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-800">{za(result.issuedAt)}</dd>
              </div>
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {good ? 'Verified Since' : 'Current Status'}
                </dt>
                <dd className={`mt-1 text-sm font-bold ${good ? 'text-emerald-700' : 'text-amber-800'}`}>
                  {good ? za(result.verifiedSince) : (result.currentStatus ?? 'Unknown')}
                </dd>
              </div>
            </dl>
          )}

          {/* Cryptographic assurance disclaimer */}
          {result.checkCode && (
            <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-4 text-center text-xs text-slate-600 leading-relaxed">
              <span className="font-bold text-slate-800">Cross-Reference Verification:</span> Compare the certificate serial (<span className="bg-white px-2 py-0.5 rounded border border-slate-300 font-mono font-bold text-slate-900">{result.serial}</span>) and check code (<span className="bg-white px-2 py-0.5 rounded border border-slate-300 font-mono font-bold text-slate-900">{result.checkCode}</span>) above against the physical or PDF certificate. Both credentials must match precisely.
            </div>
          )}

          {result.revokedAt && (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 flex items-start gap-2.5">
              <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-900">Revocation Notice:</span> Withdrawn on {za(result.revokedAt)}
                {result.revokeReason ? ` — ${result.revokeReason}` : ''}.
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            {good && result.businessId && (
              <Link
                href={`/business/${result.businessId}`}
                className="sm:flex-1 flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 font-bold text-white hover:bg-slate-800 transition-all duration-200 shadow-md cursor-pointer text-sm"
              >
                <span>View Verified Business Profile</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}

            <Link
              href="/verify"
              className="sm:flex-1 flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all text-sm cursor-pointer shadow-xs"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Check A Different Certificate</span>
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500 leading-relaxed max-w-lg mx-auto">
          This cryptographic lookup executes against the live database ledger.
          A document that was genuine when printed will automatically show as no longer verified if compliance expires or is revoked.
        </p>
      </div>

      <div className="text-center text-[11px] text-slate-400 relative z-10 mt-6">
        VerifiedBizLink &copy; {new Date().getFullYear()} &bull; Trust &amp; Compliance Services &bull; Republic of South Africa
      </div>
    </div>
  );
}

/**
 * The lookup itself failed (database unreachable). Said plainly, because the
 * alternative — reporting "not found" — tells the person holding a genuine
 * certificate that it is a forgery.
 */
function RegistryUnavailable({ serial }: { serial: string }) {
  const href = `/verify/${encodeURIComponent(serial)}`;
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 px-4 py-8 sm:py-12 flex flex-col items-center justify-center">
      <div className="mx-auto max-w-md w-full">
        <div className="mb-6 flex justify-center">
          <Link href="/" className="inline-block">
            <VBLLogo variant="full" size="md" iconSize={42} theme="dark" />
          </Link>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-amber-400">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h1 className="mt-5 text-xl sm:text-2xl font-black tracking-tight">We couldn&apos;t reach the registry</h1>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            This is a problem on our side, not with the certificate. Nothing about{' '}
            <span className="font-mono font-bold text-slate-900 whitespace-nowrap">{serial}</span> has been decided — please try again in a moment.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <a
              href={href}
              className="sm:flex-1 flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </a>
            <Link
              href="/verify"
              className="sm:flex-1 flex h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Enter a different number
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
