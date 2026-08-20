import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { SUPER_ADMIN_ROLES, hasRole } from '@/lib/roles';
import {
  getCommissionSettings, saveCommissionSettings, getCommissionHistory,
} from '@/lib/settings';

/**
 * GET /api/admin/commission-settings — the live scheme plus its change log.
 * PUT — update it.
 *
 * Super Admin only: this decides what people get paid. Every change is
 * recorded with a before/after and the name of whoever made it, so a rate
 * change is answerable months later.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!hasRole(session?.role, SUPER_ADMIN_ROLES)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const [settings, history] = await Promise.all([
      getCommissionSettings(),
      getCommissionHistory(),
    ]);
    return NextResponse.json({ settings, history });
  } catch (error) {
    console.error('Commission settings read error:', error);
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!hasRole(session?.role, SUPER_ADMIN_ROLES)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // Accepted as a percentage from the UI (50 reads better than 0.5), and
    // stored as a fraction.
    const percent = Number(body.defaultRatePercent);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      return NextResponse.json(
        { error: 'Commission rate must be between 0 and 100 percent' },
        { status: 400 },
      );
    }

    const saved = await saveCommissionSettings(
      {
        defaultRate: percent / 100,
        basis: body.basis === 'every_payment' ? 'every_payment' : 'first_payment',
        milestones: Array.isArray(body.milestones) ? body.milestones : [],
      },
      { id: session!.id, name: session!.fullName || session!.email },
    );

    return NextResponse.json({
      ok: true,
      settings: saved,
      message: `Commission is now ${Math.round(saved.defaultRate * 100)}% of each qualifying payment.`,
    });
  } catch (error) {
    console.error('Commission settings write error:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
