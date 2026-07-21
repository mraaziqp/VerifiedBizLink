import { NextRequest, NextResponse } from 'next/server';
import { getSession, isStaff } from '@/lib/auth';
import { hash } from 'bcryptjs';
import db from '@/lib/db';

export async function GET() {
  try {
    const session = await getSession();
    if (!isStaff(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const users = await db`
      SELECT
        u.id, u.email, u.full_name, u.role, u.headline, u.avatar_url,
        u.connections_count, u.vetting_score, u.created_at, u.email_verified, u.is_suspended,
        b.id AS business_id, b.company_name, b.status AS business_status, b.package_type
      FROM users u
      LEFT JOIN businesses b ON b.user_id = u.id
      ORDER BY u.created_at DESC
      LIMIT 100
    `;

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }

    const { fullName, email, password, role } = await request.json();

    if (!fullName || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const allowedRoles = ['admin', 'banker', 'lawyer'];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const existing = await db`SELECT id FROM users WHERE email = ${email.toLowerCase().trim()} LIMIT 1`;
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const passwordHash = await hash(password, 12);
    const roleHeadlines: Record<string, string> = {
      admin: 'Shareholder & Administrator — VerifiedBizLink',
      banker: 'Verification Analyst — VerifiedBizLink',
      lawyer: 'Compliance Officer — VerifiedBizLink',
    };

    const avatarSeed = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    const newUser = await db`
      INSERT INTO users (email, password_hash, full_name, role, headline, avatar_url)
      VALUES (
        ${email.toLowerCase().trim()},
        ${passwordHash},
        ${fullName},
        ${role},
        ${roleHeadlines[role]},
        ${'https://picsum.photos/seed/' + avatarSeed + '/200/200'}
      )
      RETURNING id, email, full_name, role
    `;

    await db`
      INSERT INTO audit_logs (admin_id, admin_name, action, target_type, target_name, metadata)
      VALUES (${session.id}, ${session.fullName}, 'CREATED_ADMIN_ACCOUNT', 'user', ${fullName}, ${JSON.stringify({ email, role })})
    `;

    return NextResponse.json({ user: newUser[0], success: true }, { status: 201 });
  } catch (error) {
    console.error('Create admin user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
