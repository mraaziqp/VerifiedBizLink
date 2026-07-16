import { NextResponse } from 'next/server';
import { getAllTiers } from '@/lib/tiers';

// GET /api/tiers — public storefront list: active AND purchasable tiers
// (pricing page, billing tab, onboarding). Trial-only tiers (auto-granted,
// never manually bought) are excluded here but still visible to admins via
// /api/admin/tiers, which is the read-only public mirror of that.
export async function GET() {
  try {
    const tiers = (await getAllTiers()).filter((t) => t.isPurchasable);
    return NextResponse.json({ tiers });
  } catch (error) {
    console.error('Tiers GET error:', error);
    return NextResponse.json({ error: 'Failed to load tiers' }, { status: 500 });
  }
}
