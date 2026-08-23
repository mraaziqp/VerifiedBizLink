import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { resolveAgent, logAgentActivity } from '@/lib/agents';
import db from '@/lib/db';

type Row = Record<string, unknown>;

/**
 * The advisor's referral code, entered at the point of paying.
 *
 * Attribution normally happens at signup, but plenty of businesses sign
 * themselves up first and only meet an advisor later — or sign up through one
 * marketer's tablet and forget to say so. Without this the advisor who
 * actually closed the sale has no way to be credited for it.
 *
 * FIRST ATTRIBUTION WINS. Once a business is credited to somebody, a code
 * entered later cannot move it. Otherwise the last advisor to get a code in
 * front of the customer would take a commission earned by the first, and
 * there would be no record that it had happened.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = (await db`
    SELECT b.assisted_by_user_id, b.referral_code, b.attribution_source,
           u.full_name AS agent_name
    FROM businesses b
    LEFT JOIN users u ON u.id = b.assisted_by_user_id
    WHERE b.user_id = ${session.id}
    LIMIT 1
  `.catch(() => [])) as unknown as Row[];

  if (rows.length === 0) {
    return NextResponse.json({ attributed: false, agentName: null, code: null });
  }

  return NextResponse.json({
    attributed: rows[0].assisted_by_user_id !== null,
    agentName: rows[0].agent_name ?? null,
    code: rows[0].referral_code ?? null,
    source: rows[0].attribution_source ?? null,
  });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { code } = await request.json();
    const entered = String(code ?? '').trim();
    if (!entered) {
      return NextResponse.json({ error: 'Enter the advisor’s referral code' }, { status: 400 });
    }

    const businesses = (await db`
      SELECT id, company_name, assisted_by_user_id
      FROM businesses WHERE user_id = ${session.id} LIMIT 1
    `.catch(() => [])) as unknown as Row[];

    if (businesses.length === 0) {
      return NextResponse.json(
        { error: 'You need a business profile before adding a referral code.' },
        { status: 404 },
      );
    }
    const business = businesses[0];

    if (business.assisted_by_user_id) {
      const [existing] = (await db`
        SELECT full_name FROM users WHERE id = ${business.assisted_by_user_id} LIMIT 1
      `.catch(() => [])) as unknown as Row[];
      return NextResponse.json(
        {
          error: `This business is already credited to ${existing?.full_name ?? 'an advisor'}. Contact support if that is wrong.`,
        },
        { status: 409 },
      );
    }

    const agent = await resolveAgent(entered);
    if (!agent) {
      return NextResponse.json(
        { error: "We couldn't find that referral code. Check it with your advisor." },
        { status: 404 },
      );
    }

    // An advisor cannot credit their own business to themselves — the
    // commission engine excludes self-registrations anyway, so accepting it
    // here would only produce a number that later silently disappears.
    if (agent.id === session.id) {
      return NextResponse.json(
        { error: 'You cannot use your own referral code on your own business.' },
        { status: 400 },
      );
    }

    await db`
      UPDATE businesses
      SET assisted_by_user_id = ${agent.id},
          assisted_by         = ${agent.fullName},
          assisted_signup     = TRUE,
          referral_code       = ${agent.referralCode},
          attribution_source  = 'referral_at_purchase',
          updated_at          = NOW()
      WHERE id = ${business.id}
        AND assisted_by_user_id IS NULL
    `;

    await logAgentActivity(
      agent.id,
      'referral_applied',
      `${business.company_name} entered your referral code at checkout`,
      String(business.id),
    ).catch(() => {});

    await db`
      INSERT INTO notifications (user_id, title, content, link)
      VALUES (
        ${agent.id},
        'A business used your referral code',
        ${`${business.company_name} added your code at checkout. Their payment will count towards your commission.`},
        '/agent'
      )
    `.catch(() => {});

    return NextResponse.json({
      ok: true,
      agentName: agent.fullName,
      message: `Thanks — this purchase will be credited to ${agent.fullName}.`,
    });
  } catch (error) {
    console.error('Referral attribution error:', error);
    return NextResponse.json({ error: 'Could not apply that referral code' }, { status: 500 });
  }
}
