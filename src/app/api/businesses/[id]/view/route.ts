import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

// POST /api/businesses/[id]/view — record a public profile view.
// Fire-and-forget from the client; never blocks or errors loudly.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession().catch(() => null);

  // Don't count the owner viewing their own profile.
  const owner = await db`SELECT user_id FROM businesses WHERE id = ${id} LIMIT 1`;
  if (owner.length === 0) return NextResponse.json({ success: true });
  if (session && owner[0].user_id === session.id) {
    return NextResponse.json({ success: true, counted: false });
  }

  await db`
    INSERT INTO business_profile_views (business_id, viewer_id)
    VALUES (${id}, ${session?.id ?? null})
  `;
  return NextResponse.json({ success: true, counted: true });
}
