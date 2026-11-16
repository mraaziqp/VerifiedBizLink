import { NextRequest, NextResponse } from 'next/server';
import { cronAuthError } from '@/lib/cron-auth';
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

/**
 * Stop starting new sends after this long. The hosting gateway cuts a request
 * off at about 30 seconds (the first run, with a backlog, answered 504), so a
 * run sends what fits and the next hourly run carries on. Each person is
 * stamped as they are emailed, so nobody is ever sent two nudges.
 */
const TIME_BUDGET_MS = 18_000;

/** Sends in flight at once: a few, to stay polite to the SMTP server. */
const CONCURRENCY = 4;

type Row = Record<string, unknown>;

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
  const denied = cronAuthError(request);
  if (denied) return denied;

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
    const startedAt = Date.now();
    let next = 0;

    const nudge = async (row: Row) => {
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
    };

    // A few workers pull from the list until it is empty or the time budget
    // is spent; whoever is left goes out on the next run.
    const worker = async () => {
      while (next < candidates.length && Date.now() - startedAt < TIME_BUDGET_MS) {
        await nudge(candidates[next++]);
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    return NextResponse.json({
      ok: true,
      considered: candidates.length,
      sent,
      failed: failures.length,
      deferred: candidates.length - next,
    });
  } catch (error) {
    console.error('Abandoned-signups cron error:', error);
    return NextResponse.json({ error: 'Cron run failed' }, { status: 500 });
  }
}
