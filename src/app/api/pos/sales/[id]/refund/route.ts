import { NextRequest, NextResponse } from 'next/server';
import { getPosAuth } from '@/lib/pos/auth-helper';
import { refundPosSale } from '@/lib/pos/pos-service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getPosAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Cashiers cannot issue refunds without manager or owner role
  if (auth.posRole === 'cashier') {
    return NextResponse.json({ error: 'Cashiers are not authorized to process refunds. Please call a manager.' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { restockItems, reason } = body;

  try {
    const refunded = await refundPosSale(
      auth.businessId,
      id,
      restockItems !== false,
      reason || 'Customer refund',
      auth.session.id
    );
    return NextResponse.json({ success: true, sale: refunded });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not process refund.' },
      { status: 400 }
    );
  }
}
