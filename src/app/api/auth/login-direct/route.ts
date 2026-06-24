/**
 * Direct Database Authentication Fallback
 *
 * This endpoint provides fallback authentication when Supabase is unavailable.
 * Uses bcrypt password hashing against the Neon database directly.
 *
 * POST /api/auth/login-direct
 * Body: { "email": "...", "password": "..." }
 */

import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import db from '@/lib/db';
import { createSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    // Get user from Neon database
    const users = await db`
      SELECT id, email, password_hash, full_name, role, avatar_url, headline, email_verified
      FROM users
      WHERE LOWER(email) = LOWER(${email.trim()})
      LIMIT 1
    `;

    if (users.length === 0) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const user = users[0];

    // Verify password
    if (!user.password_hash) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const passwordValid = await compare(password, user.password_hash);
    if (!passwordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Create session
    const sessionUser = {
      id: user.id,
      email: user.email,
      fullName: user.full_name || '',
      role: user.role || 'customer',
      avatarUrl: user.avatar_url || '',
      headline: user.headline || '',
      emailVerified: user.email_verified === true,
    };

    const token = await createSession(sessionUser);
    const response = NextResponse.json({ user: sessionUser, success: true });

    response.cookies.set('vbl_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Login error:', errorMsg);
    return NextResponse.json(
      { error: 'Internal server error', detail: errorMsg },
      { status: 500 }
    );
  }
}
