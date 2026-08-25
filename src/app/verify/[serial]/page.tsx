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
  ring: string; chip: string; icon: string; heading: string;
}> = {
  valid: {
    ring: 'border-emerald-300 bg-emerald-50',
    chip: 'bg-emerald-600 text-white',
    icon: 'M20 6L9 17l-5-5',
    heading: 'Genuine certificate',
  },
  not_found: {
    ring: 'border-red-300 bg-red-50',
    chip: 'bg-red-600 text-white',
    icon: 'M18 6L6 18M6 6l12 12',
    heading: 'No such certificate',
  },
  tampered: {
    ring: 'border-red-300 bg-red-50',
    chip: 'bg-red-600 text-white',
    icon: 'M18 6L6 18M6 6l12 12',
    heading: 'Does not match what we issued',
  },
  revoked: {
    ring: 'border-amber-300 bg-amber-50',
    chip: 'bg-amber-600 text-white',
    icon: 'M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
    heading: 'Withdrawn',
  },
  no_longer_verified: {
    ring: 'border-amber-300 bg-amber-50',
    chip: 'bg-amber-600 text-white',
    icon: 'M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
    heading: 'No longer verified',
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
    <div className="min-h-screen bg-slate-950 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="text-xl font-black tracking-tight text-white">
            Verified<span className="text-yellow-400">BizLink</span>
          </span>
        </div>

        <div className={`rounded-3xl border-2 bg-white p-6 shadow-2xl sm:p-9 ${style.ring}`}>
          <div className="flex flex-col items-center text-center">
            <div className={`flex h-16 w-16 items-center justify-center rounded-full ${style.chip}`}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={style.icon} />
              </svg>
            </div>

            <h1 className="mt-4 text-2xl font-extrabold text-gray-900 sm:text-3xl">{style.heading}</h1>
            <p className="mt-2 max-w-md text-sm text-gray-600">{result.message}</p>

            {result.companyName && (
              <p className="mt-5 text-xl font-bold text-gray-900 sm:text-2xl">{result.companyName}</p>
            )}
            {result.regNumber && (
              <p className="text-sm text-gray-500">Registration {result.regNumber}</p>
            )}
          </div>

          {result.companyName && (
            <dl className="mt-7 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-gray-200 bg-gray-200 sm:grid-cols-2">
              <div className="bg-white p-4">
                <dt className="text-xs font-bold uppercase tracking-wide text-gray-500">Certificate number</dt>
                <dd className="mt-1 font-mono text-sm font-bold text-gray-900">{result.serial}</dd>
              </div>
              <div className="bg-white p-4">
                <dt className="text-xs font-bold uppercase tracking-wide text-gray-500">Check code</dt>
                <dd className="mt-1 font-mono text-sm text-gray-900">{result.checkCode ?? '—'}</dd>
              </div>
              <div className="bg-white p-4">
                <dt className="text-xs font-bold uppercase tracking-wide text-gray-500">Issued</dt>
                <dd className="mt-1 text-sm text-gray-900">{za(result.issuedAt)}</dd>
              </div>
              <div className="bg-white p-4">
                <dt className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  {good ? 'Verified since' : 'Current status'}
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {good ? za(result.verifiedSince) : (result.currentStatus ?? 'unknown')}
                </dd>
              </div>
            </dl>
          )}

          {/* The check code is what catches a serial pasted onto someone
              else's document — the numbers must match the printed page. */}
          {result.checkCode && (
            <p className="mt-4 rounded-xl bg-gray-50 p-3 text-center text-xs text-gray-600">
              Compare the certificate number and check code above against the printed
              certificate. If either differs, the document has been altered.
            </p>
          )}

          {result.revokedAt && (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Withdrawn on {za(result.revokedAt)}
              {result.revokeReason ? ` — ${result.revokeReason}` : ''}.
            </p>
          )}

          {good && result.businessId && (
            <div className="mt-6 text-center">
              <Link
                href={`/business/${result.businessId}`}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-yellow-400 px-6 font-bold text-gray-900 hover:bg-yellow-300"
              >
                View their profile
              </Link>
            </div>
          )}

          <div className="mt-6 border-t border-gray-200 pt-5 text-center">
            <Link href="/verify" className="text-sm font-semibold text-gray-600 hover:text-gray-900">
              Check a different certificate
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          This check runs against the live record. A certificate that was genuine when
          printed will show here if the business is no longer verified.
        </p>
      </div>
    </div>
  );
}
