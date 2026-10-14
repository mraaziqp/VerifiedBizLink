import { NextRequest, NextResponse } from 'next/server';
import { authoriseJarvis } from '@/lib/jarvis';
import { jarvisEvents } from '@/lib/jarvis-data';

/** GET /api/jarvis/events?since=<ms>&limit= — poll with the newest `at` seen. */
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = authoriseJarvis(request);
  if (auth !== true) return auth;
  const since = Number(request.nextUrl.searchParams.get('since') ?? '');
  const limit = Math.min(200, Math.max(1, Number(request.nextUrl.searchParams.get('limit') ?? '') || 100));
  const events = await jarvisEvents(Number.isFinite(since) ? since : null, limit);
  return NextResponse.json({ events, latestAt: events[0]?.at ?? null, count: events.length }, { headers: { 'Cache-Control': 'no-store' } });
}
