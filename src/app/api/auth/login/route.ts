import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSession } from '@/lib/auth';

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

    // Authenticate with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });

    if (error || !data?.user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Get user profile from Neon
    let fullName = data.user.user_metadata?.full_name || '';
    let role = 'customer';
    let avatarUrl = '';
    let headline = '';
    let emailVerified = !!data.user.email_confirmed_at;

    try {
      const { supabase: supabaseClient } = await import('@/lib/supabase');
      const { data: userData } = await supabaseClient
        .from('users')
        .select('full_name, role, avatar_url, headline, email_verified')
        .eq('id', data.user.id)
        .single();

      if (userData) {
        fullName = userData.full_name || fullName;
        role = userData.role || role;
        avatarUrl = userData.avatar_url || avatarUrl;
        headline = userData.headline || headline;
        emailVerified = userData.email_verified !== null ? userData.email_verified : emailVerified;
      }
    } catch (dbError) {
      // Continue with defaults if profile fetch fails
      console.log('Profile fetch skipped - new user');
    }

    const sessionUser = {
      id: data.user.id,
      email: data.user.email || '',
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
