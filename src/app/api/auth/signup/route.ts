import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { createSession } from '@/lib/auth';
import db from '@/lib/db';

const SHAREHOLDER_INVITE_CODE = process.env.SHAREHOLDER_INVITE_CODE || 'VBL2026';

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName, role, companyName, regNumber, inviteCode } = await request.json();

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Shareholder role requires valid invite code
    if (role === 'shareholder') {
      if (!inviteCode || inviteCode !== SHAREHOLDER_INVITE_CODE) {
        return NextResponse.json({ error: 'Invalid shareholder invite code' }, { status: 403 });
      }
    }

    const existing = await db`SELECT id FROM users WHERE email = ${email.toLowerCase().trim()} LIMIT 1`;
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const passwordHash = await hash(password, 12);

    let userRole = 'user';
    let headline = 'Professional';
    if (role === 'business') { userRole = 'business'; headline = `Owner at ${companyName || 'Company'}`; }
    if (role === 'shareholder') { userRole = 'admin'; headline = 'Shareholder & Administrator — VerifiedBizLink'; }

    const newUsers = await db`
      INSERT INTO users (email, password_hash, full_name, role, headline, avatar_url)
      VALUES (
        ${email.toLowerCase().trim()},
        ${passwordHash},
        ${fullName},
        ${userRole},
        ${headline},
        ${'https://picsum.photos/seed/' + Math.random().toString(36).slice(2) + '/200/200'}
      )
      RETURNING id, email, full_name, role, avatar_url, headline
    `;
    const user = newUsers[0];

    if (role === 'business' && companyName) {
      await db`
        INSERT INTO businesses (user_id, company_name, reg_number, status)
        VALUES (${user.id}, ${companyName}, ${regNumber || ''}, 'unregistered')
      `;
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
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
