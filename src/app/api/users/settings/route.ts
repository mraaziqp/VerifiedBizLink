import { NextRequest, NextResponse } from 'next/server';
import { getSession, createSession } from '@/lib/auth';
import db from '@/lib/db';
import { hash, compare } from 'bcryptjs';

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { fullName, headline, location, bio, phone, avatarUrl, currentPassword, newPassword } = await request.json();

    const current = await db`
      SELECT password_hash, full_name, headline, location, bio, phone, avatar_url
      FROM users WHERE id = ${session.id}
    `;
    if (!current.length) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password required' }, { status: 400 });
      }
      const valid = await compare(currentPassword, current[0].password_hash);
      if (!valid) {
        return NextResponse.json({ error: 'Current password incorrect' }, { status: 400 });
      }
      const newHash = await hash(newPassword, 12);
      await db`UPDATE users SET password_hash = ${newHash}, updated_at = NOW() WHERE id = ${session.id}`;
    }

    // Only overwrite a field when the caller actually sent it — otherwise
    // a request that only changes the password (or only the headline) would
    // silently blank out the fields it didn't mention.
    const updated = await db`
      UPDATE users SET
        full_name = ${fullName !== undefined ? fullName : current[0].full_name},
        headline = ${headline !== undefined ? headline : current[0].headline},
        location = ${location !== undefined ? location : current[0].location},
        bio = ${bio !== undefined ? bio : current[0].bio},
        phone = ${phone !== undefined ? phone : current[0].phone},
        avatar_url = ${avatarUrl !== undefined ? avatarUrl : current[0].avatar_url},
        updated_at = NOW()
      WHERE id = ${session.id}
      RETURNING id, email, full_name, role, avatar_url, headline, email_verified
    `;

    // Keep avatarUrl out of the JWT — /api/auth/me fetches it fresh from DB.
    const token = await createSession({
      id: updated[0].id,
      email: updated[0].email,
      fullName: updated[0].full_name,
      role: updated[0].role,
      avatarUrl: '',
      headline: updated[0].headline || '',
      emailVerified: updated[0].email_verified ?? session.emailVerified ?? false,
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
