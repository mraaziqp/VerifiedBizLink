import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { isStaff } from '@/lib/roles';

export interface PosAuthContext {
  session: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  };
  businessId: string;
  businessName: string;
  isOwner: boolean;
  isStaffUser: boolean;
  posRole: 'owner' | 'manager' | 'cashier' | 'stock_controller';
}

/**
 * Resolves the authenticated business and POS role for API requests.
 * Supports web sessions, native mobile Authorization: Bearer tokens,
 * business owners, and delegated staff cashiers.
 */
export async function getPosAuth(req: NextRequest): Promise<PosAuthContext | null> {
  const session = await getSession(req);
  if (!session) return null;

  const staffUser = isStaff(session.role);
  const requestedBizId = req.nextUrl.searchParams.get('businessId') || req.headers.get('x-business-id');

  // 1. Staff Admin override
  if (staffUser && requestedBizId) {
    const [biz] = await db`SELECT id, company_name FROM businesses WHERE id = ${requestedBizId} LIMIT 1`;
    if (biz) {
      return {
        session,
        businessId: biz.id,
        businessName: biz.company_name,
        isOwner: true,
        isStaffUser: true,
        posRole: 'owner',
      };
    }
  }

  // 2. Direct business owner
  const [ownBiz] = await db`
    SELECT id, company_name FROM businesses WHERE user_id = ${session.id} LIMIT 1
  `;
  if (ownBiz) {
    return {
      session,
      businessId: ownBiz.id,
      businessName: ownBiz.company_name,
      isOwner: true,
      isStaffUser: staffUser,
      posRole: 'owner',
    };
  }

  // 3. Delegated POS staff member (Cashier / Manager / Stock Controller)
  const [assignedRole] = await db`
    SELECT sr.role, b.id as business_id, b.company_name
    FROM pos_staff_roles sr
    JOIN businesses b ON sr.business_id = b.id
    WHERE sr.user_id = ${session.id} AND sr.is_active = true
    LIMIT 1
  `;
  if (assignedRole) {
    return {
      session,
      businessId: assignedRole.business_id,
      businessName: assignedRole.company_name,
      isOwner: false,
      isStaffUser: staffUser,
      posRole: assignedRole.role as PosAuthContext['posRole'],
    };
  }

  // 4. If staff user has no specific business, fallback to latest registered business for inspection
  if (staffUser) {
    const [firstBiz] = await db`SELECT id, company_name FROM businesses ORDER BY created_at DESC LIMIT 1`;
    if (firstBiz) {
      return {
        session,
        businessId: firstBiz.id,
        businessName: firstBiz.company_name,
        isOwner: true,
        isStaffUser: true,
        posRole: 'owner',
      };
    }
  }

  return null;
}
