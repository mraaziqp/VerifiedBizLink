import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { ROLES, SUPER_ADMIN_ROLES, hasRole } from '@/lib/roles';
import {
  getAgentSummaries, allocateReferralCode, generateInviteToken, hashInviteToken,
  referralLink, referralQrUrl, INVITE_TTL_DAYS,
} from '@/lib/agents';
import { appUrlFromRequest } from '@/lib/email';
import db from '@/lib/db';

type Row = Record<string, unknown>;

/**
 * GET /api/admin/agents — the affiliate programme dashboard.
 *
 * Returns every agent with their referral code, link, QR image, production
 * figures and outstanding commission, plus any invites not yet accepted.
 *
 * Restricted to Super Admin. Commission figures are payout data: a sales
 * agent must never see another agent's numbers, and the broader staff roles
 * have no reason to.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!hasRole(session?.role, SUPER_ADMIN_ROLES)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const baseUrl = appUrlFromRequest(request);
    const agents = await getAgentSummaries();

    const invites = (await db`
      SELECT id, full_name, email, referral_code, created_by_name,
             expires_at, accepted_at, revoked_at, created_at
      FROM agent_invites
      WHERE accepted_at IS NULL AND revoked_at IS NULL AND expires_at > NOW()
      ORDER BY created_at DESC
    `.catch(() => [])) as unknown as Row[];

    return NextResponse.json({
      agents: agents.map((a) => ({
        ...a,
        link: a.referralCode ? referralLink(baseUrl, a.referralCode) : null,
        qrUrl: a.referralCode ? referralQrUrl(referralLink(baseUrl, a.referralCode)) : null,
      })),
      pendingInvites: invites.map((i) => ({
        id: i.id,
        fullName: i.full_name,
        email: i.email,
        referralCode: i.referral_code,
        invitedBy: i.created_by_name || 'Unknown',
        expiresAt: i.expires_at,
        createdAt: i.created_at,
      })),
    });
  } catch (error) {
    console.error('Agent dashboard error:', error);
    return NextResponse.json({ error: 'Failed to load agents' }, { status: 500 });
  }
}

/**
 * POST /api/admin/agents — invite a newly hired marketer.
 *
 * Creates a single-use invite carrying a pre-allocated referral code. The raw
 * token is returned exactly once, in this response, and only its hash is
 * stored — the same handling as a password-reset token, so a database leak
 * cannot be replayed into free agent accounts.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!hasRole(session?.role, SUPER_ADMIN_ROLES)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { fullName, email } = await request.json();
    const name = String(fullName || '').trim();
    const mail = String(email || '').trim().toLowerCase();

    if (!name || !mail) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) {
      return NextResponse.json({ error: 'That email address does not look valid' }, { status: 400 });
    }

    const existing = (await db`
      SELECT id, role FROM users WHERE lower(email) = ${mail} LIMIT 1
    `) as unknown as Row[];
    if (existing.length > 0) {
      return NextResponse.json(
        {
          error:
            existing[0].role === ROLES.SALES_AGENT
              ? 'That person already has an agent account.'
              : 'An account with that email already exists. Change their role in User Management instead.',
        },
        { status: 409 },
      );
    }

    const rawToken = generateInviteToken();
    const code = await allocateReferralCode();
    const expires = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

    await db`
      INSERT INTO agent_invites (
        token_hash, full_name, email, referral_code,
        created_by, created_by_name, expires_at
      ) VALUES (
        ${hashInviteToken(rawToken)}, ${name}, ${mail}, ${code},
        ${session!.id}, ${session!.fullName || session!.email}, ${expires.toISOString()}
      )
    `;

    const baseUrl = appUrlFromRequest(request);
    return NextResponse.json({
      ok: true,
      // Shown once. There is deliberately no way to retrieve it later —
      // revoke and re-invite instead.
      inviteUrl: `${baseUrl}/agent-invite/${rawToken}`,
      referralCode: code,
      referralLink: referralLink(baseUrl, code),
      expiresAt: expires.toISOString(),
    });
  } catch (error) {
    console.error('Agent invite error:', error);
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
  }
}
