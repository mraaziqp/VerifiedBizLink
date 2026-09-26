import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { listBuilds } from '@/lib/app-builds';

export const dynamic = 'force-dynamic';

/** GET /api/admin/app-builds — Android test builds. Admins only. */
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  }
  try {
    const result = await listBuilds();
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('app-builds list error:', error);
    return NextResponse.json({ ok: false, reason: 'error', message: 'Could not load builds.' }, { status: 500 });
  }
}
