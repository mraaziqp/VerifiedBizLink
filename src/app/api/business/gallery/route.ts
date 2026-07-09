import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

// GET /api/business/gallery — the current user's own business gallery
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const biz = await db`SELECT id FROM businesses WHERE user_id = ${session.id} LIMIT 1`;
  if (biz.length === 0) return NextResponse.json({ images: [] });

  const images = await db`
    SELECT id, image_url, title, created_at FROM business_gallery
    WHERE business_id = ${biz[0].id}
    ORDER BY created_at DESC
  `;
  return NextResponse.json({ images });
}

// POST /api/business/gallery — add an image (already uploaded via /api/media/upload)
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { imageUrl, title } = await request.json();
  if (!imageUrl) return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });

  const biz = await db`SELECT id FROM businesses WHERE user_id = ${session.id} LIMIT 1`;
  if (biz.length === 0) {
    return NextResponse.json({ error: 'Create your business profile first' }, { status: 400 });
  }

  const [image] = await db`
    INSERT INTO business_gallery (business_id, image_url, title)
    VALUES (${biz[0].id}, ${imageUrl}, ${title || ''})
    RETURNING id, image_url, title, created_at
  `;
  return NextResponse.json({ image }, { status: 201 });
}
