import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const users = await db`
      SELECT id, email, full_name, headline, location, bio, phone, avatar_url, role, vetting_score, connections_count
      FROM users
      WHERE id = ${session.id}
    `;

    if (!users.length) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const u = users[0];
    return NextResponse.json({
      id: u.id,
      email: u.email,
      fullName: u.full_name,
      headline: u.headline || '',
      location: u.location || '',
      bio: u.bio || '',
      phone: u.phone || '',
      avatarUrl: u.avatar_url || '',
      role: u.role,
      vettingScore: u.vetting_score ?? 0,
      connectionsCount: u.connections_count ?? 0,
    });
  } catch (error) {
    console.error('Profile GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { headline, location, bio, phone } = await request.json();

    const updated = await db`
      UPDATE users SET
        headline = ${headline || ''},
        location = ${location || ''},
        bio = ${bio || ''},
        phone = ${phone || ''},
        updated_at = NOW()
      WHERE id = ${session.id}
      RETURNING id, email, full_name, headline, location, bio, phone, avatar_url, role, vetting_score, connections_count
    `;

    if (!updated.length) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const u = updated[0];
    return NextResponse.json({
      id: u.id,
      email: u.email,
      fullName: u.full_name,
      headline: u.headline || '',
      location: u.location || '',
      bio: u.bio || '',
      phone: u.phone || '',
      avatarUrl: u.avatar_url || '',
      role: u.role,
      vettingScore: u.vetting_score ?? 0,
      connectionsCount: u.connections_count ?? 0,
    });
  } catch (error) {
    console.error('Profile POST error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
