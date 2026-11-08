import { NextRequest, NextResponse } from 'next/server';
import { requirePosAccess } from '@/lib/pos/auth-helper';
import { getMerchantFeeSummary, getFeeStatementDetail, startFeeStatementCheckout, getMerchantPosSubscription } from '@/lib/pos/pos-billing';
import { resolveFeeRule } from '@/lib/pos/fees';
import { posErrorResponse, readJson, PosError } from '@/lib/pos/errors';

/** Payments & Fees: everything the merchant pays VerifiedBizLink, and why. */
export async function GET(req: NextRequest) {
  const guard = await requirePosAccess(req, 'billing.read');
  if (!guard.ok) return guard.response;
  const { auth } = guard;
  try {
    const statementId = req.nextUrl.searchParams.get('statementId');
    if (statementId) {
      const detail = await getFeeStatementDetail(auth.businessId, statementId);
      if (!detail) return NextResponse.json({ error: 'Statement not found' }, { status: 404 });
      return NextResponse.json(detail);
    }
    const [summary, subscription] = await Promise.all([getMerchantFeeSummary(auth.businessId), getMerchantPosSubscription(auth.businessId)]);
    const rule = await resolveFeeRule(auth.businessId, subscription?.plan_key ?? null);
    return NextResponse.json({
      ...summary,
      subscription: subscription ? { ...subscription, payfast_token: subscription.payfast_token ? 'on-file' : null } : null,
      access: auth.access,
      currentFee: { rateBps: rule.exempt ? 0 : rule.rateBps, fixedCents: rule.fixedCents, minFeeCents: rule.minFeeCents, maxFeeCents: rule.maxFeeCents, exempt: rule.exempt, scope: rule.scope },
    });
  } catch (err) {
    return posErrorResponse(err);
  }
}

/** { action: 'pay_statement', statementId } — returns a signed PayFast checkout. */
export async function POST(req: NextRequest) {
  const guard = await requirePosAccess(req, 'billing.manage');
  if (!guard.ok) return guard.response;
  const { auth } = guard;
  try {
    const body = await readJson(req);
    if (body.action !== 'pay_statement') throw new PosError(400, 'BAD_ACTION', 'action must be pay_statement.');
    const checkout = await startFeeStatementCheckout({
      session: { id: auth.session.id, email: auth.session.email, fullName: auth.session.fullName },
      businessId: auth.businessId,
      statementId: String(body.statementId ?? ''),
    });
    return NextResponse.json({ payfastUrl: checkout.payfastUrl, data: checkout.data, signature: checkout.signature, paymentRef: checkout.paymentRef });
  } catch (err) {
    return posErrorResponse(err);
  }
}
