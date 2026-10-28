import { NextRequest, NextResponse } from 'next/server';
import { getSession, sessionCookieOptions } from '@/lib/auth';
import { findAccounts, linkedAccounts, switchOwner, switchTo, SwitchError } from '@/lib/account-switch';
import { rateLimit } from '@/lib/rate-limit';

/**
 * GET  /api/auth/switch            who is really signed in and the accounts they can switch to
 *                                  (?q=… searches any account by email or name)
 * POST /api/auth/switch { userId } switch to that account (their own id switches back)
 *
 * Only the developer account may switch; see lib/account-switch.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getSession();
  const owner = await switchOwner(session).catch(() => null);
  if (!session || !owner) return NextResponse.json({ canSwitch: false, actor: session?.actor ?? null, accounts: [] });
  const query = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  const accounts = query ? await findAccounts(query) : await linkedAccounts(owner);
  return NextResponse.json({ canSwitch: true, owner, actor: session.actor ?? null, currentId: session.id, accounts });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  const limited = await rateLimit(`account-switch:${session.actor?.id ?? session.id}`, 60, 60 * 60);
  if (!limited.allowed) return NextResponse.json({ error: 'Too many switches in an hour. Try again later.' }, { status: 429 });

  const body = (await request.json().catch(() => ({}))) as { userId?: unknown };
  const userId = typeof body.userId === 'string' ? body.userId : '';
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return NextResponse.json({ error: 'Choose an account.' }, { status: 400 });

  try {
    const { token, user, back } = await switchTo(session, userId, request);
    const response = NextResponse.json({ success: true, back, user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role } });
    response.cookies.set('vbl_session', token, sessionCookieOptions(request.headers.get('host')));
    return response;
  } catch (error) {
    if (error instanceof SwitchError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Account switch failed:', error);
    return NextResponse.json({ error: 'Could not switch accounts just now.' }, { status: 500 });
  }
}
