import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { isStaff, hasRole, FINANCE_ROLES } from '@/lib/roles';
import {
  getAdminPosOverview, getAdminMerchants, getAdminMerchantDetail, adminSetMerchantAccess, adminChangePlan,
  adminCreateFeeRule, adminWaiveStatement, adminUpdatePlan, getAdminAuditLog, getAdminStatements, getAdminCharges,
} from '@/lib/pos/pos-admin';
import { getPosPlans } from '@/lib/pos/pos-billing';
import { paymentMethodAvailability } from '@/lib/pos/payments/config';
import { posErrorResponse, readJson, PosError } from '@/lib/pos/errors';
import { logPosAudit } from '@/lib/pos/audit';
import db from '@/lib/db';

const isDate = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);

/**
 * GET /api/admin/pos?view=overview|merchants|merchant|statements|charges|audit|plans
 * Any platform staff role may read. Merchant drill-downs are audit-logged.
 */
export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session || !isStaff(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const sp = req.nextUrl.searchParams;
    const view = sp.get('view') || 'overview';
    switch (view) {
      case 'overview':
        return NextResponse.json({ ...(await getAdminPosOverview(isDate(sp.get('from')), isDate(sp.get('to')))), paymentMethods: paymentMethodAvailability() });
      case 'merchants':
        return NextResponse.json({ merchants: await getAdminMerchants(sp.get('q') || undefined) });
      case 'merchant': {
        const businessId = sp.get('businessId') || '';
        const detail = await getAdminMerchantDetail(businessId);
        await logPosAudit({ businessId, actorUserId: session.id, actorRole: `platform:${session.role}`, action: 'admin_view', targetType: 'merchant', targetId: businessId });
        return NextResponse.json(detail);
      }
      case 'statements':
        return NextResponse.json({ statements: await getAdminStatements(sp.get('status') || undefined) });
      case 'charges':
        return NextResponse.json({ charges: await getAdminCharges(isDate(sp.get('from')), isDate(sp.get('to'))) });
      case 'audit':
        return NextResponse.json({ audit: await getAdminAuditLog(Number(sp.get('limit')) || 200) });
      case 'plans': {
        const plans = await getPosPlans(true);
        const rules = await db`SELECT * FROM pos_fee_rules WHERE scope IN ('global', 'plan') ORDER BY scope, plan_key, effective_from DESC`;
        return NextResponse.json({ plans, feeRules: rules });
      }
      default:
        return NextResponse.json({ error: 'Unknown view' }, { status: 400 });
    }
  } catch (err) {
    return posErrorResponse(err);
  }
}

/**
 * POST /api/admin/pos — finance roles only, every action audit-logged with a reason.
 *   { action: 'suspend' | 'reactivate', businessId, reason }
 *   { action: 'change_plan', businessId, planKey, reason }
 *   { action: 'fee_override', businessId, rateBps, fixedCents?, minFeeCents?, maxFeeCents?, exempt?, effectiveFrom?, effectiveTo?, reason }
 *   { action: 'plan_fee', planKey, rateBps, effectiveFrom?, reason }
 *   { action: 'global_fee', rateBps, effectiveFrom?, reason }
 *   { action: 'update_plan', planKey, updates: {...} }
 *   { action: 'waive_statement', statementId, reason }
 */
export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session || !isStaff(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!hasRole(session.role, FINANCE_ROLES)) {
    return NextResponse.json({ error: 'Only finance administrators can change POS billing.' }, { status: 403 });
  }
  const actor = { userId: session.id, role: session.role };
  try {
    const body = await readJson(req);
    const date = (v: unknown) => (typeof v === 'string' && v ? new Date(v) : undefined);
    const int = (v: unknown) => (v === undefined || v === null || v === '' ? undefined : Number(v));
    switch (body.action) {
      case 'suspend':
      case 'reactivate':
        return NextResponse.json({ success: true, subscription: await adminSetMerchantAccess(String(body.businessId ?? ''), body.action, actor, body.reason) });
      case 'change_plan':
        return NextResponse.json({ success: true, subscription: await adminChangePlan(String(body.businessId ?? ''), body.planKey, actor, body.reason) });
      case 'fee_override':
      case 'plan_fee':
      case 'global_fee': {
        const scope = body.action === 'fee_override' ? 'merchant' : body.action === 'plan_fee' ? 'plan' : 'global';
        const rule = await adminCreateFeeRule({
          scope,
          businessId: scope === 'merchant' ? String(body.businessId ?? '') : null,
          planKey: scope === 'plan' ? String(body.planKey ?? '') : null,
          rateBps: Number(body.rateBps),
          fixedCents: int(body.fixedCents),
          minFeeCents: int(body.minFeeCents) ?? null,
          maxFeeCents: int(body.maxFeeCents) ?? null,
          exempt: Boolean(body.exempt),
          effectiveFrom: date(body.effectiveFrom),
          effectiveTo: date(body.effectiveTo) ?? null,
          reason: String(body.reason ?? ''),
        }, actor);
        return NextResponse.json({ success: true, rule });
      }
      case 'update_plan':
        return NextResponse.json({ success: true, plan: await adminUpdatePlan(String(body.planKey ?? ''), (body.updates as Record<string, unknown>) ?? {}, actor) });
      case 'waive_statement':
        return NextResponse.json({ success: true, statement: await adminWaiveStatement(String(body.statementId ?? ''), actor, body.reason) });
      default:
        throw new PosError(400, 'BAD_ACTION', 'Unknown admin action.');
    }
  } catch (err) {
    return posErrorResponse(err);
  }
}
