import { NextRequest, NextResponse } from 'next/server';
import { getPosAuth } from '@/lib/pos/auth-helper';
import { getPosSettings, updatePosSettings } from '@/lib/pos/pos-service';

export async function GET(req: NextRequest) {
  const auth = await getPosAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const settings = await getPosSettings(auth.businessId);
  return NextResponse.json({ settings });
}

export async function PATCH(req: NextRequest) {
  const auth = await getPosAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (auth.posRole !== 'owner' && auth.posRole !== 'manager') {
    return NextResponse.json({ error: 'Only owners and managers can update store settings.' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const updated = await updatePosSettings(auth.businessId, body);
  return NextResponse.json({ success: true, settings: updated });
}
