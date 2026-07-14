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
    const { type } = await request.json();

    if (type === 'click') {
      await db`UPDATE ads SET clicks = clicks + 1 WHERE id = ${id}`;
    } else {
      await db`UPDATE ads SET impressions = impressions + 1 WHERE id = ${id}`;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ad tracking error:', error);
    // Tracking is best-effort — never surface an error to the ad viewer.
    return NextResponse.json({ success: false });
  }
}
