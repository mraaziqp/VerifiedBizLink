import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  hub,
  linkCustomer,
  studioAccess,
  studioConfigured,
  getStudioSettings,
  BUILTIN_STUDIO_ITEMS,
  type StudioCredits,
  type StudioItem,
} from '@/lib/studio';

/**
 * GET /api/studio — everything the Build Studio page opens with:
 * whether this member may order, the catalogue at their tier's price,
 * their credit, and whether the studio is live.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  const access = await studioAccess(session);
  const settings = await getStudioSettings();

  // If studio is switched off by admin, regular members see the connecting notice
  if (!settings.isLive && !access.staff) {
    return NextResponse.json({
      access,
      configured: false,
      isLive: false,
      ordersOpen: false,
      items: [],
      credits: null,
    });
  }

  // If external partner hub is configured, query the live hub
  if (studioConfigured()) {
    try {
      const catalog = await hub<{ ordersOpen: boolean; items: StudioItem[] }>(
        `/catalog${access.tier ? `?tier=${encodeURIComponent(access.tier)}` : ''}`
      );
      let credits: StudioCredits | null = null;
      if (access.allowed && session) credits = (await linkCustomer(session, access)).credits;
      const items = access.allowed
        ? [...catalog.items, ...BUILTIN_STUDIO_ITEMS]
        : [...catalog.items, ...BUILTIN_STUDIO_ITEMS].map((item) => ({ ...item, price: item.listPrice, discountPct: 0 }));

      return NextResponse.json({
        access,
        configured: true,
        isLive: true,
        ordersOpen: catalog.ordersOpen,
        items,
        credits,
      });
    } catch {
      // The hub is unreachable: the storefront templates still work (they are ours).
      return NextResponse.json({
        access,
        configured: true,
        isLive: true,
        ordersOpen: true,
        items: BUILTIN_STUDIO_ITEMS,
        credits: null,
        notice: 'Websites and apps could not be loaded just now. Storefront templates are available below.',
      });
    }
  }

  // When partner key is pending but studio is live, serve built-in templates
  return NextResponse.json({
    access,
    configured: true,
    isLive: true,
    ordersOpen: true,
    items: BUILTIN_STUDIO_ITEMS,
    credits: null,
  });
}
