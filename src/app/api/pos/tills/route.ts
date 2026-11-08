import { NextRequest, NextResponse } from 'next/server';
import { requirePosAccess } from '@/lib/pos/auth-helper';
import { getTills, openTill, closeTill, createTill } from '@/lib/pos/pos-service';
import { posErrorResponse, readJson, PosError } from '@/lib/pos/errors';
import { resolveActor } from '@/lib/pos/route-helpers';

export async function GET(req: NextRequest) {
  const guard = await requirePosAccess(req, 'settings.read');
  if (!guard.ok) return guard.response;
  try {
    return NextResponse.json({ tills: await getTills(guard.auth.businessId) });
  } catch (err) {
    return posErrorResponse(err);
  }
}

/** { action: 'open', tillId, floatCents } | { action: 'close', tillId, closingCashCents } | { action: 'create', name } */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await readJson(req);
  } catch (err) {
    return posErrorResponse(err);
  }
  const capability = body.action === 'create' ? 'till.manage' : 'till.operate';
  const guard = await requirePosAccess(req, capability);
  if (!guard.ok) return guard.response;
  const { auth } = guard;
  try {
    const actor = await resolveActor(req, auth, capability);
    if (body.action === 'create') {
      return NextResponse.json({ success: true, till: await createTill(auth.businessId, String(body.name ?? '')) }, { status: 201 });
    }
    if (body.action === 'open') {
      return NextResponse.json({ success: true, till: await openTill(String(body.tillId ?? ''), auth.businessId, actor.userId, Number(body.floatCents ?? 0)) });
    }
    if (body.action === 'close') {
      return NextResponse.json({ success: true, ...(await closeTill(String(body.tillId ?? ''), auth.businessId, Number(body.closingCashCents ?? 0))) });
    }
    throw new PosError(400, 'BAD_ACTION', 'action must be open, close or create.');
  } catch (err) {
    return posErrorResponse(err);
  }
}
