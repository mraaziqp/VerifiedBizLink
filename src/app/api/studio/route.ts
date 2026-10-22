import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  hub,
  linkCustomer,
  studioAccess,
  studioConfigured,
  getStudioSettings,
  type StudioCredits,
  type StudioItem,
} from '@/lib/studio';

/**
 * GET /api/studio — everything the Build Studio page opens with:
 * whether this member may order, the catalogue at their tier's price,
 * their credit, and whether the studio is live.
 */
export const dynamic = 'force-dynamic';

const BUILTIN_STUDIO_ITEMS: StudioItem[] = [
  {
    id: 'vbl-showcase-retail',
    name: 'Product Catalog & Specials Showcase',
    kind: 'template',
    category: 'Showcase',
    summary: 'Pick a template, have it hosted on VerifiedBizLink, and post your products, prices and specials with instant WhatsApp ordering.',
    features: [
      'Hosted on VerifiedBizLink directly',
      'Unlimited products, prices & sale tags',
      'Direct WhatsApp 1-tap customer ordering',
      'CIPC Gold Trust Badge embedded',
      '20% platform share model (keep 80%)',
    ],
    timeframe: 'Instant — live in minutes',
    previewUrl: null,
    coverUrl: null,
    listPrice: 499,
    price: 399,
    discountPct: 20,
    floor: 399,
    hidden: false,
  },
  {
    id: 'vbl-showcase-food',
    name: 'Restaurant, Cafe & Menu Deals',
    kind: 'template',
    category: 'Showcase',
    summary: 'Interactive food & drinks menu with chef daily specials, combo discounts, and table QR code support.',
    features: [
      'Category tabs (Mains, Starters, Drinks)',
      'Daily lunch & dinner specials',
      'Printable table QR code included',
      'Mobile-optimized for fast browsing',
    ],
    timeframe: 'Instant — live in minutes',
    previewUrl: null,
    coverUrl: null,
    listPrice: 599,
    price: 479,
    discountPct: 20,
    floor: 479,
    hidden: false,
  },
  {
    id: 'vbl-custom-website',
    name: 'Custom Verified Business Website',
    kind: 'website',
    category: 'Website',
    summary: 'A complete bespoke business website built for you by ARP Cloud Solutions & VerifiedBizLink, connected to Google and PayFast.',
    features: [
      '5-8 Custom pages with luxury branding',
      'PayFast checkout & contact forms',
      'SEO & Google Maps local ranking setup',
      'Edit words & sections yourself anytime',
    ],
    timeframe: '5 - 7 business days',
    previewUrl: null,
    coverUrl: null,
    listPrice: 4999,
    price: 3999,
    discountPct: 20,
    floor: 3999,
    hidden: false,
  },
  {
    id: 'vbl-mobile-app',
    name: 'PWA Mobile App & Member Portal',
    kind: 'app',
    category: 'App',
    summary: 'Installable mobile app for iOS and Android with push notifications, client appointments, and customer loyalty rewards.',
    features: [
      'Installable on iPhone & Android',
      'Push notification broadcast tool',
      'Member loyalty & rewards system',
      'Full source code access',
    ],
    timeframe: '7 - 10 business days',
    previewUrl: null,
    coverUrl: null,
    listPrice: 8999,
    price: 7199,
    discountPct: 20,
    floor: 7199,
    hidden: false,
  },
];

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
    } catch (_error) {
      // Fallback gracefully to built-in templates
      return NextResponse.json({
        access,
        configured: true,
        isLive: true,
        ordersOpen: true,
        items: BUILTIN_STUDIO_ITEMS,
        credits: null,
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
