import type { NextRequest } from 'next/server';
import { PosError } from './errors';
import { roleCan, type PosAuthContext, type PosCapability, type PosRole } from './auth-helper';
import { verifyOperatorToken } from './operator';
import { rateLimit } from '@/lib/rate-limit';

export const OPERATOR_HEADER = 'x-pos-operator';

/**
 * Who is acting at the till: the PIN-switched operator if the request
 * carries a valid operator token, otherwise the signed-in user. An operator
 * header that does not verify is rejected outright — falling back to the
 * device's (owner) session would hand a cashier the owner's permissions.
 */
export async function resolveActor(req: NextRequest, auth: PosAuthContext, capability: PosCapability): Promise<{ userId: string; role: PosRole }> {
  const token = req.headers.get(OPERATOR_HEADER);
  if (!token) return { userId: auth.session.id, role: auth.posRole };
  const op = await verifyOperatorToken(token, auth.businessId);
  if (!op) throw new PosError(401, 'OPERATOR_EXPIRED', 'The till PIN session has ended. Enter your PIN again.');
  if (!roleCan(op.role, capability)) throw new PosError(403, 'OPERATOR_NOT_ALLOWED', 'Your POS role does not allow this. Ask a manager.');
  return { userId: op.userId, role: op.role };
}

export async function enforceRateLimit(key: string, limit: number, windowSecs: number) {
  const r = await rateLimit(key, limit, windowSecs);
  if (!r.allowed) throw new PosError(429, 'RATE_LIMITED', 'Too many requests. Please slow down.', { retryAfter: r.retryAfterSecs });
}

export function numOrUndefined(v: unknown): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
