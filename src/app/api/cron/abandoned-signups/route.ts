import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '@/lib/db';
import { hashOneTimeToken } from '@/lib/auth';
import { sendAbandonedSignupEmail, appUrlFromRequest } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Only nudge accounts that have been idle at least this long. */
const HOURS_BEFORE_NUDGE = 48;

/**
 * Stop chasing accounts that are simply old. Without an upper bound, the very
 * first run after deploy would email every stale account ever created.
 */
const MAX_AGE_DAYS = 14;

/** Cap per run so one invocation can't blow the SMTP rate limit or the timeout. */
const BATCH_SIZE = 40;

type Row = Record<string, unknown>;

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  // Vercel Cron signs its own requests with CRON_SECRET as a bearer token.
  // With no secret configured we refuse rather than run open to the internet.
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

/**
 * GET /api/cron/abandoned-signups
 *
 * Runs daily. Finds accounts created between 48 hours and 14 days ago that
 * never finished signing up, and sends each one a single nudge:
 *
 *   - never confirmed their email  -> a fresh verification link
 *   - confirmed but empty profile  -> a link back into onboarding
 *
 * `abandoned_email_sent_at` is stamped only after the send succeeds, so a
 * failed send leaves the user eligible for tomorrow's run instead of
 * silently dropping them.
 */
export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const baseUrl = appUrlFromRequest(request);

  try {
    const candidates = (await db`
      SELECT
        u.id, u.email, u.full_name, u.email_verified,
        b.id AS business_id, b.onboarding_completed
      FROM users u
      LEFT JOIN businesses b ON b.user_id = u.id
      WHERE u.abandoned_email_sent_at IS NULL
        AND u.role NOT IN ('admin', 'banker', 'lawyer')
        AND u.is_suspended IS NOT TRUE
        AND u.created_at < NOW() - (${HOURS_BEFORE_NUDGE} * INTERVAL '1 hour')
        AND u.created_at > NOW() - (${MAX_AGE_DAYS} * INTERVAL '1 day')
        AND (
          u.email_verified IS NOT TRUE
          OR (b.id IS NOT NULL AND b.onboarding_completed IS NOT TRUE)
        )
      ORDER BY u.created_at ASC
      LIMIT ${BATCH_SIZE}
    `) as unknown as Row[];

    let sent = 0;
    const failures: string[] = [];

    for (const row of candidates) {
      const unverified = row.email_verified !== true;
      const firstName = String(row.full_name || '').split(' ')[0];

      try {
        let token: string | undefined;
        if (unverified) {
          // Their original token is very likely expired by now, so mint a
          // fresh one. This also invalidates the old link, which is fine —
          // the new email is the one they'll act on.
          token = crypto.randomBytes(32).toString('hex');
          const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          await db`
            UPDATE users
            SET email_verification_token = ${hashOneTimeToken(token)},
                email_verification_token_expires_at = ${expires.toISOString()},
                updated_at = NOW()
            WHERE id = ${row.id}
          `;
        }

        await sendAbandonedSignupEmail(
          String(row.email),
          firstName,
          unverified ? 'unverified' : 'incomplete_profile',
          token,
          baseUrl
        );

        await db`UPDATE users SET abandoned_email_sent_at = NOW() WHERE id = ${row.id}`;
        sent += 1;
      } catch (error) {
        console.error('Abandoned-signup nudge failed for', row.email, error);
        failures.push(String(row.email));
      }
    }

    return NextResponse.json({
      ok: true,
      considered: candidates.length,
      sent,
      failed: failures.length,
    });
  } catch (error) {
    console.error('Abandoned-signups cron error:', error);
    return NextResponse.json({ error: 'Cron run failed' }, { status: 500 });
  }
}
