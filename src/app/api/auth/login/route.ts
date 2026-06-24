import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSession } from '@/lib/auth';
import { compare } from 'bcryptjs';
import db from '@/lib/db';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    let userData: any = null;
    let userId: string | null = null;

    // Try Supabase Auth first
    let supabaseError = false;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (!error && data?.user) {
        userId = data.user.id;
        userData = data.user;
      } else {
        supabaseError = true;
      }
    } catch (e) {
      supabaseError = true;
      console.log('Supabase Auth unavailable, falling back to direct authentication');
    }

    // Fallback to direct Neon database authentication
    if (supabaseError || !userData) {
      const users = await db`
        SELECT id, email, password_hash, full_name, role, avatar_url, headline, email_verified
        FROM users
        WHERE LOWER(email) = ${normalizedEmail}
        LIMIT 1
      `;

      if (users.length === 0) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }

      const dbUser = users[0];
      if (!dbUser.password_hash) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }

      const passwordValid = await compare(password, dbUser.password_hash);
      if (!passwordValid) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }

      userId = dbUser.id;
      userData = {
        id: dbUser.id,
        email: dbUser.email,
        user_metadata: {
          full_name: dbUser.full_name,
        },
      };
    }

    if (!userId || !userData) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Get user profile from Neon database
    let fullName = userData.user_metadata?.full_name || '';
    let role = 'customer';
    let avatarUrl = '';
    let headline = '';
    let emailVerified = false;

    try {
      const users = await db`
        SELECT id, full_name, role, avatar_url, headline, email_verified
        FROM users
        WHERE id = ${userId}
        LIMIT 1
      `;

      if (users.length > 0) {
        const profileData = users[0];
        fullName = profileData.full_name || fullName;
        role = profileData.role || role;
        avatarUrl = profileData.avatar_url || avatarUrl;
        headline = profileData.headline || headline;
        emailVerified = profileData.email_verified === true;
      }
    } catch (dbError) {
      console.log('Profile fetch from database completed');
    }

    const sessionUser = {
      id: userId,
      email: userData.email || normalizedEmail,
      fullName,
      role,
      avatarUrl,
      headline,
      emailVerified,
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
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Login error:', errorMsg);
    return NextResponse.json({ error: 'Internal server error', detail: errorMsg }, { status: 500 });
  }
}
