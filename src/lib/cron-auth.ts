import { NextResponse, type NextRequest } from 'next/server';

/**
 * Authenticates a scheduled-job call (GitHub Actions → /api/cron/*).
 *
 * Returns null when the call may proceed, or the response to send.
 *
 *   503  this deployment has no CRON_SECRET — set it in Amplify and redeploy
 *   401  a secret was sent but it does not match this deployment's
 *
 * The two used to be one 401, so a job that had failed every hour since it
 * was created looked the same whether the app or GitHub was misconfigured.
 * Saying "not configured" reveals nothing usable: the route still refuses.
 */
export function cronAuthError(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: 'CRON_SECRET is not configured on this deployment. Set it in AWS Amplify → Environment variables and redeploy.' },
      { status: 503 },
    );
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json(
      { error: 'Unauthorized: the CRON_SECRET sent does not match this deployment.' },
      { status: 401 },
    );
  }
  return null;
}
