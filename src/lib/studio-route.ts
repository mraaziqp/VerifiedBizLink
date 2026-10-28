import { NextResponse } from 'next/server';
import { getSession, type SessionUser } from '@/lib/auth';
import { getStudioSettings, studioAccess, StudioError, type StudioAccess } from '@/lib/studio';

/** A signed-in subscriber (or staff) for the /api/studio routes, or the response to send. */
export async function studioMember(): Promise<{ session: SessionUser; access: StudioAccess } | NextResponse> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  const access = await studioAccess(session);
  // Until the admin switches Build Studio live, it is staff-only: members
  // cannot order, quote or open projects even by calling the API directly.
  if (!access.staff && !(await getStudioSettings()).isLive) {
    return NextResponse.json({ error: 'Build Studio is not open yet.' }, { status: 404 });
  }
  if (!access.allowed) {
    return NextResponse.json({ error: 'Build Studio is part of every paid VerifiedBizLink plan. Upgrade to order.', upgrade: true }, { status: 403 });
  }
  return { session, access };
}

/** The hub's error, with its status, as a response. */
export function studioFailure(error: unknown, fallback = 'The studio is unavailable just now.') {
  const status = error instanceof StudioError ? error.status : 502;
  return NextResponse.json({ error: error instanceof Error ? error.message : fallback }, { status });
}
