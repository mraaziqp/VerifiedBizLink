import { NextRequest, NextResponse } from 'next/server';
import { getSession, createSession } from '@/lib/auth';
import db from '@/lib/db';
import { hash, compare } from 'bcryptjs';

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { fullName, headline, location, bio, phone, avatarUrl, currentPassword, newPassword } = await request.json();

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password required' }, { status: 400 });
      }
      const user = await db`SELECT password_hash FROM users WHERE id = ${session.id}`;
      const valid = await compare(currentPassword, user[0].password_hash);
      if (!valid) {
        return NextResponse.json({ error: 'Current password incorrect' }, { status: 400 });
      }
      const newHash = await hash(newPassword, 12);
      await db`UPDATE users SET password_hash = ${newHash}, updated_at = NOW() WHERE id = ${session.id}`;
    }

    const updated = await db`
      UPDATE users SET
        full_name = ${fullName || session.fullName},
        headline = ${headline || session.headline},
        location = ${location || ''},
        bio = ${bio || ''},
        phone = ${phone || ''},
        avatar_url = ${avatarUrl || session.avatarUrl},
        updated_at = NOW()
      WHERE id = ${session.id}
      RETURNING id, email, full_name, role, avatar_url, headline
    `;

    const token = await createSession({
      id: updated[0].id,
      email: updated[0].email,
      fullName: updated[0].full_name,
      role: updated[0].role,
      avatarUrl: updated[0].avatar_url || '',
      headline: updated[0].headline || '',
    });

    const response = NextResponse.json({ user: updated[0], success: true });
    response.cookies.set('vbl_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return response;
  } catch (error) {
    console.error('Settings update error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
