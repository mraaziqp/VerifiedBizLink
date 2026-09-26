import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getInbox, getThread, isUuid, touchPresence, unreadTotal } from '@/lib/messaging';

export const dynamic = 'force-dynamic';

/**
 * GET /api/messages/hub[?with=<userId>]
 *
 * The one endpoint the messaging store polls, for both the floating widget
 * and /dashboard/messages: the inbox, the unread total, and — when a
 * conversation is open — its messages (which marks them read).
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const withUser = request.nextUrl.searchParams.get('with');
    const [inbox, thread] = await Promise.all([
      getInbox(session.id),
      withUser && isUuid(withUser) ? getThread(session.id, withUser) : Promise.resolve(null),
    ]);
    // After getThread, so opening a thread is reflected in the badge.
    const unread = await unreadTotal(session.id);
    void touchPresence(session.id);

    return NextResponse.json(
      { me: session.id, inbox, unread, thread, withUser: thread ? withUser : null, at: new Date().toISOString() },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('Messaging hub error:', error);
    return NextResponse.json({ error: 'Could not load your messages' }, { status: 500 });
  }
}
