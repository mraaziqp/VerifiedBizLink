import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { getAllTiers } from '@/lib/tiers';

// GET /api/businesses/packages — return package definitions + current business package
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [biz, tiers] = await Promise.all([
    db`
      SELECT package_type, trial_package, trial_ends_at, onboarding_completed
      FROM businesses WHERE user_id = ${session.id} LIMIT 1
    `,
    getAllTiers(),
  ]);

  const trialActive =
    biz.length > 0 &&
    biz[0].trial_ends_at &&
    new Date(biz[0].trial_ends_at) > new Date();

  return NextResponse.json({
    packages: Object.fromEntries(tiers.map((t) => [t.key, t])),
    current: biz[0]?.package_type || 'free',
    trial: trialActive
      ? {
          package: biz[0].trial_package,
          endsAt: biz[0].trial_ends_at,
        }
      : null,
  });
}

// POST /api/businesses/packages — choose a package + mark onboarding complete
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { packageType, industry, description, onboardingCompleted } = await request.json();

  if (packageType) {
    const [validTier] = await db`SELECT key FROM tiers WHERE key = ${packageType} AND is_active = true`;
    if (!validTier) {
      return NextResponse.json({ error: 'Invalid package' }, { status: 400 });
    }
  }

  const updated = await db`
    UPDATE businesses SET
      package_type = ${packageType || 'free'},
      industry = COALESCE(NULLIF(${industry || ''}, ''), industry),
      description = COALESCE(NULLIF(${description || ''}, ''), description),
      onboarding_completed = ${onboardingCompleted ?? true},
      updated_at = NOW()
    WHERE user_id = ${session.id}
    RETURNING *
  `;

  return NextResponse.json({ business: updated[0] });
}

