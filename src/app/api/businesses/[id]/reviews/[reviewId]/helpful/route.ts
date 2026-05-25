import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

// POST /api/businesses/[id]/reviews/[reviewId]/helpful — mark a review as helpful
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; reviewId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Must be signed in' }, { status: 401 });
    }

    const { reviewId } = await params;

    await db`
      UPDATE business_reviews
      SET helpful_count = helpful_count + 1
      WHERE id = ${reviewId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark helpful error:', error);
    return NextResponse.json({ error: 'Failed to mark as helpful' }, { status: 500 });
  }
}
