import { NextRequest, NextResponse } from 'next/server';
import { authoriseJarvis } from '@/lib/jarvis';
import { studioConfigured } from '@/lib/studio';
import { CANONICAL_ORIGIN } from '@/lib/site-url';

/** GET /api/jarvis/ping — Jarvis checking he can reach VerifiedBizLink with his key. */
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = authoriseJarvis(request);
  if (auth !== true) return auth;
  return NextResponse.json({
    status: 'ok',
    connected: true,
    app: { name: 'VerifiedBizLink', origin: CANONICAL_ORIGIN },
    studio: { connected: studioConfigured() },
    events: { pushing: Boolean(process.env.JARVIS_WEBHOOK_URL) },
    timestamp: Date.now(),
  });
}
