import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { createSession, setSessionCookie } from '@/lib/auth';
import db from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const rows = await db`
      SELECT id, email, password_hash, full_name, role, avatar_url, headline
      FROM users WHERE email = ${email.toLowerCase().trim()}
      LIMIT 1
    `;

    const user = rows[0];
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await compare(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const sessionUser = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      avatarUrl: user.avatar_url || '',
      headline: user.headline || '',
    };

    const token = await createSession(sessionUser);
    const response = NextResponse.json({ user: sessionUser, success: true });
    response.cookies.set('vbl_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
