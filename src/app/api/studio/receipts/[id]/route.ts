import { NextRequest, NextResponse } from 'next/server';
import { hub } from '@/lib/studio';
import { studioFailure, studioMember } from '@/lib/studio-route';

/** GET /api/studio/receipts/:id — a payment receipt for one of the subscriber's projects. */
export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const member = await studioMember();
  if (member instanceof NextResponse) return member;
  const { id } = await context.params;
  try {
    return NextResponse.json(await hub(`/receipts/${encodeURIComponent(id.slice(0, 80))}?externalId=${encodeURIComponent(member.session.id)}`));
  } catch (error) {
    return studioFailure(error);
  }
}
