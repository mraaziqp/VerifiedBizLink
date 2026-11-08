import { SignJWT } from 'jose/jwt/sign';
import { jwtVerify } from 'jose/jwt/verify';
import db from '@/lib/db';
import type { StaffRole } from './pos-service';

/**
 * Till operator tokens.
 *
 * On a shared till the device stays signed in as the owner while cashiers
 * switch in with their PIN. A successful PIN check issues this short-lived
 * token; checkout and refunds then record the PIN holder as the person
 * responsible and apply THEIR role's limits (a cashier cannot refund, or
 * discount beyond the merchant's cashier limit, just because the device is
 * signed in as the owner).
 *
 * Signed with the app's JWT secret under a distinct audience, bound to one
 * business, and re-checked against the staff table on every use so a
 * deactivated cashier's token stops working immediately.
 */
const AUDIENCE = 'vbl-pos-operator';
const TTL = '12h';

function secret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not set');
  return new TextEncoder().encode(s);
}

export async function issueOperatorToken(p: { businessId: string; userId: string; role: StaffRole }): Promise<string> {
  return new SignJWT({ bid: p.businessId, role: p.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(p.userId)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(TTL)
    .sign(secret());
}

export interface TillOperator {
  userId: string;
  role: StaffRole;
}

/** Returns the operator if the token is valid, for this business, and the staff member is still active. */
export async function verifyOperatorToken(token: string | null | undefined, businessId: string): Promise<TillOperator | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { audience: AUDIENCE });
    if (payload.bid !== businessId || typeof payload.sub !== 'string') return null;
    const [row] = await db`
      SELECT role FROM pos_staff_roles WHERE business_id = ${businessId} AND user_id = ${payload.sub} AND is_active = true LIMIT 1
    `;
    if (!row) return null;
    return { userId: payload.sub, role: row.role as StaffRole };
  } catch {
    return null;
  }
}
