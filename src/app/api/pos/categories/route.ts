import { NextRequest, NextResponse } from 'next/server';
import { requirePosAccess } from '@/lib/pos/auth-helper';
import { getPosCategories, createPosCategory } from '@/lib/pos/pos-service';
import { posErrorResponse, readJson } from '@/lib/pos/errors';

export async function GET(req: NextRequest) {
  const guard = await requirePosAccess(req, 'catalog.read');
  if (!guard.ok) return guard.response;
  try {
    return NextResponse.json({ categories: await getPosCategories(guard.auth.businessId) });
  } catch (err) {
    return posErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  const guard = await requirePosAccess(req, 'catalog.write');
  if (!guard.ok) return guard.response;
  try {
    const body = await readJson(req);
    const category = await createPosCategory(guard.auth.businessId, body.name, body.color);
    return NextResponse.json({ success: true, category }, { status: 201 });
  } catch (err) {
    return posErrorResponse(err);
  }
}
