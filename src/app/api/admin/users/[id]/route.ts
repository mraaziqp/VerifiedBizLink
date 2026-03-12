import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

// GET /api/admin/users/[id] — get single user details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !['admin', 'banker', 'lawyer'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const users = await db`
      SELECT u.id, u.email, u.full_name, u.role, u.headline, u.bio, u.phone,
             u.avatar_url, u.connections_count, u.vetting_score, u.created_at,
             b.id AS business_id, b.company_name, b.status AS business_status, b.trust_score
      FROM users u
      LEFT JOIN businesses b ON b.user_id = u.id
      WHERE u.id = ${id}
      LIMIT 1
    `;

    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: users[0] });
  } catch (error) {
    console.error('Admin user GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

// PUT /api/admin/users/[id] — update user vetting score or role
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !['admin', 'banker', 'lawyer'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const { vettingScore, role } = await request.json();

    if (vettingScore !== undefined && (vettingScore < 0 || vettingScore > 100)) {
      return NextResponse.json({ error: 'Vetting score must be 0–100' }, { status: 400 });
    }

    const allowedRoles = ['user', 'business', 'admin', 'banker', 'lawyer'];
    if (role && !allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const updated = await db`
      UPDATE users SET
        vetting_score = COALESCE(${vettingScore ?? null}, vetting_score),
        role = COALESCE(${role ?? null}, role),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, email, full_name, role, vetting_score
    `;

    if (updated.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await db`
      INSERT INTO audit_logs (admin_id, admin_name, action, target_type, target_id, target_name)
      VALUES (
        ${session.id}, ${session.fullName},
        ${'Updated user score/role'},
        'user', ${id}, ${updated[0].full_name}
      )
    `;

    return NextResponse.json({ user: updated[0] });
  } catch (error) {
    console.error('Admin user PUT error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
