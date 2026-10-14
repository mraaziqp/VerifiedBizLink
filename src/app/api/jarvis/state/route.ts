import { NextRequest, NextResponse } from 'next/server';
import { authoriseJarvis } from '@/lib/jarvis';
import { jarvisState, STATE_SECTIONS, type StateSection } from '@/lib/jarvis-data';

/** GET /api/jarvis/state?include=summary,studio — see /api/jarvis/schema. */
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = authoriseJarvis(request);
  if (auth !== true) return auth;
  const asked = request.nextUrl.searchParams.get('include');
  const include = new Set<StateSection>(
    asked ? asked.split(',').map((s) => s.trim()).filter((s): s is StateSection => (STATE_SECTIONS as readonly string[]).includes(s)) : STATE_SECTIONS,
  );
  return NextResponse.json(await jarvisState(include), { headers: { 'Cache-Control': 'no-store' } });
}
