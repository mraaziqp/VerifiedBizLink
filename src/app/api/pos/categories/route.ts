import { NextRequest, NextResponse } from 'next/server';
import { getPosAuth } from '@/lib/pos/auth-helper';
import { getPosCategories, createPosCategory } from '@/lib/pos/pos-service';

export async function GET(req: NextRequest) {
  const auth = await getPosAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const categories = await getPosCategories(auth.businessId);
  return NextResponse.json({ categories });
}

export async function POST(req: NextRequest) {
  const auth = await getPosAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (!body.name) return NextResponse.json({ error: 'Category name is required.' }, { status: 400 });

  const category = await createPosCategory(auth.businessId, body.name, body.color || '#d97706');
  return NextResponse.json({ success: true, category });
}
