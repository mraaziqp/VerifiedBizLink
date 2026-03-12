import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const posts = await db`
      SELECT 
        p.id, p.user_id, p.content, p.likes_count, p.comments_count, p.created_at,
        u.full_name AS author_name,
        u.avatar_url AS author_avatar,
        u.headline AS author_headline,
        b.company_name,
        b.status AS business_status,
        b.trust_score
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN businesses b ON b.user_id = p.user_id
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

    const { content } = await request.json();
    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const newPost = await db`
      INSERT INTO posts (user_id, content)
      VALUES (${session.id}, ${content.trim()})
      RETURNING id, content, likes_count, comments_count, created_at
    `;

    await db`
      INSERT INTO audit_logs (admin_id, admin_name, action, target_type, target_name)
      VALUES (${session.id}, ${session.fullName}, 'Created Post', 'post', ${'Post by ' + session.fullName})
    `;

    return NextResponse.json({ post: newPost[0] }, { status: 201 });
  } catch (error) {
    console.error('Posts POST error:', error);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}
