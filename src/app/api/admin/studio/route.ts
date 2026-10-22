import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { FINANCE_ROLES, hasRole } from '@/lib/roles';
import {
  getStudioSettings,
  giveMemberCredit,
  grantMonthlyCredits,
  hub,
  saveStudioSettings,
  studioConfigured,
  type StudioItem,
} from '@/lib/studio';
import { studioFailure } from '@/lib/studio-route';
import { notifyJarvis } from '@/lib/jarvis';

/**
 * Admin -> Build Studio.
 *
 * GET ?month=YYYY-MM — the studio's state for this admin page: the catalogue
 *   with list price, the lowest price allowed (list less VerifiedBizLink's
 *   share) and the subscriber price now; the pricing rules; the monthly
 *   credit allowances; and the earnings statement (all time, or one month).
 *
 * POST { action } —
 *   'pricing'   { pricing }            replace the prices and discounts (the hub checks the floor)
 *   'settings'  { monthlyCredits }     the monthly credit each paid tier gets
 *   'grant'     { email, amount, note } give (or, negative, take back) one subscriber's credit
 *   'allowances'                       give this month's allowance now (safe to repeat)
 *
 * Admin and finance only: these are prices and money.
 */
export const dynamic = 'force-dynamic';

async function staff() {
  const session = await getSession();
  return session && hasRole(session.role, FINANCE_ROLES) ? session : null;
}

interface PricingResponse {
  sharePct: number;
  allowBelowFloor: boolean;
  pricing: { defaultDiscountPct: number; tierDiscountPct: Record<string, number>; items: Record<string, { price?: number; discountPct?: number; hidden?: boolean }>; updatedAt: number | null; updatedBy: string | null };
  items: StudioItem[];
}

export async function GET(request: NextRequest) {
  if (!(await staff())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const settings = await getStudioSettings();
  if (!studioConfigured()) return NextResponse.json({ configured: false, settings });
  const month = request.nextUrl.searchParams.get('month');
  try {
    const [pricing, statement, catalog] = await Promise.all([
      hub<PricingResponse>('/pricing'),
      hub<Record<string, unknown>>(`/statement${month && /^\d{4}-\d{2}$/.test(month) ? `?month=${month}` : ''}`),
      hub<{ ordersOpen: boolean }>('/catalog'),
    ]);
    return NextResponse.json({ configured: true, ordersOpen: catalog.ordersOpen, settings, ...pricing, statement });
  } catch (error) {
    return NextResponse.json({ configured: true, settings, error: error instanceof Error ? error.message : 'The studio is unavailable.' }, { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  const session = await staff();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const actor = { id: session.id, name: session.fullName || session.email };
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  try {
    switch (body.action) {
      case 'pricing': {
        const result = await hub<{ pricing: PricingResponse['pricing']; items: StudioItem[] }>('/pricing', {
          method: 'PUT',
          body: { pricing: body.pricing, by: `${actor.name} (VerifiedBizLink admin)` },
        });
        await notifyJarvis({ type: 'studio.pricing', title: `Build Studio prices changed by ${actor.name}`, body: `${result.pricing.defaultDiscountPct}% off everything; ${Object.keys(result.pricing.items).length} item rule(s).` });
        return NextResponse.json(result);
      }
      case 'settings': {
        const current = await getStudioSettings();
        const settings = await saveStudioSettings({
          monthlyCredits: body.monthlyCredits ?? current.monthlyCredits,
          isLive: typeof body.isLive === 'boolean' ? body.isLive : current.isLive,
        }, actor);
        await notifyJarvis({ type: 'studio.monthly_credits', title: `Monthly studio credit changed by ${actor.name}`, body: Object.entries(settings.monthlyCredits).map(([tier, amount]) => `${tier} R${amount}`).join(', ') });
        return NextResponse.json({ settings });
      }
      case 'toggle_live': {
        const current = await getStudioSettings();
        const settings = await saveStudioSettings({
          ...current,
          isLive: Boolean(body.isLive),
        }, actor);
        await notifyJarvis({
          type: 'studio.status',
          title: `Build Studio live switch set to ${settings.isLive ? 'LIVE' : 'MAINTENANCE'} by ${actor.name}`,
          body: `Studio is now ${settings.isLive ? 'publicly accessible to verified members' : 'in maintenance mode'}`,
        });
        return NextResponse.json({ settings, isLive: settings.isLive });
      }
      case 'grant': {
        const result = await giveMemberCredit({ email: String(body.email ?? ''), amount: Number(body.amount), note: String(body.note ?? ''), by: actor });
        await notifyJarvis({ type: 'studio.credit', title: `${actor.name} ${result.amount > 0 ? 'gave' : 'took back'} R${Math.abs(result.amount)} studio credit (${result.name})` });
        return NextResponse.json({ ok: true, ...result });
      }
      case 'allowances':
        return NextResponse.json(await grantMonthlyCredits());
      default:
        return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
    }
  } catch (error) {
    return studioFailure(error, 'That did not go through.');
  }
}
