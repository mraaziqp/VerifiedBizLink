import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

// Submit business for vetting
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const updated = await db`
      UPDATE businesses SET status = 'pending', submitted_at = NOW(), updated_at = NOW()
      WHERE user_id = ${session.id}
      RETURNING *
    `;

    if (updated.length === 0) {
      return NextResponse.json({ error: 'No business profile found' }, { status: 404 });
    }

    await db`
      INSERT INTO audit_logs (admin_id, admin_name, action, target_type, target_name)
      VALUES (${session.id}, ${session.fullName}, 'Submitted for Vetting', 'business', ${updated[0].company_name})
    `;

    return NextResponse.json({ business: updated[0] });
  } catch (error) {
    console.error('Submit vetting error:', error);
    return NextResponse.json({ error: 'Failed to submit for vetting' }, { status: 500 });
  }
}
