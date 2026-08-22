import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { isStaff } from '@/lib/roles';

// GET /api/business/gallery — the current user's own business gallery
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const staffUser = isStaff(session.role);
  const targetBizId = request.nextUrl.searchParams.get('bizId');

  let bizId: string | null = null;

  if (staffUser && targetBizId) {
    bizId = targetBizId;
  } else {
    const ownBiz = await db`SELECT id FROM businesses WHERE user_id = ${session.id} LIMIT 1`;
    if (ownBiz.length > 0) {
      bizId = ownBiz[0].id;
    } else if (staffUser) {
      const firstBiz = await db`SELECT id FROM businesses ORDER BY created_at DESC LIMIT 1`;
      if (firstBiz.length > 0) bizId = firstBiz[0].id;
    }
  }

  if (!bizId) return NextResponse.json({ images: [] });

  const images = await db`
    SELECT id, image_url, title, created_at FROM business_gallery
    WHERE business_id = ${bizId}
    ORDER BY created_at DESC
  `;
  return NextResponse.json({ images });
}

// POST /api/business/gallery — add an image (already uploaded via /api/media/upload)
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const staffUser = isStaff(session.role);
  const { imageUrl, title, bizId: targetBizId } = await request.json();
  if (!imageUrl) return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });

  let bizId: string | null = null;
  if (staffUser && targetBizId) {
    bizId = targetBizId;
  } else {
    const ownBiz = await db`SELECT id FROM businesses WHERE user_id = ${session.id} LIMIT 1`;
    if (ownBiz.length > 0) {
      bizId = ownBiz[0].id;
    } else if (staffUser) {
      const firstBiz = await db`SELECT id FROM businesses ORDER BY created_at DESC LIMIT 1`;
      if (firstBiz.length > 0) bizId = firstBiz[0].id;
    }
  }

  if (!bizId) {
    return NextResponse.json({ error: 'Create your business profile first' }, { status: 400 });
  }

  const [image] = await db`
    INSERT INTO business_gallery (business_id, image_url, title)
    VALUES (${bizId}, ${imageUrl}, ${title || ''})
    RETURNING id, image_url, title, created_at
  `;
  return NextResponse.json({ image }, { status: 201 });
}
