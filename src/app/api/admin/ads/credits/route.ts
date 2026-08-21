import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { isStaff } from '@/lib/roles';
import db from '@/lib/db';

type Row = Record<string, unknown>;

/**
 * GET /api/admin/ads/credits
 * List businesses with their current ad credits balance
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isStaff(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q')?.trim().toLowerCase();

    const businesses = (await db`
      SELECT
        b.id, b.company_name, b.status, b.package_type,
        COALESCE(b.ad_credits, 0) AS ad_credits,
        b.credits_last_topped_up_at,
        u.id AS user_id, u.email, u.full_name,
        (SELECT COUNT(*)::int FROM ads a WHERE a.business_id = b.id) AS total_ads,
        (SELECT COUNT(*)::int FROM ads a WHERE a.business_id = b.id AND a.is_active = true) AS active_ads
      FROM businesses b
      JOIN users u ON u.id = b.user_id
      ORDER BY b.company_name ASC
    `) as unknown as Row[];

    let filtered = businesses;
    if (search) {
      filtered = filtered.filter((b) =>
        String(b.company_name || '').toLowerCase().includes(search) ||
        String(b.email || '').toLowerCase().includes(search) ||
        String(b.full_name || '').toLowerCase().includes(search)
      );
    }

    return NextResponse.json({ businesses: filtered });
  } catch (error) {
    console.error('Admin ad credits GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch business credits' }, { status: 500 });
  }
}

/**
 * POST /api/admin/ads/credits
 * Grant or deduct ad credits for a business
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isStaff(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { businessId, amount, reason } = body;

    if (!businessId || typeof amount !== 'number') {
      return NextResponse.json({ error: 'businessId and numeric amount required' }, { status: 400 });
    }

    const [biz] = await db`SELECT id, company_name, ad_credits FROM businesses WHERE id = ${businessId} LIMIT 1`;
    if (!biz) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const currentCredits = Number(biz.ad_credits) || 0;
    const newCredits = Math.max(0, currentCredits + amount);

    await db`
      UPDATE businesses
      SET
        ad_credits = ${newCredits},
        credits_last_topped_up_at = NOW(),
        updated_at = NOW()
      WHERE id = ${businessId}
    `;

    return NextResponse.json({
      success: true,
      message: `Updated credits for ${biz.company_name}: ${currentCredits} ➔ ${newCredits}`,
      newCredits,
    });
  } catch (error) {
    console.error('Admin ad credits POST error:', error);
    return NextResponse.json({ error: 'Failed to update credits' }, { status: 500 });
  }
}
