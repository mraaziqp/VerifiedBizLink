import { NextRequest, NextResponse } from 'next/server';
import { getSession, isStaff } from '@/lib/auth';
import db from '@/lib/db';

// GET /api/admin/businesses — list all businesses with user info
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!isStaff(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let businesses;
    if (status && status !== 'all') {
      businesses = await db`
        SELECT 
          b.id, b.user_id, b.company_name, b.industry, b.reg_number, b.vat_number,
          b.status, b.trust_score, b.submitted_at, b.verified_at, b.review_notes,
          b.description, b.website, b.phone, b.address, b.created_at,
          u.full_name AS owner_name, u.email AS owner_email, u.avatar_url AS owner_avatar,
          (SELECT COUNT(*) FROM documents d WHERE d.business_id = b.id) AS doc_count,
          (SELECT array_agg(d.name) FROM documents d WHERE d.business_id = b.id) AS documents
        FROM businesses b
        JOIN users u ON b.user_id = u.id
        WHERE b.status = ${status}
        ORDER BY b.submitted_at DESC NULLS LAST, b.created_at DESC
      `;
    } else {
      businesses = await db`
        SELECT 
          b.id, b.user_id, b.company_name, b.industry, b.reg_number, b.vat_number,
          b.status, b.trust_score, b.submitted_at, b.verified_at, b.review_notes,
          b.description, b.website, b.phone, b.address, b.created_at,
          u.full_name AS owner_name, u.email AS owner_email, u.avatar_url AS owner_avatar,
          (SELECT COUNT(*) FROM documents d WHERE d.business_id = b.id) AS doc_count,
          (SELECT array_agg(d.name) FROM documents d WHERE d.business_id = b.id) AS documents
        FROM businesses b
        JOIN users u ON b.user_id = u.id
        ORDER BY b.submitted_at DESC NULLS LAST, b.created_at DESC
      `;
    }

    return NextResponse.json({ businesses });
  } catch (error) {
    console.error('Admin businesses GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch businesses' }, { status: 500 });
  }
}
