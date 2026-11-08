import { NextRequest, NextResponse } from 'next/server';
import { requirePosAccess } from '@/lib/pos/auth-helper';
import { updatePosProduct } from '@/lib/pos/pos-service';
import { posErrorResponse, readJson } from '@/lib/pos/errors';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePosAccess(req, 'catalog.write');
  if (!guard.ok) return guard.response;
  try {
    const { id } = await params;
    const body = await readJson(req);
    const product = await updatePosProduct(guard.auth.businessId, id, body);
    return NextResponse.json({ success: true, product });
  } catch (err) {
    return posErrorResponse(err);
  }
}
