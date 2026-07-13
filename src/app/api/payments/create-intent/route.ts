import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

interface PaymentIntent {
  clientSecret: string;
  amount: number;
  currency: string;
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { planType, billingCycle } = await request.json();

    if (!planType || !billingCycle) {
      return NextResponse.json({ error: 'Missing plan details' }, { status: 400 });
    }

    // Define pricing
    const pricing: Record<string, Record<string, number>> = {
      premium: { monthly: 5000, annual: 50000 }, // R50/month or R500/year in cents
      enterprise: { monthly: 15000, annual: 150000 }, // R150/month or R1500/year
    };

    if (!pricing[planType] || !pricing[planType][billingCycle]) {
      return NextResponse.json({ error: 'Invalid plan type' }, { status: 400 });
    }

    const amount = pricing[planType][billingCycle];

    // TODO: Integrate with Stripe API
    // For now, return mock payment intent
    const mockIntent: PaymentIntent = {
      clientSecret: `pi_test_${Date.now()}_secret_${Math.random().toString(36).substr(2, 9)}`,
      amount,
      currency: 'ZAR',
    };

    // Store payment intent in database
    await db`
      INSERT INTO payments (user_id, plan_type, amount, status, created_at)
      VALUES (${session.id}, ${planType}, ${amount}, 'pending', NOW())
    `;

    return NextResponse.json({
      success: true,
      clientSecret: mockIntent.clientSecret,
      amount: mockIntent.amount,
      currency: mockIntent.currency,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Payment intent creation error:', errorMsg);
    return NextResponse.json(
      { error: 'Failed to create payment intent', detail: errorMsg },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get user's payment history
    const payments = await db`
      SELECT id, plan_type, amount, status, created_at
      FROM payments
      WHERE user_id = ${session.id}
      ORDER BY created_at DESC
      LIMIT 10
    `;

    return NextResponse.json(
      { success: true, payments },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    );
  } catch (error) {
    console.error('Payment history fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}
