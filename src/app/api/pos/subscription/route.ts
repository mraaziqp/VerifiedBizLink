import { NextRequest, NextResponse } from 'next/server';
import { getPosAuth } from '@/lib/pos/auth-helper';
import { getPosSubscriptionPlans, getMerchantPosSubscription, subscribeToPos } from '@/lib/pos/pos-service';

export async function GET(req: NextRequest) {
  const auth = await getPosAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [plans, subscription] = await Promise.all([
    getPosSubscriptionPlans(),
    getMerchantPosSubscription(auth.businessId),
  ]);

  return NextResponse.json({ plans, subscription });
}

export async function POST(req: NextRequest) {
  const auth = await getPosAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (auth.posRole !== 'owner') {
    return NextResponse.json({ error: 'Only business owners can change POS subscriptions.' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { planKey, setupFeePaid } = body;

  if (!planKey) return NextResponse.json({ error: 'Plan key required' }, { status: 400 });

  const updated = await subscribeToPos(auth.businessId, planKey, Boolean(setupFeePaid));
  return NextResponse.json({ success: true, subscription: updated });
}
