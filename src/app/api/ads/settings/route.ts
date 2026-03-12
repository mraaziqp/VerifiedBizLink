import { NextResponse } from 'next/server';
import db from '@/lib/db';

// GET /api/ads/settings — returns whether ads are globally enabled
export async function GET() {
  try {
    const result = await db`
      SELECT value FROM ad_settings WHERE key = 'ads_enabled' LIMIT 1
    `;
    const enabled = result.length === 0 || result[0].value === 'true';
    return NextResponse.json({ enabled });
  } catch {
    // If table doesn't exist yet, default to enabled
    return NextResponse.json({ enabled: true });
  }
}
