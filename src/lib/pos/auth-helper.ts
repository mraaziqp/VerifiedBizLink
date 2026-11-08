import { NextRequest, NextResponse } from 'next/server';
import { getSession, type SessionUser } from '@/lib/auth';
import { isStaff } from '@/lib/roles';
import db from '@/lib/db';
import { ensurePosSchema } from './schema';
import { logPosAudit } from './audit';
import { posAccessState, type PosAccessState } from './subscription-state';

export type PosRole = 'owner' | 'manager' | 'cashier' | 'stock_controller' | 'admin_readonly';

export interface PosAuthContext {
  session: SessionUser;
  businessId: string;
  businessName: string;
  isOwner: boolean;
  /** Platform staff viewing a merchant. Never able to write. */
  isPlatformAdmin: boolean;
  posRole: PosRole;
  access: PosAccessState;
}

/**
 * Everything a POS route can ask permission for. Enforced server-side on
 * every route; the UI only hides what the server would refuse anyway.
 */
export type PosCapability =
  | 'sale.create'
  | 'sale.read'
  | 'sale.refund'
  | 'discount.override'
  | 'catalog.read'
  | 'catalog.write'
  | 'stock.adjust'
  | 'purchasing.read'
  | 'purchasing.write'
  | 'reports.read'
  | 'staff.read'
  | 'staff.manage'
  | 'settings.read'
  | 'settings.write'
  | 'till.operate'
  | 'till.manage'
  | 'expenses.read'
  | 'expenses.write'
  | 'billing.read'
  | 'billing.manage'
  | 'export';

const O = 'owner', M = 'manager', C = 'cashier', S = 'stock_controller', A = 'admin_readonly';

export const POS_ROLE_MATRIX: Record<PosCapability, PosRole[]> = {
  'sale.create': [O, M, C],
  'sale.read': [O, M, C, A],
  'sale.refund': [O, M],
  'discount.override': [O, M],
  'catalog.read': [O, M, C, S, A],
  'catalog.write': [O, M, S],
  'stock.adjust': [O, M, S],
  'purchasing.read': [O, M, S, A],
  'purchasing.write': [O, M, S],
  'reports.read': [O, M, A],
  'staff.read': [O, M, A],
  'staff.manage': [O, M],
  'settings.read': [O, M, C, S, A],
  'settings.write': [O, M],
  'till.operate': [O, M, C],
  'till.manage': [O, M],
  'expenses.read': [O, M, A],
  'expenses.write': [O, M],
  'billing.read': [O, A],
  'billing.manage': [O],
  'export': [O, M, A],
};

/** Capabilities that only read. Everything else changes data. */
const READ_CAPABILITIES = new Set<PosCapability>([
  'sale.read', 'catalog.read', 'purchasing.read', 'reports.read', 'staff.read',
  'settings.read', 'expenses.read', 'billing.read', 'export',
]);

/**
 * Writes that stay open when the subscription is not in good standing, so a
 * lapsed merchant can always pay to reactivate.
 */
const ALWAYS_ALLOWED_WRITES = new Set<PosCapability>(['billing.manage']);

export function roleCan(role: PosRole, capability: PosCapability): boolean {
  return POS_ROLE_MATRIX[capability].includes(role);
}

async function loadAccess(businessId: string): Promise<PosAccessState> {
  const [sub] = await db`
    SELECT status, trial_ends_at, renews_at, payment_failed_at, cancel_at_period_end, suspended_reason
    FROM pos_merchant_subscriptions WHERE business_id = ${businessId} LIMIT 1
  `;
  return posAccessState(sub ?? null);
}

/**
 * Resolves who is calling and for which business.
 *
 * Order: a business the caller owns, then a business where they hold an
 * active POS staff role, then — for platform staff only — a read-only view of
 * the business they named. Platform staff are never given an owner role on a
 * merchant's till, and there is no fallback to "some business": a request
 * that matches nothing gets null.
 */
