import { NextRequest, NextResponse } from 'next/server';
import { authoriseJarvis } from '@/lib/jarvis';
import { JARVIS_ACTIONS, STATE_SECTIONS } from '@/lib/jarvis-data';
import { CANONICAL_ORIGIN } from '@/lib/site-url';

/** GET /api/jarvis/schema — what VerifiedBizLink is, what Jarvis can read here and every action he can take. */
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = authoriseJarvis(request);
  if (auth !== true) return auth;
  return NextResponse.json({
    app: {
      name: 'VerifiedBizLink',
      origin: CANONICAL_ORIGIN,
      about:
        'A trust network for South African businesses: verified profiles, vetting, subscriptions (verified, standard, premium, enterprise) and ads. Its Build Studio sells ARP Cloud Solutions websites, apps and games to paying members: 80% to ARP, 20% to VerifiedBizLink.',
    },
    authentication: { header: 'x-jarvis-key', alternative: 'Authorization: Bearer <key>' },
    endpoints: [
      { method: 'GET', path: '/api/jarvis/ping', description: 'Check the key works.' },
      { method: 'GET', path: '/api/jarvis/schema', description: 'This document.' },
      {
        method: 'GET',
        path: '/api/jarvis/state',
        description:
          'Snapshot: members and businesses (paying subscribers by plan, renewals overdue, revenue in the last 30 days); the Build Studio (open or not, member prices, monthly credit, this month’s sales and VerifiedBizLink’s earnings); recent businesses, payments and sign-ups.',
        query: `include=${STATE_SECTIONS.join(',')}`,
      },
      { method: 'GET', path: '/api/jarvis/events', description: 'Sign-ups, payments and studio changes since a moment, newest first.', query: 'since=<ms>&limit=<1-200>' },
      { method: 'POST', path: '/api/jarvis/action', description: 'Run one action, or a batch: { action, payload } or { actions: [...] }.' },
    ],
    actions: Object.entries(JARVIS_ACTIONS).map(([name, action]) => ({ name, description: action.description, payload: action.payload })),
  });
}
