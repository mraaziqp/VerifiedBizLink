import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createPayfastCheckout } from '@/lib/payfast-checkout-server';
import { rateLimit } from '@/lib/rate-limit';
import { getStorefront, isStorefrontTemplate, managedBusiness, priceFor, storefrontsVisibleTo, TEMPLATE_INFO } from '@/lib/storefront';

/**
 * POST /api/business/storefront/purchase { template } — buy a storefront
 * template for the signed-in owner's business. Answers the signed PayFast
 * form (for startPayfastCheckout); the PayFast notification grants the
 * template (purchaseType "showcase_template", the template in custom_str4).
 *
 * Priced here, never by the browser: the member price on a paid plan, the
 * list price otherwise. A template that costs this business nothing is
 * claimed through POST /api/business/storefront { action: "claim" } instead.
 */
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  if (!(await storefrontsVisibleTo(session))) return NextResponse.json({ error: 'Storefronts are not open yet.' }, { status: 404 });
  const limited = await rateLimit(`storefront-purchase:${session.id}`, 10, 60 * 60);
  if (!limited.allowed) return NextResponse.json({ error: 'Too many attempts in an hour. Please try again later.' }, { status: 429 });

  const body = (await request.json().catch(() => ({}))) as { template?: unknown };
  if (!isStorefrontTemplate(body.template)) return NextResponse.json({ error: 'Choose a template.' }, { status: 400 });
  const template = body.template;

  // Bought for the buyer's own business: the notification grants it to that one.
  const business = await managedBusiness(session);
  if (!business || business.userId !== session.id) {
    return NextResponse.json({ error: 'List your business first, then choose its storefront.' }, { status: 400 });
  }
  const storefront = await getStorefront(business.id);
  if (storefront.owned.includes(template)) return NextResponse.json({ error: 'You already have this template.' }, { status: 409 });

  const price = await priceFor(template, session, business.id);
  if (price <= 0) return NextResponse.json({ error: 'This template is free for you — claim it instead.', claim: true }, { status: 409 });
  const info = TEMPLATE_INFO.find((t) => t.id === template)!;

  const checkout = await createPayfastCheckout({
    session,
    amount: price,
    description: `${info.label} storefront template`,
    purchaseType: 'showcase_template',
    packId: template,
    returnPath: `/business/${business.id}/specials`,
  });
  if (!checkout.ok) return NextResponse.json({ error: checkout.error }, { status: checkout.status });
  return NextResponse.json({ success: true, paymentRef: checkout.paymentRef, payfastUrl: checkout.payfastUrl, data: checkout.data, signature: checkout.signature });
}
