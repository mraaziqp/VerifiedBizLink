import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

const PACKAGES = {
  free: {
    name: 'Free',
    price: 0,
    features: [
      'Basic business listing',
      'Up to 10 network connections',
      'Standard trust badge',
      '1 post per day',
    ],
  },
  standard: {
    name: 'Standard',
    price: 299,
    features: [
      'Enhanced business profile',
      'Unlimited connections',
      'Priority discovery listing',
      'Unlimited posts',
      '1 active ad',
      'Basic analytics',
    ],
  },
  premium: {
    name: 'Premium',
    price: 699,
    features: [
      'Everything in Standard',
      'Gold Verified badge (fast-tracked)',
      'Boosted ad placement',
      '5 active ads',
      'Full analytics dashboard',
      'AI content assistant (unlimited)',
      'Priority vetting review',
      'Dedicated account manager',
    ],
  },
  premium_half: {
    name: 'Premium Trial',
    price: 0,
    features: [
      'Gold Verified badge eligibility',
      'Up to 3 active ads',
      'Enhanced analytics',
      'AI content assistant',
      'Priority vetting review',
    ],
    note: '2-week trial — half of Premium features',
  },
} as const;

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

