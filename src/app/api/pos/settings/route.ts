import { NextRequest, NextResponse } from 'next/server';
import { requirePosAccess, POS_ROLE_MATRIX } from '@/lib/pos/auth-helper';
import { getPosSettings, updatePosSettings } from '@/lib/pos/pos-service';
import { paymentMethodAvailability } from '@/lib/pos/payments/config';
import { posErrorResponse, readJson } from '@/lib/pos/errors';
import { logPosAudit } from '@/lib/pos/audit';

/** Settings plus everything the till needs to know about this caller. */
export async function GET(req: NextRequest) {
  const guard = await requirePosAccess(req, 'settings.read');
  if (!guard.ok) return guard.response;
  const { auth } = guard;
  try {
    const settings = await getPosSettings(auth.businessId);
    const capabilities = Object.entries(POS_ROLE_MATRIX).filter(([, roles]) => roles.includes(auth.posRole)).map(([c]) => c);
    return NextResponse.json({
      settings,
      businessId: auth.businessId,
      businessName: auth.businessName,
      role: auth.posRole,
      capabilities,
      access: auth.access,
      paymentMethods: paymentMethodAvailability(),
    });
  } catch (err) {
    return posErrorResponse(err);
  }
}

export async function PATCH(req: NextRequest) {
  const guard = await requirePosAccess(req, 'settings.write');
  if (!guard.ok) return guard.response;
  const { auth } = guard;
  try {
    const body = await readJson(req);
    const updated = await updatePosSettings(auth.businessId, body);
    await logPosAudit({
      businessId: auth.businessId, actorUserId: auth.session.id, actorRole: auth.posRole, action: 'settings_updated',
      detail: { fields: Object.keys(body).slice(0, 20) },
    });
    return NextResponse.json({ success: true, settings: updated });
  } catch (err) {
    return posErrorResponse(err);
  }
}
