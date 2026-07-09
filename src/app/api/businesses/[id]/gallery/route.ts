import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET /api/businesses/[id]/gallery — public: anyone viewing a business profile
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const images = await db`
    SELECT id, image_url, title, created_at FROM business_gallery
    WHERE business_id = ${id}
    ORDER BY created_at DESC
    LIMIT 30
  `;
  return NextResponse.json({ images });
}
