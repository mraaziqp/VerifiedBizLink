import { NextResponse } from 'next/server';
import { hub, type StudioCredits, type StudioOrder } from '@/lib/studio';
import { studioFailure, studioMember } from '@/lib/studio-route';

/** GET /api/studio/orders — the subscriber's projects, newest first, and their credit. */
export const dynamic = 'force-dynamic';

export async function GET() {
  const member = await studioMember();
  if (member instanceof NextResponse) return member;
  try {
    const data = await hub<{ orders: StudioOrder[]; credits: StudioCredits }>(`/orders?externalId=${encodeURIComponent(member.session.id)}`);
    return NextResponse.json(data);
  } catch (error) {
    // Nobody linked yet means no orders yet.
    if (error instanceof Error && /not linked/i.test(error.message)) return NextResponse.json({ orders: [], credits: null });
    return studioFailure(error);
  }
}
