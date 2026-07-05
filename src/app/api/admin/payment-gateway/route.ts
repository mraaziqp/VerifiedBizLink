import db from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getSession, isStaff } from '@/lib/auth';

// GET payment gateway configuration
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!isStaff(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const config = {
      stripe: {
        public_key: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
        configured: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      },
      paypal: {
        client_id: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '',
        configured: !!process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID,
      },
      fallback_gateway: 'stripe', // default payment processor
    };

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching payment config:', error);
    return NextResponse.json({ error: 'Failed to fetch configuration' }, { status: 500 });
  }
}

// POST update payment gateway configuration
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!isStaff(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { stripe_key, paypal_client_id, fallback_gateway } = body;

    // In production, store these securely in environment or secret manager
    // For now, we'll just validate the request
    if (!stripe_key && !paypal_client_id) {
      return NextResponse.json(
        { error: 'At least one payment gateway must be configured' },
        { status: 400 }
      );
    }

    // Note: In production, use Stripe's API to create products/prices
    // Update tier's stripe_product_id and stripe_price_id

    return NextResponse.json({
      message: 'Payment gateway configuration updated',
      configured: {
        stripe: !!stripe_key,
        paypal: !!paypal_client_id,
      },
    });
  } catch (error) {
    console.error('Error updating payment config:', error);
    return NextResponse.json({ error: 'Failed to update configuration' }, { status: 500 });
  }
}

// Helper to fetch Stripe products (used internally)
async function getStripeProducts(req: NextRequest) {
  try {
    // This would call Stripe API to fetch available products
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 400 }
      );
    }

    // For now, return list of tiers with stripe IDs
    const tiers = await db`
      SELECT id, name, stripe_product_id, stripe_price_id
      FROM subscription_tiers
      WHERE is_active = true
    `;

    return NextResponse.json(tiers);
  } catch (error) {
    console.error('Error fetching Stripe products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
