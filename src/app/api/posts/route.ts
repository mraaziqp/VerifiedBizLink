import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    const posts = await db`
      SELECT
        p.id, p.user_id, p.content, p.image_url, p.video_url,
        p.likes_count, p.comments_count, p.created_at,
        u.full_name AS author_name,
        u.avatar_url AS author_avatar,
        u.headline AS author_headline,
        b.id AS business_id,
        b.company_name,
        b.status AS business_status,
        b.trust_score,
        CASE WHEN pl.id IS NOT NULL THEN TRUE ELSE FALSE END AS is_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN businesses b ON b.user_id = p.user_id
      LEFT JOIN post_likes pl ON pl.post_id = p.id AND pl.user_id = ${session?.id ?? null}
      ORDER BY p.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return NextResponse.json({ posts });
  } catch (error) {
    console.error('Posts GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content, image_url, video_url } = await request.json();
    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }
    if (content.trim().length > 5000) {
      return NextResponse.json({ error: 'Post too long (max 5000 characters)' }, { status: 400 });
    }

    const newPost = await db`
      INSERT INTO posts (user_id, content, image_url, video_url)
      VALUES (${session.id}, ${content.trim()}, ${image_url || null}, ${video_url || null})
      RETURNING id, content, image_url, video_url, likes_count, comments_count, created_at
    `;

    // Audit logging must never break post creation.
    try {
      await db`
        INSERT INTO audit_logs (admin_id, admin_name, action, target_type, target_name)
        VALUES (${session.id}, ${session.fullName}, 'Created Post', 'post', ${'Post by ' + session.fullName})
      `;
    } catch (e) {
      console.error('Audit log (post) failed:', e);
    }

    return NextResponse.json({ post: newPost[0] }, { status: 201 });
  } catch (error) {
    console.error('Posts POST error:', error);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}
