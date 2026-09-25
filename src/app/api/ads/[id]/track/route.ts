import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// POST /api/ads/[id]/track  { type: 'impression' | 'click' }
// Deliberately public/unauthenticated (anonymous visitors see and click
// ads) and fire-and-forget from the client — never blocks the ad UI.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { type } = await request.json().catch(() => ({}));
    // A malformed id made Postgres throw on every call; and only live ads
    // should accumulate stats a business is judging its spend by.
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ success: false });
    }

    if (type === 'click') {
      await db`UPDATE ads SET clicks = COALESCE(clicks, 0) + 1 WHERE id = ${id} AND is_active = true`;
    } else if (type === 'impression') {
      await db`UPDATE ads SET impressions = COALESCE(impressions, 0) + 1 WHERE id = ${id} AND is_active = true`;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ad tracking error:', error);
    // Tracking is best-effort — never surface an error to the ad viewer.
    return NextResponse.json({ success: false });
  }
}
