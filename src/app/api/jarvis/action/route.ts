import { NextRequest, NextResponse } from 'next/server';
import { authoriseJarvis } from '@/lib/jarvis';
import { runJarvisAction } from '@/lib/jarvis-data';

/**
 * POST /api/jarvis/action { action, payload } or { actions: [{ action, payload }, ...] }
 * Batched actions run in order and report one by one; one failing does not stop the rest.
 */
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = authoriseJarvis(request);
  if (auth !== true) return auth;
  const body = (await request.json().catch(() => ({}))) as { action?: string; payload?: Record<string, unknown>; actions?: Array<{ action?: string; payload?: Record<string, unknown> }> };
  if (Array.isArray(body.actions)) {
    if (!body.actions.length || body.actions.length > 20) return NextResponse.json({ error: 'Send between 1 and 20 actions.' }, { status: 400 });
    const results = [];
    for (const item of body.actions) results.push(await runJarvisAction(item.action ?? '', item.payload ?? {}));
    const ok = results.every((r) => r.ok);
    return NextResponse.json({ ok, results }, { status: ok ? 200 : 207 });
  }
  if (!body.action) return NextResponse.json({ error: 'Send { action, payload } or { actions: [...] }.' }, { status: 400 });
  const outcome = await runJarvisAction(body.action, body.payload ?? {});
  return NextResponse.json(outcome, { status: outcome.ok ? 200 : 400 });
}
