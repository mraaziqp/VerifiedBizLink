import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { logAction, logError, LOG_ACTIONS, LOG_RESOURCES } from '@/lib/audit-logger';

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

    const post = await db`SELECT user_id FROM posts WHERE id = ${id}`;
    if (!post || post.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    if (post[0].user_id !== session.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await db`DELETE FROM posts WHERE id = ${id}`;

    // Log the deletion
    await logAction(
      session.id,
      LOG_ACTIONS.POST_DELETED,
      LOG_RESOURCES.POST,
      id,
      null,
      null,
      `Post deleted by user`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Post DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}

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
    if (content.trim().length > 5000) {
      return NextResponse.json({ error: 'Post too long (max 5000 characters)' }, { status: 400 });
    }

    const post = await db`SELECT user_id FROM posts WHERE id = ${id}`;
    if (!post || post.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    if (post[0].user_id !== session.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const updated = await db`
      UPDATE posts
      SET content = ${content.trim()}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, content, likes_count, comments_count, created_at
    `;

    // Log the update
    await logAction(
      session.id,
      LOG_ACTIONS.POST_UPDATED,
      LOG_RESOURCES.POST,
      id,
      { content: post[0].content },
      { content: content.trim() },
      `Post content updated`
    );

    return NextResponse.json({ post: updated[0] });
  } catch (error) {
    console.error('Post PUT error:', error);
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}
