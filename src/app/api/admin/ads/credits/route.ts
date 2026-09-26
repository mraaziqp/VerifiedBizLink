import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { isStaff } from '@/lib/roles';
import db from '@/lib/db';
import { changeCredits } from '@/lib/ad-credits';

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

    const body = await request.json().catch(() => ({}));
    const { businessId, reason } = body;
    const amount = Number(body.amount);

    if (!businessId || !Number.isInteger(amount) || amount === 0) {
      return NextResponse.json({ error: 'Enter a whole number of credits (negative to deduct).' }, { status: 400 });
    }
    if (Math.abs(amount) > 1_000_000) {
      return NextResponse.json({ error: 'Adjust at most 1,000,000 credits at a time.' }, { status: 400 });
    }

    const [biz] = await db`SELECT id, company_name, COALESCE(ad_credits, 0) AS ad_credits FROM businesses WHERE id = ${businessId} LIMIT 1`;
    if (!biz) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const currentCredits = Number(biz.ad_credits) || 0;
    // A deduction larger than the balance empties it rather than failing.
    const delta = amount < 0 ? Math.max(amount, -currentCredits) : amount;
    if (delta === 0) {
      return NextResponse.json({ error: `${biz.company_name} has no credits to deduct.` }, { status: 400 });
    }

    const note = typeof reason === 'string' && reason.trim() ? reason.trim().slice(0, 200) : null;
    // Through the ledger, and without touching credits_last_topped_up_at:
    // setting that here used to cancel the business's monthly plan allowance
    // for the rest of the month.
    const result = await changeCredits({
      businessId,
      delta,
      kind: 'admin_adjustment',
      note: note ? `Admin: ${note}` : `Admin adjustment by ${session.fullName}`,
      actorId: session.id,
    });
    if (!result.applied) {
      return NextResponse.json({ error: 'The balance changed while saving. Refresh and try again.' }, { status: 409 });
    }
    const newCredits = result.balance;

    await db`
      INSERT INTO audit_logs (admin_id, admin_name, action, target_type, target_id, target_name)
      VALUES (
        ${session.id},
        ${session.fullName},
        ${`Adjusted ad credits ${currentCredits} → ${newCredits}${note ? ` — ${note}` : ''}`},
        'business',
        ${businessId},
        ${biz.company_name}
      )
    `.catch((err) => console.error('Audit log write failed:', err)); // non-fatal

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
