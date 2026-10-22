import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { ensureShowcaseSchema } from '@/lib/showcase-schema';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    await ensureShowcaseSchema();
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const session = await getSession();

    let targetBusinessId = businessId;

    // If no businessId provided, try to find the current user's business
    if (!targetBusinessId && session) {
      const [b] = await db`
        SELECT id FROM businesses WHERE user_id = ${session.id} LIMIT 1
      `;
      targetBusinessId = b?.id ? String(b.id) : null;
    }

    if (!targetBusinessId) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    const [business] = await db`
      SELECT id, user_id, company_name, name, status, logo_url, trust_score, phone, description, industry, location
      FROM businesses WHERE id = ${targetBusinessId}::uuid LIMIT 1
    `;

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const isOwner = Boolean(session && (session.id === business.user_id || ['admin', 'banker', 'lawyer'].includes(session.role)));

    const items = await db`
      SELECT id, business_id, template, title, description, price_cents, special_price_cents,
             category, image_url, is_in_stock, is_featured, created_at, updated_at
      FROM business_showcase_items
      WHERE business_id = ${targetBusinessId}::uuid
      ORDER BY is_featured DESC, created_at DESC
    `;

    const activeTemplate = items[0]?.template || 'retail';

    return NextResponse.json({
      business: {
        id: business.id,
        name: business.company_name || business.name,
        status: business.status,
        logoUrl: business.logo_url,
        trustScore: business.trust_score,
        phone: business.phone,
        description: business.description,
        industry: business.industry,
        location: business.location,
      },
      template: activeTemplate,
      isOwner,
      items: items.map((r) => ({
        id: r.id,
        template: r.template,
        title: r.title,
        description: r.description,
        priceCents: Number(r.price_cents),
        priceRand: Number(r.price_cents) / 100,
        specialPriceCents: r.special_price_cents !== null ? Number(r.special_price_cents) : null,
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

export async function POST(request: NextRequest) {
  try {
    await ensureShowcaseSchema();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const { action, businessId, item, template, itemId } = body;

    // Verify ownership
    let targetBizId = businessId;
    const [biz] = await db`
      SELECT id, user_id FROM businesses
      WHERE id = ${targetBizId}::uuid OR user_id = ${session.id}
      LIMIT 1
    `;

    if (!biz || (biz.user_id !== session.id && !['admin', 'banker', 'lawyer'].includes(session.role))) {
      return NextResponse.json({ error: 'Forbidden. You do not own this business.' }, { status: 403 });
    }
    targetBizId = biz.id;

    if (action === 'set_template') {
      const tmpl = ['retail', 'food', 'services', 'deals'].includes(template) ? template : 'retail';
      await db`
        UPDATE business_showcase_items
        SET template = ${tmpl}, updated_at = NOW()
        WHERE business_id = ${targetBizId}::uuid
      `;
      return NextResponse.json({ success: true, template: tmpl });
    }

    if (action === 'save_item') {
      if (!item?.title || item.priceRand === undefined) {
        return NextResponse.json({ error: 'Title and price are required' }, { status: 400 });
      }

      const priceCents = Math.round(Number(item.priceRand) * 100);
      const specialPriceCents = item.specialPriceRand ? Math.round(Number(item.specialPriceRand) * 100) : null;
      const category = (item.category || 'General').trim();
      const itemTemplate = item.template || 'retail';

      if (item.id) {
        // Update existing item
        await db`
          UPDATE business_showcase_items
          SET title = ${item.title},
              description = ${item.description || null},
              price_cents = ${priceCents},
              special_price_cents = ${specialPriceCents},
              category = ${category},
              template = ${itemTemplate},
              image_url = ${item.imageUrl || null},
              is_in_stock = ${item.isInStock !== false},
              is_featured = ${Boolean(item.isFeatured)},
              updated_at = NOW()
          WHERE id = ${item.id}::uuid AND business_id = ${targetBizId}::uuid
        `;
      } else {
        // Create new item
        await db`
          INSERT INTO business_showcase_items (
            business_id, template, title, description, price_cents, special_price_cents,
            category, image_url, is_in_stock, is_featured
          ) VALUES (
            ${targetBizId}::uuid, ${itemTemplate}, ${item.title}, ${item.description || null},
            ${priceCents}, ${specialPriceCents}, ${category}, ${item.imageUrl || null},
            ${item.isInStock !== false}, ${Boolean(item.isFeatured)}
          )
        `;
      }

      return NextResponse.json({ success: true, message: 'Item saved successfully' });
    }

    if (action === 'delete_item') {
      if (!itemId) return NextResponse.json({ error: 'Missing item ID' }, { status: 400 });
      await db`
        DELETE FROM business_showcase_items
        WHERE id = ${itemId}::uuid AND business_id = ${targetBizId}::uuid
      `;
      return NextResponse.json({ success: true, message: 'Item deleted' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Showcase save error:', error);
    return NextResponse.json({ error: 'Failed to save showcase item' }, { status: 500 });
  }
}
