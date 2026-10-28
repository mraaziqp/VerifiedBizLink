import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { ensureShowcaseSchema } from '@/lib/showcase-schema';
import { isStaffRole } from '@/lib/roles';
import { cleanImageUrl, getStorefront, managedBusiness, storefrontsVisibleTo, UUID_REGEX } from '@/lib/storefront';
import db from '@/lib/db';

/**
 * GET  /api/business/showcase?businessId=…  a storefront's products and specials
 * POST /api/business/showcase { action: 'save_item' | 'delete_item', … }  the owner's changes
 *
 * The storefront itself (template, design, publishing) is /api/business/storefront.
 * Visitors see the items of a published storefront; the owner and staff always do.
 * Before Build Studio is live, staff only.
 */

const MAX_PRICE_RAND = 10_000_000;

const notFound = () => NextResponse.json({ error: 'This storefront is not available.' }, { status: 404 });

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!(await storefrontsVisibleTo(session))) return notFound();
    await ensureShowcaseSchema();
    const businessId = request.nextUrl.searchParams.get('businessId') ?? '';
    if (!UUID_REGEX.test(businessId)) {
      return NextResponse.json({ error: 'Valid business ID required' }, { status: 400 });
    }

    const [business] = await db`SELECT id, user_id FROM businesses WHERE id = ${businessId}::uuid LIMIT 1`;
    if (!business) return notFound();
    const canManage = Boolean(session && (session.id === business.user_id || isStaffRole(session.role)));
    const storefront = await getStorefront(businessId);
    if (!storefront.published && !canManage) return notFound();

    const items = await db`
      SELECT id, title, description, price_cents, special_price_cents,
             category, image_url, is_in_stock, is_featured, created_at
      FROM business_showcase_items
      WHERE business_id = ${businessId}::uuid
      ORDER BY is_featured DESC, created_at DESC
    `;

    return NextResponse.json({
      items: items.map((r) => ({
        id: String(r.id),
        title: r.title,
        description: r.description,
        priceRand: Number(r.price_cents) / 100,
        specialPriceRand: r.special_price_cents !== null ? Number(r.special_price_cents) / 100 : null,
        category: r.category,
        imageUrl: r.image_url,
        isInStock: Boolean(r.is_in_stock),
        isFeatured: Boolean(r.is_featured),
        createdAt: r.created_at,
      })),
    });
  } catch (error) {
    console.error('Showcase fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch showcase items' }, { status: 500 });
  }
}

/** Rand to cents: null when blank, NaN when not a sensible price. */
const toCents = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= MAX_PRICE_RAND ? Math.round(n * 100) : NaN;
};

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
    if (!(await storefrontsVisibleTo(session))) return notFound();
    await ensureShowcaseSchema();

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const business = await managedBusiness(session, body.businessId);
    if (!business) {
      return NextResponse.json({ error: 'You can only change your own business’s storefront.' }, { status: 403 });
    }

    if (body.action === 'save_item') {
      const storefront = await getStorefront(business.id);
      if (storefront.owned.length === 0) {
        return NextResponse.json({ error: 'Choose a storefront template first.' }, { status: 402 });
      }
      const item = (body.item && typeof body.item === 'object' ? body.item : {}) as Record<string, unknown>;
      const title = typeof item.title === 'string' ? item.title.trim().slice(0, 120) : '';
      const priceCents = toCents(item.priceRand);
      const specialCents = toCents(item.specialPriceRand);
      if (!title) return NextResponse.json({ error: 'Give it a name.' }, { status: 400 });
      if (priceCents === null || Number.isNaN(priceCents)) {
        return NextResponse.json({ error: 'Enter a price from R0 to R10,000,000.' }, { status: 400 });
      }
      if (specialCents !== null && Number.isNaN(specialCents)) {
        return NextResponse.json({ error: 'The special price must be a number.' }, { status: 400 });
      }
      if (specialCents !== null && specialCents >= priceCents) {
        return NextResponse.json({ error: 'A special price has to be lower than the regular price.' }, { status: 400 });
      }
      const description = typeof item.description === 'string' ? item.description.trim().slice(0, 1500) || null : null;
      const category = (typeof item.category === 'string' ? item.category.trim().slice(0, 40) : '') || 'General';
      const imageUrl = item.imageUrl ? cleanImageUrl(item.imageUrl) : null;
      if (item.imageUrl && !imageUrl) return NextResponse.json({ error: 'The photo could not be used. Upload it again.' }, { status: 400 });
      const id = typeof item.id === 'string' && UUID_REGEX.test(item.id) ? item.id : null;
      if (item.id && !id) return NextResponse.json({ error: 'That item no longer exists. Refresh the page.' }, { status: 404 });

      if (id) {
        const rows = await db`
          UPDATE business_showcase_items
          SET title = ${title}, description = ${description}, price_cents = ${priceCents},
              special_price_cents = ${specialCents}, category = ${category}, template = ${storefront.template},
              image_url = ${imageUrl}, is_in_stock = ${item.isInStock !== false}, is_featured = ${item.isFeatured === true},
              updated_at = NOW()
          WHERE id = ${id}::uuid AND business_id = ${business.id}::uuid
          RETURNING id
        `;
        if (!rows.length) return NextResponse.json({ error: 'That item no longer exists. Refresh the page.' }, { status: 404 });
      } else {
        const [{ count }] = await db`SELECT COUNT(*)::int AS count FROM business_showcase_items WHERE business_id = ${business.id}::uuid`;
        if (Number(count) >= 500) return NextResponse.json({ error: 'A storefront holds up to 500 items. Remove some first.' }, { status: 400 });
        await db`
          INSERT INTO business_showcase_items (
            business_id, template, title, description, price_cents, special_price_cents,
            category, image_url, is_in_stock, is_featured
          ) VALUES (
            ${business.id}::uuid, ${storefront.template}, ${title}, ${description},
            ${priceCents}, ${specialCents}, ${category}, ${imageUrl},
            ${item.isInStock !== false}, ${item.isFeatured === true}
          )
        `;
      }
      return NextResponse.json({ success: true, message: 'Saved' });
    }

    if (body.action === 'delete_item') {
      const itemId = typeof body.itemId === 'string' && UUID_REGEX.test(body.itemId) ? body.itemId : null;
      if (!itemId) return NextResponse.json({ error: 'Missing item ID' }, { status: 400 });
      await db`
        DELETE FROM business_showcase_items
        WHERE id = ${itemId}::uuid AND business_id = ${business.id}::uuid
      `;
      return NextResponse.json({ success: true, message: 'Item deleted' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Showcase save error:', error);
    return NextResponse.json({ error: 'Failed to save showcase item' }, { status: 500 });
  }
}
