import { NextRequest, NextResponse } from 'next/server';
import { CANONICAL_ORIGIN } from '@/lib/site-url';
import { hub, linkCustomer } from '@/lib/studio';
import { studioFailure, studioMember } from '@/lib/studio-route';
import { rateLimit } from '@/lib/rate-limit';
import { notifyJarvis } from '@/lib/jarvis';

/**
 * POST /api/studio/checkout { itemId, businessName, brief, useCredits }
 *
 * Orders a build at the subscriber's price. Answers { orderId, paid: true }
 * when credit covered it (the build starts now), or { payUrl } for the secure
 * payment page, which brings them back to their project here afterwards.
 */
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const member = await studioMember();
  if (member instanceof NextResponse) return member;
  const limited = await rateLimit(`studio-checkout:${member.session.id}`, 10, 60 * 60);
  if (!limited.allowed) return NextResponse.json({ error: 'That is a lot of orders in an hour. Please try again later.' }, { status: 429 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const businessName = String(body.businessName ?? '').trim().slice(0, 120);
  const brief = String(body.brief ?? '').trim().slice(0, 4000);
  if (businessName.length < 2) return NextResponse.json({ error: 'Tell us the name of the business or project.' }, { status: 400 });
  if (brief.length < 20) return NextResponse.json({ error: 'Tell us a little more about what you need (a sentence or two).' }, { status: 400 });

  try {
    await linkCustomer(member.session, member.access);
    const result = await hub<{ orderId: string; paid: boolean; payUrl?: string; price: number; cash?: number }>('/checkout', {
      method: 'POST',
      body: {
        externalId: member.session.id,
        itemId: String(body.itemId ?? ''),
        businessName,
        brief,
        tier: member.access.tier,
        useCredits: body.useCredits !== false,
        returnUrl: `${CANONICAL_ORIGIN}/business/studio?order=`,
      },
      timeoutMs: 30_000,
    });
    await notifyJarvis({
      type: result.paid ? 'studio.order.paid_with_credit' : 'studio.order.placed',
      severity: 'notice',
      title: `Build Studio order: ${businessName}`,
      body: `${member.session.fullName || member.session.email} ordered ${String(body.itemId ?? '')} at R${result.price}${result.paid ? ', paid in full with studio credit; the build has started.' : `, R${result.cash ?? result.price} to pay on PayFast.`}`,
      entityId: result.orderId,
    });
    return NextResponse.json(result);
  } catch (error) {
    return studioFailure(error, 'Could not place the order.');
  }
}
