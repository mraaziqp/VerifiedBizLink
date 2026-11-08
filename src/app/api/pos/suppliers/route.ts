import { NextRequest, NextResponse } from 'next/server';
import { requirePosAccess } from '@/lib/pos/auth-helper';
import { getPosSuppliers, createPosSupplier } from '@/lib/pos/pos-service';
import { posErrorResponse, readJson } from '@/lib/pos/errors';

export async function GET(req: NextRequest) {
  const guard = await requirePosAccess(req, 'purchasing.read');
  if (!guard.ok) return guard.response;
  try {
    return NextResponse.json({ suppliers: await getPosSuppliers(guard.auth.businessId) });
  } catch (err) {
    return posErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  const guard = await requirePosAccess(req, 'purchasing.write');
  if (!guard.ok) return guard.response;
  try {
    const body = await readJson(req);
    return NextResponse.json({ success: true, supplier: await createPosSupplier(guard.auth.businessId, body) }, { status: 201 });
  } catch (err) {
    return posErrorResponse(err);
  }
}
