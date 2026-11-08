import { NextRequest, NextResponse } from 'next/server';
import { runPosBillingSweep } from '@/lib/pos/pos-billing';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/cron/pos-billing — POS subscription & fee-statement sweep.
 *
 * Run hourly by .github/workflows/scheduled-jobs.yml (Amplify has no
 * scheduler). Time-based, so a missed run is only a late decision: overdue
 * renewals and statements go to grace, expired grace goes read-only, and on
 * the first run of each month last month's fee statements are issued.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await runPosBillingSweep();
  return NextResponse.json({ ok: result.errors === 0, ...result }, { status: result.errors ? 500 : 200 });
}
