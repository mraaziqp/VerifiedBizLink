import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

// GET /api/messages/search?q=... — find users/businesses to start a chat with
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const q = (request.nextUrl.searchParams.get('q') || '').trim();
  if (q.length < 2) return NextResponse.json({ results: [] });

  const like = `%${q}%`;
  try {
    const results = await db`
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.role,
        u.avatar_url,
        b.company_name
      FROM users u
      LEFT JOIN businesses b ON b.user_id = u.id
      WHERE u.id <> ${session.id}
        AND (
          u.full_name ILIKE ${like}
          OR u.email ILIKE ${like}
          OR b.company_name ILIKE ${like}
        )
      ORDER BY u.full_name
      LIMIT 12
    `;
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Message search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
