import { NextResponse } from 'next/server';
import { getSession, isStaff } from '@/lib/auth';
import db from '@/lib/db';

type Row = Record<string, unknown>;

/**
 * GET /api/admin/activity — the "what just happened on the platform" feed.
 *
 * Built by reading the source tables directly (users / businesses /
 * payments) rather than writing to a parallel events table. A duplicated
 * log can silently drift out of sync with reality; deriving it means the
 * feed can never disagree with the actual records.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!isStaff(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const signups = (await db`
      SELECT
        u.id, u.full_name, u.email, u.role, u.created_at, u.email_verified,
        b.company_name, b.industry, b.package_type, b.status AS business_status,
        b.assisted_signup, b.assisted_by
      FROM users u
      LEFT JOIN businesses b ON b.user_id = u.id
      WHERE u.role NOT IN ('admin', 'banker', 'lawyer')
      ORDER BY u.created_at DESC
      LIMIT 100
    `) as unknown as Row[];

    const payments = (await db`
      SELECT
        p.id, p.plan_type, p.amount, p.currency, p.status,
        p.transaction_id, p.created_at, p.completed_at,
        u.full_name, u.email, b.company_name
      FROM payments p
      JOIN users u ON u.id = p.user_id
      LEFT JOIN businesses b ON b.user_id = u.id
      ORDER BY p.created_at DESC
      LIMIT 100
    `.catch(() => [])) as unknown as Row[];

    return NextResponse.json({
      signups: signups.map((s) => ({
        id: s.id,
        fullName: s.full_name,
        email: s.email,
        role: s.role,
        createdAt: s.created_at,
        emailVerified: s.email_verified === true,
        companyName: s.company_name ?? null,
        // "What they signed up for": the category + plan they chose.
        industry: s.industry || null,
        planType: s.package_type || null,
        businessStatus: s.business_status || null,
        assistedSignup: s.assisted_signup === true,
        assistedBy: s.assisted_by || null,
      })),
      payments: payments.map((p) => ({
        id: p.id,
        // Receipt fields — reference is what a customer would quote at you.
        reference: p.transaction_id || String(p.id).slice(0, 8).toUpperCase(),
        planType: p.plan_type,
        amount: p.amount,
        currency: p.currency || 'ZAR',
        status: p.status,
        createdAt: p.created_at,
        completedAt: p.completed_at,
        fullName: p.full_name,
        email: p.email,
        companyName: p.company_name ?? null,
      })),
    });
  } catch (error) {
    console.error('Admin activity error:', error);
    return NextResponse.json({ error: 'Failed to load activity' }, { status: 500 });
  }
}
