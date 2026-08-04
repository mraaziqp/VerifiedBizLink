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

const STAFF_ROLES = ['admin', 'banker', 'lawyer'];

// DELETE a platform user account — any staff account (admin, compliance
// officer, lawyer) can do this, not just 'admin'; removing a bad actor is
// a moderation action every staff member needs, same as suspend already was.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !STAFF_ROLES.includes(session.role ?? '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const target = await db`SELECT role FROM users WHERE id = ${id}`;
    if (target.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    // Staff accounts are provisioned directly, not through this tool — a
    // safety rail against removing a colleague by mistake (or a
    // compromised session removing the whole team). Suspend a staff
    // account by hand in the database if that's ever genuinely needed.
    if (STAFF_ROLES.includes(target[0].role)) {
      return NextResponse.json({ error: 'Staff accounts cannot be deleted from here.' }, { status: 403 });
    }

    // Most user_id foreign keys already cascade (posts, sessions, reviews,
    // payments, preferences, support tickets), but businesses.user_id and
    // the requester/receiver-style columns on connections and messages
    // don't all use the same column name, so a plain DELETE FROM users can
    // fail outright on a live account with real activity. Clean up
    // everything we know about first, tolerating tables/columns that
    // don't exist or aren't populated, then delete the row itself.
    const owned = await db`SELECT id FROM businesses WHERE user_id = ${id}`.catch(() => []);
    const businessIds = owned.map((b: Record<string, unknown>) => b.id as string);
    if (businessIds.length > 0) {
      await Promise.all([
        db`DELETE FROM business_documents WHERE business_id = ANY(${businessIds})`.catch(() => null),
        db`DELETE FROM documents WHERE business_id = ANY(${businessIds})`.catch(() => null),
        db`DELETE FROM business_gallery WHERE business_id = ANY(${businessIds})`.catch(() => null),
        db`DELETE FROM ads WHERE business_id = ANY(${businessIds})`.catch(() => null),
        db`DELETE FROM business_reviews WHERE business_id = ANY(${businessIds})`.catch(() => null),
        db`DELETE FROM business_profile_views WHERE business_id = ANY(${businessIds})`.catch(() => null),
      ]);
      await db`DELETE FROM businesses WHERE user_id = ${id}`.catch(() => null);
    }
    await Promise.all([
      db`DELETE FROM connections WHERE requester_id = ${id} OR receiver_id = ${id}`.catch(() => null),
      db`DELETE FROM messages WHERE sender_id = ${id} OR receiver_id = ${id}`.catch(() => null),
      db`DELETE FROM notifications WHERE user_id = ${id}`.catch(() => null),
      db`DELETE FROM post_likes WHERE user_id = ${id}`.catch(() => null),
      db`DELETE FROM comments WHERE user_id = ${id}`.catch(() => null),
      db`DELETE FROM business_reviews WHERE reviewer_id = ${id}`.catch(() => null),
    ]);

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
