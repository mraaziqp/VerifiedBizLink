import { NextRequest, NextResponse } from 'next/server';
import { hub } from '@/lib/studio';
import { studioFailure, studioMember } from '@/lib/studio-route';

/** POST /api/studio/orders/:id/message { text } — write to the studio about this project. */
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const member = await studioMember();
  if (member instanceof NextResponse) return member;
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { text?: unknown };
  try {
    return NextResponse.json(
      await hub(`/orders/${encodeURIComponent(id.slice(0, 80))}/message`, { method: 'POST', body: { externalId: member.session.id, text: String(body.text ?? '').slice(0, 2000) } }),
    );
  } catch (error) {
    return studioFailure(error, 'Could not send the message.');
  }
}
