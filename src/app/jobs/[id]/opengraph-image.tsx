import { ImageResponse } from 'next/og';
import { findJob, isPubliclyListed, toJobJson } from '@/lib/jobs-server';
import {
  EMPLOYMENT_TYPE_LABELS, LOCATION_TYPE_LABELS, formatSalaryRange, isEmploymentType, isLocationType,
} from '@/lib/talent';

/**
 * The picture a shared job link unfurls with in WhatsApp, LinkedIn and
 * Facebook: the role, who is hiring, that they are verified, where and what
 * it pays — the things someone decides to tap on.
 *
 * Only published roles from verified businesses are drawn. Anything else
 * gets the generic card, so a draft's title cannot be read off its preview
 * image by someone guessing the address.
 */

export const runtime = 'nodejs';
export const alt = 'A job on VerifiedBizLink';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const INK = '#0f172a';
const GOLD = '#fbbf24';

/**
 * Drawn, not typed: the bundled font has no tick character, and a missing
 * glyph makes the renderer go and fetch a font over the network mid-request.
 */
function Tick({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

function Chip({ children, strong }: { children: string; strong?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 22px',
        borderRadius: 999,
        fontSize: 30,
        fontWeight: 700,
        marginRight: 14,
        marginBottom: 14,
        background: strong ? GOLD : 'rgba(255,255,255,0.10)',
        color: strong ? INK : '#e2e8f0',
        border: strong ? `2px solid ${GOLD}` : '2px solid rgba(255,255,255,0.18)',
      }}
    >
      {children}
    </div>
  );
}

export default async function Image({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const { id } = await Promise.resolve(params);

  const row = await findJob(id).catch(() => null);
  const job = row && isPubliclyListed(row) ? toJobJson(row) : null;

  const title = job ? job.title.slice(0, 80) : 'Jobs at verified businesses';
  const where = job
    ? [
        job.location,
        isLocationType(job.locationType) && (job.locationType !== 'on_site' || !job.location)
          ? LOCATION_TYPE_LABELS[job.locationType]
          : null,
      ].filter(Boolean).join(' · ')
    : '';
  const kind = job && isEmploymentType(job.employmentType) ? EMPLOYMENT_TYPE_LABELS[job.employmentType] : '';
  const salary = job ? formatSalaryRange(job.salaryMinCents, job.salaryMaxCents, job.salaryPeriod) : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 64,
          background: `linear-gradient(135deg, ${INK} 0%, #1e293b 100%)`,
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 34, fontWeight: 800 }}>
            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 56, height: 56, borderRadius: 14, background: GOLD, marginRight: 16,
              }}
            >
              <Tick size={36} color={INK} />
            </div>
            <span>Verified</span>
            <span style={{ color: GOLD }}>BizLink</span>
          </div>
          <div style={{ display: 'flex', fontSize: 26, fontWeight: 700, color: GOLD, letterSpacing: 3 }}>
            {job ? 'WE ARE HIRING' : 'JOBS'}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              fontSize: title.length > 44 ? 62 : 78,
              fontWeight: 900,
              lineHeight: 1.08,
              letterSpacing: -1.5,
            }}
          >
            {title}
          </div>
          {job && (
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 22, fontSize: 38, fontWeight: 700, color: '#e2e8f0' }}>
              <span>{job.companyName.slice(0, 44)}</span>
              <div
                style={{
                  display: 'flex', alignItems: 'center', marginLeft: 18, padding: '6px 18px',
                  borderRadius: 999, background: '#059669', color: '#ffffff', fontSize: 26, fontWeight: 800,
                }}
              >
                <Tick size={26} color="#ffffff" />
                <span style={{ marginLeft: 8 }}>Verified employer</span>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
          {job ? (
            <>
              {where ? <Chip>{where.slice(0, 40)}</Chip> : null}
              {kind ? <Chip>{kind}</Chip> : null}
              {salary ? <Chip strong>{salary}</Chip> : null}
            </>
          ) : (
            <div style={{ display: 'flex', fontSize: 32, color: '#cbd5e1' }}>
              Every employer has had its company registration checked.
            </div>
          )}
        </div>
      </div>
    ),
    {
      ...size,
      // The default is to cache for a year, and the address does not change
      // when a listing does: an employer who corrected the pay would keep
      // being previewed with the old figure. An hour is long enough to
      // absorb a link going round a group chat.
      headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' },
    },
  );
}
