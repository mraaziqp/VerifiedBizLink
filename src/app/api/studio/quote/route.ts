import { NextRequest, NextResponse } from 'next/server';
import { hub } from '@/lib/studio';
import { studioFailure, studioMember } from '@/lib/studio-route';

/** POST /api/studio/quote { itemId, useCredits } — the price, the credit that would go towards it and what is left to pay. */
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const member = await studioMember();
  if (member instanceof NextResponse) return member;
  const body = (await request.json().catch(() => ({}))) as { itemId?: unknown; useCredits?: unknown };
  try {
    const quote = await hub('/quote', {
      method: 'POST',
      body: { externalId: member.session.id, itemId: String(body.itemId ?? ''), tier: member.access.tier, useCredits: body.useCredits !== false },
    });
    return NextResponse.json(quote);
  } catch (error) {
    return studioFailure(error);
  }
}
