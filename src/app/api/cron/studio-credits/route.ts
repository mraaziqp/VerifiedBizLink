import { NextRequest, NextResponse } from 'next/server';
import { cronAuthError } from '@/lib/cron-auth';
import { grantMonthlyCredits } from '@/lib/studio';
import { notifyJarvis } from '@/lib/jarvis';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/cron/studio-credits
 *
 * Runs daily. Gives every active subscriber this month's Build Studio credit
 * at their tier's amount (Admin -> Build Studio). Each grant is keyed by the
 * month at the hub, so the first run of a month gives it and every later run
 * that month skips them: a missed day only delays it.
 */
export async function GET(request: NextRequest) {
  const denied = cronAuthError(request);
  if (denied) return denied;
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
