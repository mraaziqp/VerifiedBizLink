import db from '@/lib/db';
import { createSession, type SessionUser } from '@/lib/auth';
import { STAFF_ROLES } from '@/lib/roles';

/**
 * Switching accounts: the developer's account can step into the admin
 * accounts and VerifiedBizLink's own account (and, by email, any account) to
 * test and run them, then step back, without knowing their passwords.
 *
 * Who may switch is decided on the server only, from the real person behind
 * the session: a switched session carries `actor` (the account that switched
 * in) inside the signed token, so the browser can neither forge nor remove
 * it. The real account must still be a super admin listed in
 * ACCOUNT_SWITCH_OWNERS, and every switch is written to the audit log and
 * shows in the target account's active sessions.
 *
 *   ACCOUNT_SWITCH_OWNERS   emails allowed to switch (default: the developer account)
 *   ACCOUNT_SWITCH_LINKED   extra accounts offered in one click, besides staff
 *                           (default: VerifiedBizLink's own account)
 */

const emails = (value: string | undefined, fallback: string) =>
  (value ?? fallback)
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

const OWNERS = () => emails(process.env.ACCOUNT_SWITCH_OWNERS, 'mraaziqp@gmail.com');
const LINKED = () => emails(process.env.ACCOUNT_SWITCH_LINKED, 'info@verifiedbizlink.co.za');

export interface SwitchAccount {
  id: string;
  email: string;
  fullName: string;
  role: string;
  businessName: string | null;
}

export class SwitchError extends Error {
  constructor(message: string, public status = 403) {
    super(message);
  }
}

/** The person really signed in: the account that switched in, or the session's own. */
export function realUserId(session: SessionUser): string {
  return session.actor?.id ?? session.id;
}

let ready: Promise<void> | null = null;

function ensureSwitchLog(): Promise<void> {
  if (!ready) {
    ready = db`
      CREATE TABLE IF NOT EXISTS account_switch_log (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        actor_id   UUID NOT NULL,
        target_id  UUID NOT NULL,
        ip_address TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `
      .then(() => undefined)
      .catch((error) => {
        ready = null;
        throw error;
      });
  }
  return ready;
}

/** The real account behind the session, if it may switch; null otherwise. */
export async function switchOwner(session: SessionUser | null): Promise<SwitchAccount | null> {
  if (!session) return null;
  const [row] = await db`
    SELECT id, email, full_name, role, is_suspended FROM users WHERE id = ${realUserId(session)} LIMIT 1
  `;
  if (!row || row.is_suspended || row.role !== 'admin') return null;
  if (!OWNERS().includes(String(row.email).toLowerCase())) return null;
  return { id: String(row.id), email: String(row.email), fullName: String(row.full_name || row.email), role: String(row.role), businessName: null };
}

const toAccount = (row: Record<string, unknown>): SwitchAccount => ({
  id: String(row.id),
  email: String(row.email),
  fullName: String(row.full_name || row.email),
  role: String(row.role),
  businessName: row.business_name ? String(row.business_name) : null,
});

/** The accounts offered in one click: every staff account and the linked ones. */
export async function linkedAccounts(owner: SwitchAccount): Promise<SwitchAccount[]> {
  const rows = await db`
    SELECT u.id, u.email, u.full_name, u.role,
           (SELECT COALESCE(b.company_name, b.name) FROM businesses b WHERE b.user_id = u.id ORDER BY b.updated_at DESC NULLS LAST LIMIT 1) AS business_name
    FROM users u
    WHERE COALESCE(u.is_suspended, false) = false
      AND (u.role = ANY(${STAFF_ROLES}) OR LOWER(u.email) = ANY(${LINKED()}) OR u.id = ${owner.id})
    ORDER BY (u.id = ${owner.id}) DESC, (u.role = 'admin') DESC, u.full_name ASC
  `;
  return rows.map(toAccount);
}

/** Any account by email or name, for the owner's search. */
export async function findAccounts(query: string): Promise<SwitchAccount[]> {
  const q = `%${query.trim().toLowerCase().slice(0, 80)}%`;
  if (q.length < 5) return [];
  const rows = await db`
    SELECT u.id, u.email, u.full_name, u.role,
           (SELECT COALESCE(b.company_name, b.name) FROM businesses b WHERE b.user_id = u.id ORDER BY b.updated_at DESC NULLS LAST LIMIT 1) AS business_name
    FROM users u
    WHERE COALESCE(u.is_suspended, false) = false
      AND (LOWER(u.email) LIKE ${q} OR LOWER(COALESCE(u.full_name, '')) LIKE ${q})
    ORDER BY u.full_name ASC
    LIMIT 10
  `;
  return rows.map(toAccount);
}

/**
 * A session token for the target account. Switching to the owner's own
 * account is switching back, and carries no actor. The session row says who
 * switched in, so it reads plainly in the target's Settings -> Security.
 */
export async function switchTo(
  session: SessionUser,
  targetId: string,
  request: Request,
): Promise<{ token: string; user: SessionUser; back: boolean }> {
  const owner = await switchOwner(session);
  if (!owner) throw new SwitchError('Only the developer account can switch accounts.');
  const [target] = await db`
    SELECT id, email, full_name, role, avatar_url, headline, email_verified, is_suspended
    FROM users WHERE id = ${targetId} LIMIT 1
  `;
  if (!target || target.is_suspended) throw new SwitchError('That account does not exist or is suspended.', 404);

  const back = String(target.id) === owner.id;
  const user: SessionUser = {
    id: String(target.id),
    email: String(target.email),
    fullName: String(target.full_name || ''),
    role: String(target.role || 'customer'),
    avatarUrl: String(target.avatar_url || ''),
    headline: String(target.headline || ''),
    emailVerified: target.email_verified === true,
    ...(back ? {} : { actor: { id: owner.id, email: owner.email, fullName: owner.fullName } }),
  };

  const userAgent = request.headers.get('user-agent') || '';
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || '';
  const [row] = await db`
    INSERT INTO user_sessions (user_id, user_agent, ip_address)
    VALUES (${user.id}, ${back ? userAgent : `Switched in by ${owner.email} · ${userAgent}`.slice(0, 500)}, ${ip})
    RETURNING id
  `;
  // The session being left is closed, so a switched-in session never lingers.
  if (session.sid) await db`UPDATE user_sessions SET revoked_at = NOW() WHERE id = ${session.sid} AND revoked_at IS NULL`.catch(() => undefined);

  await ensureSwitchLog();
  await db`INSERT INTO account_switch_log (actor_id, target_id, ip_address) VALUES (${owner.id}, ${user.id}, ${ip})`;
  await db`
    INSERT INTO audit_logs (admin_id, admin_name, action, target_type, target_id, target_name)
    VALUES (${owner.id}, ${owner.fullName}, ${back ? 'Switched back to own account' : `Switched into ${user.email}`}, 'user', ${user.id}, ${user.fullName || user.email})
  `.catch((error) => console.error('Audit log write failed:', error));

  return { token: await createSession(user, String(row.id)), user, back };
}
