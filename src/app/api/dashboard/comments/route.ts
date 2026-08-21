import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

// GET comments for a post
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get('postId');

    if (!postId) {
      return NextResponse.json({ error: 'postId is required' }, { status: 400 });
    }

    const rows = await db`
      SELECT
        c.id,
        c.content,
        c.image_url,
        c.likes_count,
        c.created_at,
        json_build_object('id', u.id, 'full_name', u.full_name, 'avatar_url', u.avatar_url) AS users
      FROM post_comments c
      LEFT JOIN users u ON u.id = c.user_id
      WHERE c.post_id = ${postId}
      ORDER BY c.created_at DESC
    `;

    return NextResponse.json({ comments: rows });
  } catch (err) {
    console.error('Get comments error:', err);
    return NextResponse.json({ error: 'Failed to get comments' }, { status: 500 });
  }
}

// POST create comment
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { postId, content, imageUrl } = body;

    if (!postId || !content?.trim()) {
      return NextResponse.json({ error: 'postId and content are required' }, { status: 400 });
    }

    const [comment] = await db`
      INSERT INTO post_comments (post_id, user_id, content, image_url, created_at)
      VALUES (${postId}, ${session.id}, ${content.trim()}, ${imageUrl || null}, NOW())
      RETURNING id, post_id, user_id, content, image_url, created_at
    `;

    // Increment post comments count
    await db`
      UPDATE posts SET comments_count = COALESCE(comments_count, 0) + 1
      WHERE id = ${postId}
    `.catch(() => {});

    // Create notification for post owner
    const [post] = await db`SELECT user_id FROM posts WHERE id = ${postId} LIMIT 1`.catch(() => []);
    if (post?.user_id && post.user_id !== session.id) {
      await db`
        INSERT INTO notifications (user_id, type, title, content, created_at)
        VALUES (
          ${post.user_id},
          'new_comment',
          'New comment on your post',
          ${`${session.fullName || 'Someone'} commented: "${content.substring(0, 50)}..."`},
          NOW()
        )
      `.catch(() => {});
    }

    return NextResponse.json({ comment });
  } catch (err) {
    console.error('Create comment error:', err);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}

// DELETE comment
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { commentId, postId } = body;

    if (!commentId) {
      return NextResponse.json({ error: 'commentId is required' }, { status: 400 });
    }

    const [comment] = await db`SELECT user_id FROM post_comments WHERE id = ${commentId} LIMIT 1`;
    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    if (comment.user_id !== session.id && session.role !== 'admin') {
      return NextResponse.json({ error: 'You can only delete your own comments' }, { status: 403 });
    }

    await db`DELETE FROM post_comments WHERE id = ${commentId}`;

    if (postId) {
      await db`
        UPDATE posts SET comments_count = GREATEST(COALESCE(comments_count, 1) - 1, 0)
        WHERE id = ${postId}
      `.catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete comment error:', err);
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}
