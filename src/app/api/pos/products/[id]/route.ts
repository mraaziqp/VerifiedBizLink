import { NextRequest, NextResponse } from 'next/server';
import { getPosAuth } from '@/lib/pos/auth-helper';
import { updatePosProduct } from '@/lib/pos/pos-service';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getPosAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (auth.posRole === 'cashier') {
    return NextResponse.json({ error: 'Insufficient permissions.' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const updated = await updatePosProduct(auth.businessId, id, body);
  return NextResponse.json({ success: true, product: updated });
}
