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
    const { content } = await request.json();

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });
    }

    const trimmed = content.trim().slice(0, 2000);

    const comment = await db`
      INSERT INTO post_comments (post_id, user_id, content)
      VALUES (${postId}, ${session.id}, ${trimmed})
      RETURNING id, content, created_at
    `;

    await db`UPDATE posts SET comments_count = comments_count + 1 WHERE id = ${postId}`;

    return NextResponse.json({ comment: comment[0] }, { status: 201 });
  } catch (error) {
    console.error('Comment POST error:', error);
    return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: postId } = await params;

    const comments = await db`
      SELECT 
        pc.id, pc.content, pc.created_at,
        u.full_name AS author_name,
        u.avatar_url AS author_avatar
      FROM post_comments pc
      JOIN users u ON pc.user_id = u.id
      WHERE pc.post_id = ${postId}
      ORDER BY pc.created_at ASC
      LIMIT 50
    `;

    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Comments GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}
