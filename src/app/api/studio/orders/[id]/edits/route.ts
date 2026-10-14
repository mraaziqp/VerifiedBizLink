import { NextRequest, NextResponse } from 'next/server';
import { hub } from '@/lib/studio';
import { studioFailure, studioMember } from '@/lib/studio-route';

/**
 * POST /api/studio/orders/:id/edits { patch?, sections?, note? } — change the
 * finished site: its words, colours, contact details and sections, or anything
 * bigger in a sentence. It is remade and shows at the same link in minutes.
 */
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const member = await studioMember();
  if (member instanceof NextResponse) return member;
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const result = await hub(`/orders/${encodeURIComponent(id.slice(0, 80))}/edits`, {
      method: 'POST',
      body: { externalId: member.session.id, patch: body.patch, sections: body.sections, note: body.note },
    });
    return NextResponse.json(result);
  } catch (error) {
    return studioFailure(error, 'Could not send the change.');
  }
}
