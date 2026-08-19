import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { createTrackedSession, sessionCookieOptions } from '@/lib/auth';
import { hashInviteToken } from '@/lib/agents';
import { ROLES } from '@/lib/roles';
import db from '@/lib/db';

type Row = Record<string, unknown>;

/**
 * GET /api/auth/agent-invite?token= — describe an invite without consuming it.
 *
 * Public by necessity: the recipient is not signed in. The token is the
 * secret, and only its hash is stored, so a leaked database cannot be used to
 * mint agent accounts. Nothing is returned that the holder does not already
 * know from the email that carried the link.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  const rows = (await db`
    SELECT full_name, email, referral_code, expires_at, accepted_at, revoked_at
    FROM agent_invites WHERE token_hash = ${hashInviteToken(token)} LIMIT 1
  `.catch(() => [])) as unknown as Row[];

  if (rows.length === 0) {
    return NextResponse.json({ error: 'This invite link is not valid.' }, { status: 404 });
  }
  const invite = rows[0];
  if (invite.revoked_at) {
    return NextResponse.json({ error: 'This invite has been withdrawn.' }, { status: 410 });
  }
  if (invite.accepted_at) {
    return NextResponse.json({ error: 'This invite has already been used.' }, { status: 410 });
  }
  if (new Date(invite.expires_at as string) < new Date()) {
    return NextResponse.json({ error: 'This invite has expired. Ask for a new one.' }, { status: 410 });
  }

  return NextResponse.json({
    fullName: invite.full_name,
    email: invite.email,
    referralCode: invite.referral_code,
  });
}

/**
 * POST /api/auth/agent-invite — accept an invite and create the agent account.
 *
 * The role and referral code come from the invite row, never from the
 * request body, so nobody can promote themselves by editing the payload.
 */
export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();
    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 });
    }
    if (String(password).length < 8) {
      return NextResponse.json({ error: 'Choose a password of at least 8 characters' }, { status: 400 });
    }

    const rows = (await db`
      SELECT id, full_name, email, referral_code, expires_at, accepted_at, revoked_at
      FROM agent_invites WHERE token_hash = ${hashInviteToken(token)} LIMIT 1
    `) as unknown as Row[];

    if (rows.length === 0) {
      return NextResponse.json({ error: 'This invite link is not valid.' }, { status: 404 });
    }
    const invite = rows[0];
    if (invite.revoked_at || invite.accepted_at || new Date(invite.expires_at as string) < new Date()) {
      return NextResponse.json({ error: 'This invite can no longer be used.' }, { status: 410 });
    }

    const email = String(invite.email).toLowerCase();
    const clash = (await db`SELECT id FROM users WHERE lower(email) = ${email} LIMIT 1`) as unknown as Row[];
    if (clash.length > 0) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Try signing in instead.' },
        { status: 409 },
      );
    }

    const passwordHash = await hash(String(password), 10);
    const created = (await db`
      INSERT INTO users (email, password_hash, full_name, role, email_verified, referral_code)
      VALUES (${email}, ${passwordHash}, ${invite.full_name}, ${ROLES.SALES_AGENT}, TRUE, ${invite.referral_code})
      RETURNING id, email, full_name, role, headline
    `) as unknown as Row[];
    const user = created[0];

    await db`
      UPDATE agent_invites
      SET accepted_at = NOW(), accepted_user_id = ${user.id}
      WHERE token_hash = ${hashInviteToken(token)}
    `;

    // Signed in immediately — they arrived from a link only they could have,
    // and the email is verified by construction since we sent them the invite.
    const jwt = await createTrackedSession(
      {
        id: String(user.id),
        email: String(user.email),
        fullName: String(user.full_name),
        role: String(user.role),
        avatarUrl: '',
        headline: '',
        emailVerified: true,
      },
      request,
    );

    const response = NextResponse.json({
      ok: true,
      referralCode: invite.referral_code,
      user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role },
    });
    response.cookies.set('vbl_session', jwt, sessionCookieOptions(request.headers.get('host')));
    return response;
  } catch (error) {
    console.error('Agent invite acceptance error:', error);
    return NextResponse.json({ error: 'Could not complete sign up' }, { status: 500 });
  }
}
