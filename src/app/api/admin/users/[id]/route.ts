import db from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

// PUT update a platform user — staff accounts (email/role) or a business
// owner's vetting score from the admin vetting desk. `admin_users` is a
// legacy table that no longer exists; every real account (staff or
// customer) lives in `users`.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { email, role, vettingScore, isSuspended, suspendedReason } = body;

    const result = await db`
      UPDATE users SET
        email = COALESCE(${email}, email),
        role = COALESCE(${role}, role),
        vetting_score = COALESCE(${vettingScore}, vetting_score),
        is_suspended = COALESCE(${isSuspended ?? null}, is_suspended),
        suspended_reason = CASE WHEN ${isSuspended ?? null} = true THEN COALESCE(${suspendedReason ?? null}, '') WHEN ${isSuspended ?? null} = false THEN '' ELSE suspended_reason END,
        suspended_at = CASE WHEN ${isSuspended ?? null} = true THEN NOW() WHEN ${isSuspended ?? null} = false THEN NULL ELSE suspended_at END,
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, email, full_name, role, vetting_score, is_suspended, suspended_reason, created_at
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Suspending should end any session right now, not just block the next
    // login attempt.
    if (isSuspended === true) {
      await db`UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = ${id} AND revoked_at IS NULL`.catch(() => {});
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE a platform user account.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const result = await db`
      DELETE FROM users
      WHERE id = ${id}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
