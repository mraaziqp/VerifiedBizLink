import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { PACKAGES } from '@/lib/tiers';

// GET /api/businesses/packages — return package definitions + current business package
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const biz = await db`
    SELECT package_type, trial_package, trial_ends_at, onboarding_completed
    FROM businesses WHERE user_id = ${session.id} LIMIT 1
  `;

  const trialActive =
    biz.length > 0 &&
    biz[0].trial_ends_at &&
    new Date(biz[0].trial_ends_at) > new Date();

  return NextResponse.json({
    packages: PACKAGES,
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

  const validPackages = ['free', 'standard', 'premium'];
  if (packageType && !validPackages.includes(packageType)) {
    return NextResponse.json({ error: 'Invalid package' }, { status: 400 });
  }

  const updated = await db`
    UPDATE businesses SET
      package_type = ${packageType || 'free'},
      industry = ${industry || ''},
      description = COALESCE(NULLIF(${description || ''}, ''), description),
      onboarding_completed = ${onboardingCompleted ?? true},
      updated_at = NOW()
    WHERE user_id = ${session.id}
    RETURNING *
  `;

  return NextResponse.json({ business: updated[0] });
}

