import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { isStaffRole } from '@/lib/roles';
import { hub, StudioError, type StudioOrder } from '@/lib/studio';
import {
  grantTemplate,
  getStorefront,
  isHouseBusiness,
  isStorefrontTemplate,
  managedBusiness,
  priceFor,
  saveStorefront,
  setStudioSite,
  storefrontsVisibleTo,
  StorefrontError,
  TEMPLATE_INFO,
  UUID_REGEX,
} from '@/lib/storefront';

/**
 * GET  /api/business/storefront?businessId=…   the storefront, for its page and the profile
 * POST /api/business/storefront { action, … }  the owner's changes:
 *   save        { template?, headline?, tagline?, accent?, coverUrl?, whatsapp?, published? }
 *   claim       { template }        a template that costs this business nothing (staff, VerifiedBizLink's own)
 *   link_site   { orderId }         show a studio-built website on the profile
 *   unlink_site
 *   grant       { email, template } staff: give a member's business a template
 *
 * Paid templates go through POST /api/business/storefront/purchase (PayFast).
 * Before Build Studio is live, all of this answers staff only.
 */
export const dynamic = 'force-dynamic';

const notFound = () => NextResponse.json({ error: 'This storefront is not available.' }, { status: 404 });

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!(await storefrontsVisibleTo(session))) return notFound();
  const businessId = request.nextUrl.searchParams.get('businessId') ?? '';
  if (!UUID_REGEX.test(businessId)) return NextResponse.json({ error: 'Valid business ID required' }, { status: 400 });

  const [business] = await db`
    SELECT id, user_id, COALESCE(company_name, name) AS name, status, logo_url, phone, description, industry, location
    FROM businesses WHERE id = ${businessId}::uuid LIMIT 1
  `;
  if (!business) return notFound();
  const canManage = Boolean(session && (session.id === business.user_id || isStaffRole(session.role)));
  const storefront = await getStorefront(businessId);
  if (!storefront.published && !canManage) {
    // The profile asks whether to show its links: nothing to show is an answer, not an error.
    if (request.nextUrl.searchParams.get('summary') === '1') {
      return NextResponse.json({ visible: false, published: false, siteUrl: storefront.siteUrl, siteTitle: storefront.siteTitle, canManage });
    }
    return notFound();
  }

  if (request.nextUrl.searchParams.get('summary') === '1') {
    return NextResponse.json({ visible: true, published: storefront.published, siteUrl: storefront.siteUrl, siteTitle: storefront.siteTitle, canManage });
  }

  const free = canManage && session ? (isStaffRole(session.role) || (await isHouseBusiness(businessId))) : false;
  const templates = canManage && session
    ? await Promise.all(
        TEMPLATE_INFO.map(async (t) => ({ ...t, owned: storefront.owned.includes(t.id), yourPrice: await priceFor(t.id, session, businessId) })),
      )
    : [];

  return NextResponse.json({
    business: {
      id: String(business.id),
      name: String(business.name ?? ''),
      verified: business.status === 'verified',
      logoUrl: business.logo_url ?? null,
      phone: business.phone ?? null,
      description: business.description ?? null,
      industry: business.industry ?? null,
      location: business.location ?? null,
    },
    storefront,
    canManage,
    free,
    templates,
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  if (!(await storefrontsVisibleTo(session))) return notFound();
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  try {
    if (body.action === 'grant') {
      if (!isStaffRole(session.role)) return NextResponse.json({ error: 'Staff only.' }, { status: 403 });
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      if (!isStorefrontTemplate(body.template)) return NextResponse.json({ error: 'Choose a template.' }, { status: 400 });
      const [biz] = await db`
        SELECT b.id, COALESCE(b.company_name, b.name) AS name FROM businesses b JOIN users u ON u.id = b.user_id
        WHERE LOWER(u.email) = ${email} ORDER BY b.updated_at DESC NULLS LAST LIMIT 1
      `;
      if (!biz) return NextResponse.json({ error: 'No business is listed under that email.' }, { status: 404 });
      const result = await grantTemplate({ businessId: String(biz.id), template: body.template, source: 'granted', grantedBy: session.id });
      await db`
        INSERT INTO audit_logs (admin_id, admin_name, action, target_type, target_id, target_name)
        VALUES (${session.id}, ${session.fullName}, ${`Gave the ${body.template} storefront template`}, 'business', ${String(biz.id)}, ${String(biz.name)})
      `.catch(() => undefined);
      return NextResponse.json({
        success: true,
        message: result.granted ? `${biz.name} now has the ${body.template} template.` : `${biz.name} already had that template.`,
      });
    }

    const business = await managedBusiness(session, body.businessId);
    if (!business) return NextResponse.json({ error: 'You can only change your own business’s storefront.' }, { status: 403 });

    if (body.action === 'save') {
      return NextResponse.json({ success: true, storefront: await saveStorefront(business.id, body) });
    }

    if (body.action === 'claim') {
      if (!isStorefrontTemplate(body.template)) return NextResponse.json({ error: 'Choose a template.' }, { status: 400 });
      if ((await priceFor(body.template, session, business.id)) > 0) {
        return NextResponse.json({ error: 'This template is paid for at checkout.', checkout: true }, { status: 402 });
      }
      await grantTemplate({ businessId: business.id, template: body.template, source: 'complimentary', grantedBy: session.id });
      return NextResponse.json({ success: true, storefront: await getStorefront(business.id) });
    }

    if (body.action === 'link_site') {
      const orderId = typeof body.orderId === 'string' ? body.orderId.slice(0, 80) : '';
      if (!orderId) return NextResponse.json({ error: 'Choose the project to show.' }, { status: 400 });
      // The hub answers only for the owner's own orders, so this also proves it is theirs.
      const { order } = await hub<{ order: StudioOrder }>(`/orders/${encodeURIComponent(orderId)}?externalId=${encodeURIComponent(business.userId)}`);
      if (!order.previewUrl || !['ready', 'delivered'].includes(order.stage)) {
        return NextResponse.json({ error: 'It can go on your profile once the studio has a version to look at.' }, { status: 409 });
      }
      const storefront = await setStudioSite(business.id, { url: order.previewUrl, title: order.businessName || order.itemName, orderId: order.id });
      return NextResponse.json({ success: true, storefront });
    }

    if (body.action === 'unlink_site') {
      return NextResponse.json({ success: true, storefront: await setStudioSite(business.id, null) });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    if (error instanceof StorefrontError || error instanceof StudioError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Storefront change failed:', error);
    return NextResponse.json({ error: 'Could not save that just now. Please try again.' }, { status: 500 });
  }
}
