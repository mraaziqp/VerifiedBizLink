import { NextResponse } from 'next/server';
import { getSession, isStaff } from '@/lib/auth';
import db from '@/lib/db';

// POST /api/admin/users/[id]/verify-email — the ultimate fallback for a
// stuck client: mark a user verified directly in the database, completely
// independent of whether Resend is reachable, the domain is authenticated,
// or the client's inbox is cooperating. Staff can always unblock a real
// client this way even if the entire email pipeline is down.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!isStaff(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const [user] = await db`
    UPDATE users SET
      email_verified = TRUE,
      email_verification_token = NULL,
      email_verification_token_expires_at = NULL,
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, email, full_name, email_verified
  `;

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  await db`
    INSERT INTO audit_logs (admin_id, admin_name, action, target_type, target_name)
    VALUES (${session!.id}, ${session!.fullName}, ${'Manually verified email for: ' + user.email}, 'user', ${user.id})
  `.catch(() => {});

  return NextResponse.json({ user });
}
