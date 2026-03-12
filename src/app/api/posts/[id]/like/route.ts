import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: postId } = await params;

    const existing = await db`
      SELECT id FROM post_likes WHERE post_id = ${postId} AND user_id = ${session.id}
    `;

    if (existing.length > 0) {
      await db`DELETE FROM post_likes WHERE post_id = ${postId} AND user_id = ${session.id}`;
      await db`UPDATE posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = ${postId}`;
      return NextResponse.json({ liked: false });
    } else {
      await db`INSERT INTO post_likes (post_id, user_id) VALUES (${postId}, ${session.id})`;
      await db`UPDATE posts SET likes_count = likes_count + 1 WHERE id = ${postId}`;
      return NextResponse.json({ liked: true });
    }
  } catch (error) {
    console.error('Like error:', error);
    return NextResponse.json({ error: 'Failed to toggle like' }, { status: 500 });
  }
}
