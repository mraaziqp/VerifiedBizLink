import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { isStaff, hasRole, SUPER_ADMIN_ROLES } from '@/lib/roles';
import { getOwnerEmails, saveOwnerEmails, syncOwnerAccounts } from '@/lib/owner-accounts';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

/** GET: the owner list and which businesses it covers. Any platform staff may read. */
export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session || !isStaff(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const emails = await getOwnerEmails();
  const businesses = emails.length
    ? await db`
        SELECT LOWER(u.email) AS email, b.id, b.company_name, b.package_type, b.tier_grant_type
        FROM users u LEFT JOIN businesses b ON b.user_id = u.id
        WHERE LOWER(u.email) = ANY(${emails})
        ORDER BY u.email
      `
    : [];
  return NextResponse.json({ emails, accounts: businesses });
}

/**
 * POST { emails: string[] | string } — replaces the owner list (super admins
 * only) and immediately puts every owner's business on permanent Premium.
 * POST { action: 'sync' } — re-applies the current list.
 */
export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session || !hasRole(session.role, SUPER_ADMIN_ROLES)) {
    return NextResponse.json({ error: 'Only platform administrators can change owner accounts.' }, { status: 403 });
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const actor = { userId: session.id, name: session.fullName || session.email };
  try {
    const result = body.action === 'sync' ? await syncOwnerAccounts(actor) : await saveOwnerEmails(body.emails, actor);
    await db`
      INSERT INTO audit_logs (admin_id, admin_name, action, target_type, target_id, target_name)
      VALUES (${session.id}, ${actor.name}, ${`Owner accounts ${body.action === 'sync' ? 're-applied' : 'updated'}: ${result.emails.join(', ')}`.slice(0, 250)}, 'platform', 'owner_accounts', 'Owner accounts')
    `.catch(() => undefined);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Owner accounts update failed:', error);
    return NextResponse.json({ error: 'Could not update owner accounts.' }, { status: 500 });
  }
}