export async function getPosAuth(req: NextRequest): Promise<PosAuthContext | null> {
  const session = await getSession(req);
  if (!session) return null;
  await ensurePosSchema();

  const requestedBizId = req.nextUrl.searchParams.get('businessId') || req.headers.get('x-business-id');
  const uuidOk = (v: string | null) => !!v && /^[0-9a-f-]{36}$/i.test(v);
  const requested = uuidOk(requestedBizId) ? requestedBizId : null;

  const build = async (biz: { id: string; company_name: string }, role: PosRole, isOwner: boolean, isPlatformAdmin = false): Promise<PosAuthContext> => ({
    session,
    businessId: String(biz.id),
    businessName: String(biz.company_name ?? ''),
    isOwner,
    isPlatformAdmin,
    posRole: role,
    access: await loadAccess(String(biz.id)),
  });

  // 1. A business the caller owns (the requested one, else their latest).
  const [own] = requested
    ? await db`SELECT id, company_name FROM businesses WHERE id = ${requested} AND user_id = ${session.id} LIMIT 1`
    : await db`SELECT id, company_name FROM businesses WHERE user_id = ${session.id} ORDER BY created_at DESC LIMIT 1`;
  if (own) return build(own as { id: string; company_name: string }, 'owner', true);

  // 2. A business that has given the caller a POS staff role.
  const [assigned] = requested
    ? await db`
        SELECT sr.role, b.id, b.company_name FROM pos_staff_roles sr JOIN businesses b ON sr.business_id = b.id
        WHERE sr.user_id = ${session.id} AND sr.is_active = true AND b.id = ${requested} LIMIT 1`
    : await db`
        SELECT sr.role, b.id, b.company_name FROM pos_staff_roles sr JOIN businesses b ON sr.business_id = b.id
        WHERE sr.user_id = ${session.id} AND sr.is_active = true ORDER BY sr.created_at ASC LIMIT 1`;
  if (assigned) {
    const role = (['owner', 'manager', 'cashier', 'stock_controller'].includes(assigned.role) ? assigned.role : 'cashier') as PosRole;
    return build(assigned as { id: string; company_name: string }, role, role === 'owner');
  }

  // 3. Platform staff: read-only oversight of a named business, audit-logged.
  if (isStaff(session.role) && requested) {
    const [biz] = await db`SELECT id, company_name FROM businesses WHERE id = ${requested} LIMIT 1`;
    if (biz) {
      await logPosAudit({
        businessId: String(biz.id),
        actorUserId: session.id,
        actorRole: `platform:${session.role}`,
        action: 'admin_view',
        targetType: 'route',
        targetId: req.nextUrl.pathname,
      });
      return build(biz as { id: string; company_name: string }, 'admin_readonly', false, true);
    }
  }

  return null;
}

export type PosGuardResult =
  | { ok: true; auth: PosAuthContext }
  | { ok: false; response: NextResponse };

/**
 * The one guard every POS route calls: authenticated, allowed by the role
 * matrix, and — for anything that writes — on a subscription in good
 * standing. Lapsed merchants keep full read and export access to their data.
 */
export async function requirePosAccess(req: NextRequest, capability: PosCapability): Promise<PosGuardResult> {
  let auth: PosAuthContext | null;
  try {
    auth = await getPosAuth(req);
  } catch (err) {
    console.error('[pos] auth failed:', err);
    return { ok: false, response: NextResponse.json({ error: 'POS is temporarily unavailable.' }, { status: 503 }) };
  }
  if (!auth) return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  if (!roleCan(auth.posRole, capability)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: auth.isPlatformAdmin ? 'Platform admins have read-only access to merchant POS data.' : 'Your POS role does not allow this.' },
        { status: 403 },
      ),
    };
  }

  const isWrite = !READ_CAPABILITIES.has(capability);
  if (isWrite && !ALWAYS_ALLOWED_WRITES.has(capability) && auth.access.mode !== 'full') {
    return {
      ok: false,
      response: NextResponse.json(
        { error: auth.access.message, code: 'POS_SUBSCRIPTION_INACTIVE', access: auth.access },
        { status: 402 },
      ),
    };
  }

  return { ok: true, auth };
}
