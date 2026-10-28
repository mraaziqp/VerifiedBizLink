import { NextRequest, NextResponse } from 'next/server';
import { hub } from '@/lib/studio';
import { studioFailure, studioMember } from '@/lib/studio-route';
import { cleanDbKeys } from '@/lib/db-platforms';

/**
 * POST /api/studio/orders/:id/database { platform, values } — connect the
 * finished app to the member's own database: its public keys go to the studio,
 * which puts them in the app and rebuilds it. Secret keys are refused here and
 * again at the hub.
 */
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const member = await studioMember();
  if (member instanceof NextResponse) return member;
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const clean = cleanDbKeys(body.platform, body.values);
  if (!clean.ok) return NextResponse.json({ error: clean.error }, { status: 400 });
  try {
    const result = await hub(`/orders/${encodeURIComponent(id.slice(0, 80))}/database`, {
      method: 'POST',
      body: { externalId: member.session.id, platform: clean.platform, values: clean.values },
    });
    return NextResponse.json(result);
  } catch (error) {
    return studioFailure(error, 'Could not connect the database.');
  }
}
