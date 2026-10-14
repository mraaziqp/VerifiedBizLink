import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { hub, linkCustomer, studioAccess, studioConfigured, StudioError, type StudioCredits, type StudioItem } from '@/lib/studio';

/**
 * GET /api/studio — everything the Build Studio page opens with: whether this
 * member may order (paid subscribers, and staff), the catalogue at their
 * tier's price, their credit, and whether orders are open yet.
 *
 * Non-subscribers get the catalogue too (at list price, nothing orderable),
 * so the page can show what a subscription unlocks.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  const access = await studioAccess(session);
  if (!studioConfigured()) {
    return NextResponse.json({ access, configured: false, ordersOpen: false, items: [], credits: null });
  }
  try {
    const catalog = await hub<{ ordersOpen: boolean; items: StudioItem[] }>(`/catalog${access.tier ? `?tier=${encodeURIComponent(access.tier)}` : ''}`);
    let credits: StudioCredits | null = null;
    if (access.allowed && session) credits = (await linkCustomer(session, access)).credits;
    // Before subscribing, the price shown is the list price: the subscriber price is the reason to subscribe.
    const items = access.allowed ? catalog.items : catalog.items.map((item) => ({ ...item, price: item.listPrice, discountPct: 0 }));
    return NextResponse.json({ access, configured: true, ordersOpen: catalog.ordersOpen, items, credits });
  } catch (error) {
    const status = error instanceof StudioError ? error.status : 502;
    return NextResponse.json({ access, configured: true, error: error instanceof Error ? error.message : 'The studio is unavailable.' }, { status });
  }
}
