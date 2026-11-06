import { NextRequest, NextResponse } from 'next/server';
import { getPosAuth } from '@/lib/pos/auth-helper';
import { getPosSuppliers, createPosSupplier } from '@/lib/pos/pos-service';

export async function GET(req: NextRequest) {
  const auth = await getPosAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const suppliers = await getPosSuppliers(auth.businessId);
  return NextResponse.json({ suppliers });
}

export async function POST(req: NextRequest) {
  const auth = await getPosAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (!body.name) {
    return NextResponse.json({ error: 'Supplier company name is required.' }, { status: 400 });
  }

  const supplier = await createPosSupplier(auth.businessId, body);
  return NextResponse.json({ success: true, supplier });
}
