import { createHash, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Jarvis (the owner's assistant, Second-Brain) and VerifiedBizLink.
 *
 * Two ways, both optional and both off until their variable is set:
 *
 *   JARVIS_API_KEY      Jarvis reads and acts here: /api/jarvis/{ping,schema,state,events,action},
 *                       with this key in x-jarvis-key (or Authorization: Bearer).
 *   JARVIS_WEBHOOK_URL  This app tells Jarvis when something happens (a studio order,
 *                       credit given, a monthly run that failed): his universal webhook,
 *                       https://<jarvis>/api/assistant/webhook/jb_live_sk_…, from
 *                       Second-Brain's "connect an app".
 */

const digest = (value: string) => createHash('sha256').update(value).digest();

/** The request carries the Jarvis key, or the response to send instead. */
export function authoriseJarvis(request: NextRequest): true | NextResponse {
  const expected = process.env.JARVIS_API_KEY?.trim() ?? '';
  if (expected.length < 24) {
    return NextResponse.json({ error: 'Jarvis is not connected to this app (JARVIS_API_KEY is not set).' }, { status: 503 });
  }
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const given = (request.headers.get('x-jarvis-key') ?? bearer).trim();
  if (!given || !timingSafeEqual(digest(given), digest(expected))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return true;
}

export type JarvisSeverity = 'info' | 'notice' | 'warn' | 'critical';

/**
 * Tells Jarvis about one event. Best-effort and quick: a missing or slow
 * Jarvis never holds up or fails what the user was doing.
 */
export async function notifyJarvis(event: { type: string; title: string; body?: string; severity?: JarvisSeverity; entityId?: string; url?: string }) {
  const url = process.env.JARVIS_WEBHOOK_URL?.trim();
  if (!url || !/^https:\/\//.test(url)) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'VerifiedBizLink',
        type: event.type,
        title: event.title,
        body: event.body ?? '',
        severity: event.severity ?? 'info',
        entityId: event.entityId,
        url: event.url,
        at: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    /* Jarvis is optional */
  }
}
