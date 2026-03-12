import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Suggest users not already connected
    const suggestions = await db`
      SELECT 
        u.id, u.full_name, u.headline, u.avatar_url,
        b.company_name, b.industry, b.status AS business_status, b.trust_score
      FROM users u
      LEFT JOIN businesses b ON b.user_id = u.id
      WHERE u.id != ${session.id}
        AND u.id NOT IN (
          SELECT CASE WHEN c.requester_id = ${session.id} THEN c.receiver_id ELSE c.requester_id END
          FROM connections c
          WHERE c.requester_id = ${session.id} OR c.receiver_id = ${session.id}
        )
        AND b.status = 'verified'
      ORDER BY b.trust_score DESC NULLS LAST
      LIMIT 5
    `;

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Suggestions error:', error);
    return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
  }
}
