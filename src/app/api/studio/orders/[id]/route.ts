import { NextRequest, NextResponse } from 'next/server';
import { hub, type StudioOrder } from '@/lib/studio';
import { studioFailure, studioMember } from '@/lib/studio-route';

/**
 * GET    /api/studio/orders/:id — one project: progress, preview, history, messages, receipts.
 * DELETE /api/studio/orders/:id — give up an unpaid order (its credit goes back).
 */
export const dynamic = 'force-dynamic';

const safeId = (id: string) => encodeURIComponent(id.slice(0, 80));

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const member = await studioMember();
  if (member instanceof NextResponse) return member;
  const { id } = await context.params;
  try {
    return NextResponse.json(await hub<{ order: StudioOrder }>(`/orders/${safeId(id)}?externalId=${encodeURIComponent(member.session.id)}`));
  } catch (error) {
    return studioFailure(error);
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const member = await studioMember();
  if (member instanceof NextResponse) return member;
  const { id } = await context.params;
  try {
    return NextResponse.json(await hub(`/orders/${safeId(id)}?externalId=${encodeURIComponent(member.session.id)}`, { method: 'DELETE' }));
  } catch (error) {
    return studioFailure(error, 'Could not cancel it.');
  }
}
