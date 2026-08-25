import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { AGENT_PORTAL_ROLES, hasRole } from '@/lib/roles';
import db from '@/lib/db';

type Row = Record<string, unknown>;

/**
 * GET /api/agent/profile — the agent's own details.
 * PUT — update them.
 *
 * Scoped to the signed-in agent throughout: the id is taken from the session
 * and never from the request, so there is no way to edit somebody else by
 * changing a field in the payload.
 *
 * Deliberately excludes anything commercial. Commission rate, referral code,
 * suspension and admin notes are set by admins, not by the agent whose pay
 * they determine.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!hasRole(session?.role, AGENT_PORTAL_ROLES)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rows = (await db`
      SELECT id, full_name, email, phone, location, headline, bio,
             bank_name, account_number, account_type, branch_code, account_holder_name,
             referral_code, commission_rate_override, created_at
      FROM users WHERE id = ${session!.id} LIMIT 1
    `) as unknown as Row[];

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    const u = rows[0];

    return NextResponse.json({
      profile: {
        fullName: u.full_name ?? '',
        email: u.email ?? '',
        phone: u.phone ?? '',
        location: u.location ?? '',
        headline: u.headline ?? '',
        bio: u.bio ?? '',
      },
      bankingDetails: {
        bankName: u.bank_name ?? '',
        accountNumber: u.account_number ?? '',
        accountType: u.account_type ?? 'Cheque / Current',
        branchCode: u.branch_code ?? '',
        accountHolderName: u.account_holder_name ?? '',
      },
      // Read-only context so the agent can see it without being able to edit it.
      readOnly: {
        referralCode: u.referral_code ?? null,
        joinedAt: u.created_at ?? null,
        hasNegotiatedRate:
          u.commission_rate_override !== null && u.commission_rate_override !== undefined,
      },
    });
  } catch (error) {
    console.error('Agent profile read error:', error);
    return NextResponse.json({ error: 'Failed to load your details' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!hasRole(session?.role, AGENT_PORTAL_ROLES)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const {
      fullName, phone, location, headline, bio,
      bankName, accountNumber, accountType, branchCode, accountHolderName,
    } = await request.json();

    const name = String(fullName ?? '').trim();
    if (name.length < 2) {
      return NextResponse.json({ error: 'Please enter your full name' }, { status: 400 });
    }

    // Loose on purpose: South African numbers get written +27, 0, with spaces
    // and dashes. Rejecting valid formats is worse than accepting a typo an
    // admin can see and fix.
    const tel = String(phone ?? '').trim();
    if (tel && !/^[0-9+()\s-]{6,20}$/.test(tel)) {
      return NextResponse.json({ error: 'That phone number does not look right' }, { status: 400 });
    }

    await db`
      UPDATE users
      SET full_name = ${name},
          phone     = ${tel || null},
          location  = ${String(location ?? '').trim().slice(0, 120) || null},
          headline  = ${String(headline ?? '').trim().slice(0, 160) || null},
          bio       = ${String(bio ?? '').trim().slice(0, 1000) || null},
          bank_name = ${String(bankName ?? '').trim().slice(0, 80) || null},
          account_number = ${String(accountNumber ?? '').trim().slice(0, 30) || null},
          account_type = ${String(accountType ?? '').trim().slice(0, 40) || null},
          branch_code = ${String(branchCode ?? '').trim().slice(0, 20) || null},
          account_holder_name = ${String(accountHolderName ?? '').trim().slice(0, 120) || null},
          updated_at = NOW()
      WHERE id = ${session!.id}
    `;

    // The name is shown to businesses on the signup page ("Referred by ..."),
    // so a change here is worth having in the activity trail.
    await db`
      INSERT INTO agent_activity_log (agent_id, event_type, description, metadata)
      VALUES (${session!.id}, 'profile_updated', 'Updated contact & banking details', '{}'::jsonb)
    `.catch(() => {});

    return NextResponse.json({ ok: true, message: 'Your details and banking information have been saved.' });
  } catch (error) {
    console.error('Agent profile update error:', error);
    return NextResponse.json({ error: 'Could not save your details' }, { status: 500 });
  }
}
