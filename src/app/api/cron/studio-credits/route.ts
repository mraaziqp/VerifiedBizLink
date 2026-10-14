import { NextRequest, NextResponse } from 'next/server';
import { grantMonthlyCredits } from '@/lib/studio';
import { notifyJarvis } from '@/lib/jarvis';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

/**
 * GET /api/cron/studio-credits
 *
 * Runs daily. Gives every active subscriber this month's Build Studio credit
 * at their tier's amount (Admin -> Build Studio). Each grant is keyed by the
 * month at the hub, so the first run of a month gives it and every later run
 * that month skips them: a missed day only delays it.
 */
export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await grantMonthlyCredits();
    if (result.granted || result.failed) {
      await notifyJarvis({
        type: result.failed ? 'studio.allowance.failed' : 'studio.allowance',
        severity: result.failed ? 'warn' : 'info',
        title: `Studio monthly credit ${result.month}: ${result.granted} given${result.failed ? `, ${result.failed} failed` : ''}`,
        entityId: result.month,
      });
    }
    return NextResponse.json({ ok: true, ...result, errors: result.failed });
  } catch (error) {
    console.error('Studio credit run failed', error);
    return NextResponse.json({ error: 'Studio credit run failed' }, { status: 500 });
  }
}
