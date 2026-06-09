import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { logAction, LOG_ACTIONS, LOG_RESOURCES } from '@/lib/audit-logger';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const { content } = await request.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }
    if (content.trim().length > 2000) {
      return NextResponse.json({ error: 'Comment too long (max 2000 characters)' }, { status: 400 });
    }

    // Check if user owns this comment
    const comment = await db`SELECT user_id, content FROM post_comments WHERE id = ${id}`;
    if (!comment || comment.length === 0) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }
    if (comment[0].user_id !== session.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const updated = await db`
      UPDATE post_comments
      SET content = ${content.trim()}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, content, created_at, updated_at
    `;

    // Log the update
    await logAction(
      session.id,
      LOG_ACTIONS.COMMENT_UPDATED,
      LOG_RESOURCES.COMMENT,
      id,
      { content: comment[0].content },
      { content: content.trim() },
      `Comment updated`
    );

    return NextResponse.json({ comment: updated[0] });
  } catch (error) {
    console.error('Comment PUT error:', error);
    return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    // Check if user owns this comment and get post_id
    const comment = await db`SELECT user_id, post_id FROM post_comments WHERE id = ${id}`;
    if (!comment || comment.length === 0) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }
    if (comment[0].user_id !== session.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const postId = comment[0].post_id;

    // Delete the comment
    await db`DELETE FROM post_comments WHERE id = ${id}`;

    // Update post comments count
    await db`UPDATE posts SET comments_count = comments_count - 1 WHERE id = ${postId}`;

    // Log the deletion
    await logAction(
      session.id,
      LOG_ACTIONS.COMMENT_DELETED,
      LOG_RESOURCES.COMMENT,
      id,
      null,
      null,
      `Comment deleted by user`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Comment DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}
