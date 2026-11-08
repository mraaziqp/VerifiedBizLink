import { NextRequest, NextResponse } from 'next/server';
import { requirePosAccess } from '@/lib/pos/auth-helper';
import { getPosStaff, assignPosStaffRole, verifyPosStaffPin } from '@/lib/pos/pos-service';
import { issueOperatorToken } from '@/lib/pos/operator';
import { posErrorResponse, readJson, PosError } from '@/lib/pos/errors';
import { enforceRateLimit } from '@/lib/pos/route-helpers';
import { clientIp } from '@/lib/rate-limit';
import { logPosAudit } from '@/lib/pos/audit';

export async function GET(req: NextRequest) {
  const guard = await requirePosAccess(req, 'staff.read');
  if (!guard.ok) return guard.response;
  try {
    return NextResponse.json({ staff: await getPosStaff(guard.auth.businessId) });
  } catch (err) {
    return posErrorResponse(err);
  }
}

/**
 * { action: 'verify_pin', pin } — switches the till operator; returns an operator token.
 * { email, role, pin?, displayName?, isActive? } — adds or updates a staff member.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await readJson(req);
  } catch (err) {
    return posErrorResponse(err);
  }

  if (body.action === 'verify_pin') {
    const guard = await requirePosAccess(req, 'till.operate');
    if (!guard.ok) return guard.response;
    const { auth } = guard;
    try {
      await enforceRateLimit(`pos_pin:${auth.businessId}:${clientIp(req.headers)}`, 10, 300);
      const verified = await verifyPosStaffPin(auth.businessId, String(body.pin ?? ''));
      if (!verified) {
        await logPosAudit({ businessId: auth.businessId, actorUserId: auth.session.id, actorRole: auth.posRole, action: 'pin_failed' });
        throw new PosError(401, 'BAD_PIN', 'Incorrect PIN.');
      }
      const operatorToken = await issueOperatorToken({ businessId: auth.businessId, userId: verified.userId, role: verified.role });
      await logPosAudit({ businessId: auth.businessId, actorUserId: verified.userId, actorRole: verified.role, action: 'till_operator_switched' });
      return NextResponse.json({ success: true, staff: verified, operatorToken });
    } catch (err) {
      return posErrorResponse(err);
    }
  }

  const guard = await requirePosAccess(req, 'staff.manage');
  if (!guard.ok) return guard.response;
  const { auth } = guard;
  try {
    const staff = await assignPosStaffRole(auth.businessId, { userId: auth.session.id, role: auth.posRole }, body);
    return NextResponse.json({ success: true, staff });
  } catch (err) {
    return posErrorResponse(err);
  }
}
