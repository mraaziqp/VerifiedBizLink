import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

async function ownsImage(userId: string, imageId: string) {
  const rows = await db`
    SELECT g.id FROM business_gallery g
    JOIN businesses b ON b.id = g.business_id
    WHERE g.id = ${imageId} AND b.user_id = ${userId}
    LIMIT 1
  `;
  return rows.length > 0;
}

// PATCH /api/business/gallery/[id] — rename a photo
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (!(await ownsImage(session.id, id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { title } = await request.json();
  const [image] = await db`
    UPDATE business_gallery SET title = ${title || ''} WHERE id = ${id}
    RETURNING id, image_url, title, created_at
  `;
  return NextResponse.json({ image });
}

// DELETE /api/business/gallery/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (!(await ownsImage(session.id, id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await db`DELETE FROM business_gallery WHERE id = ${id}`;
  return NextResponse.json({ success: true });
}
