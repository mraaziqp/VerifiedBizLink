import { NextResponse } from 'next/server';
import { getAllTiers } from '@/lib/tiers';

// GET /api/tiers — public list of active tiers (pricing page, billing tab).
// Admin-managed via /api/admin/tiers; this is the read-only public mirror.
export async function GET() {
  try {
    const tiers = await getAllTiers();
    return NextResponse.json({ tiers });
  } catch (error) {
    console.error('Tiers GET error:', error);
    return NextResponse.json({ error: 'Failed to load tiers' }, { status: 500 });
  }
}
