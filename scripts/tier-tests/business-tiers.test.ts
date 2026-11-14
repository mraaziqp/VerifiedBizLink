/**
 * End-to-end integration test for Admin Business Tier & Free Plan management.
 * Run: npx tsx --test --test-concurrency=1 scripts/tier-tests/business-tiers.test.ts
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  startDatabase,
  stopDatabase,
  sql,
  createUser,
  call,
  installFetchStub,
  type Handler,
  type TestUser,
} from '../pos-tests/harness';

let tierRoute: { POST: Handler };
let cronBilling: { GET: Handler };
let subRoute: { GET: Handler };
let renewRoute: { POST: Handler };

let adminUser: TestUser;
let financeUser: TestUser;
let complianceUser: TestUser;
let ownerA: TestUser;
let ownerB: TestUser;
let bizAId: string;
let bizBId: string;

async function ensureTierTestTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS tiers (
      key TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price INTEGER NOT NULL DEFAULT 0,
      ad_limit INTEGER NOT NULL DEFAULT 0,
      monthly_ad_credits INTEGER NOT NULL DEFAULT 0,
      features JSONB NOT NULL DEFAULT '[]'::jsonb,
      note TEXT,
      sort_order INTEGER NOT NULL DEFAULT 99,
      is_active BOOLEAN NOT NULL DEFAULT true,
      is_purchasable BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    INSERT INTO tiers (key, name, price, ad_limit, monthly_ad_credits, features, sort_order, is_active, is_purchasable)
    VALUES
      ('free', 'Free Profile', 0, 0, 0, '["Basic directory listing"]'::jsonb, 0, true, false),
      ('verified', 'Verified Business', 99, 0, 0, '["Trust Badge"]'::jsonb, 1, true, true),
      ('standard', 'Standard Business', 299, 3, 25, '["3 Ads","25 Credits"]'::jsonb, 2, true, true),
      ('premium', 'Premium Business', 699, 10, 75, '["10 Ads","75 Credits"]'::jsonb, 3, true, true)
    ON CONFLICT (key) DO NOTHING
  `;
  await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 0`;
  await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ`;
  await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS badge_source TEXT`;
  await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS documents_reviewed_at TIMESTAMPTZ`;
  await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS verification_paid BOOLEAN DEFAULT false`;
  await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS trial_package TEXT`;
  await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ`;
  await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS billing_interval_months INTEGER DEFAULT 1`;
  await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ`;
  await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS cancellation_reason TEXT`;
  await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS downgraded_from TEXT`;
  await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS downgraded_at TIMESTAMPTZ`;
  await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS payment_failed_notified_at TIMESTAMPTZ`;
  await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS grace_warned_at TIMESTAMPTZ`;
  await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS next_billing_at TIMESTAMPTZ`;
  await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS last_billed_at TIMESTAMPTZ`;
  await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS tier_grant_type TEXT`;
  await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS tier_granted_by UUID`;
  await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS tier_granted_at TIMESTAMPTZ`;
  await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS tier_grant_note TEXT`;
  await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS ad_credits INTEGER NOT NULL DEFAULT 0`;
  await sql`
    CREATE TABLE IF NOT EXISTS invoices (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID,
      invoice_number TEXT,
      tier_name TEXT,
      description TEXT,
      amount_cents INTEGER,
      currency TEXT DEFAULT 'ZAR',
      interval_months INTEGER DEFAULT 1,
      issued_at TIMESTAMPTZ DEFAULT NOW(),
      next_billing_at TIMESTAMPTZ,
      status TEXT DEFAULT 'paid'
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      admin_id UUID,
      admin_name TEXT,
      action TEXT,
      target_type TEXT,
      target_id UUID,
      target_name TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS certificates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL,
      revoked_at TIMESTAMPTZ,
      revoke_reason TEXT
    )
  `;
  await sql`CREATE TABLE IF NOT EXISTS tier_durations (months INT, label TEXT, discount_percent INT, is_active BOOLEAN, sort_order INT)`;
}

async function callTierPost(businessId: string, user: TestUser, body: Record<string, unknown>) {
  const { status, json } = await call(
    tierRoute.POST,
    'POST',
    `/api/admin/businesses/${businessId}/tier`,
    { user, body },
    { id: businessId },
  );
  return { status, json };
}

before(async () => {
  process.env.TEST_EMAIL_STUB = 'true';
  await startDatabase();
  installFetchStub();
  await ensureTierTestTables();

  tierRoute = await import('../../src/app/api/admin/businesses/[id]/tier/route');
  cronBilling = await import('../../src/app/api/cron/billing/route');
  subRoute = await import('../../src/app/api/billing/subscription/route');
  renewRoute = await import('../../src/app/api/billing/renew/route');

  adminUser = await createUser('tier-admin@test.local', 'admin');
  financeUser = await createUser('tier-fin@test.local', 'finance_admin');
  complianceUser = await createUser('tier-comp@test.local', 'compliance_admin');
  ownerA = await createUser('owner-a@test.local', 'business');
  ownerB = await createUser('owner-b@test.local', 'business');

  const [bA] = await sql`
    INSERT INTO businesses (user_id, company_name, status, package_type, subscription_status, next_billing_at)
    VALUES (${ownerA.id}, 'Free Comp Alpha', 'unregistered', 'free', NULL, NOW() - INTERVAL '5 days')
    RETURNING id
  `;
  bizAId = String(bA.id);

  const [bB] = await sql`
    INSERT INTO businesses (user_id, company_name, status, badge_source, documents_reviewed_at, package_type, subscription_status, auto_renew, next_billing_at, payfast_token)
    VALUES (${ownerB.id}, 'Vetted Paid Beta', 'verified', 'vetting_review', NOW(), 'premium', 'active', true, NOW() + INTERVAL '20 days', 'pf-token-123')
    RETURNING id
  `;
  bizBId = String(bB.id);
});

after(async () => {
  await stopDatabase();
});

describe('admin business tier grants & removal', () => {
  it('enforces finance/platform admin role authorization', async () => {
    const rOwner = await callTierPost(bizAId, ownerA, { mode: 'complimentary', tierKey: 'standard', reason: 'Self upgrade hack' });
    assert.equal(rOwner.status, 403);

    const rComp = await callTierPost(bizAId, complianceUser, { mode: 'complimentary', tierKey: 'standard', reason: 'Not allowed' });
    assert.equal(rComp.status, 403);
  });

  it('grants an indefinite complimentary tier with ad credits & verification badge, and billing cron preserves it', async () => {
    const res = await callTierPost(bizAId, financeUser, {
      mode: 'complimentary',
      tierKey: 'standard',
      grantVerifiedBadge: true,
      syncMonthlyCredits: true,
      bonusAdCredits: 10,
      reason: 'Founding merchant grant',
    });
    assert.equal(res.status, 200, JSON.stringify(res.json));
    assert.equal(res.json.business.package_type, 'standard');
    assert.equal(res.json.business.subscription_status, 'active');
    assert.equal(res.json.business.auto_renew, false);
    assert.equal(res.json.business.next_billing_at, null);
    assert.equal(res.json.business.tier_grant_type, 'complimentary');
    assert.equal(res.json.business.status, 'verified');
    assert.equal(res.json.business.badge_source, 'admin_grant');
    assert.equal(res.json.grantedCredits, 35); // 25 standard credits + 10 bonus

    // Billing subscription view sees complimentary grant accurately
    const subRes = await call(subRoute.GET, 'GET', '/api/billing/subscription', { user: ownerA });
    assert.equal(subRes.status, 200);
    assert.equal(subRes.json.subscription.tierKey, 'standard');
    assert.equal(subRes.json.subscription.tierGrantType, 'complimentary');

    // Run billing cron: indefinite complimentary plan MUST NOT be downgraded
    const cronRes = await call(cronBilling.GET, 'GET', '/api/cron/billing', {
      headers: { authorization: 'Bearer pos-test-cron' },
    });
    assert.equal(cronRes.status, 200);

    const [afterCron] = await sql`SELECT package_type, subscription_status, tier_grant_type FROM businesses WHERE id = ${bizAId}`;
    assert.equal(afterCron.package_type, 'standard');
    assert.equal(afterCron.subscription_status, 'active');
    assert.equal(afterCron.tier_grant_type, 'complimentary');
  });

  it('grants a timed free tier and lets cron downgrade it cleanly once expired', async () => {
    const res = await callTierPost(bizAId, adminUser, {
      mode: 'timed_free',
      tierKey: 'premium',
      durationDays: 14,
      grantVerifiedBadge: false,
      syncMonthlyCredits: false,
      reason: '14-day promo showcase',
    });
    assert.equal(res.status, 200, JSON.stringify(res.json));
    assert.equal(res.json.business.package_type, 'premium');
    assert.equal(res.json.business.trial_package, 'premium');
    assert.equal(res.json.business.tier_grant_type, 'timed_free');
    assert.ok(res.json.business.next_billing_at);

    // Simulate expiry passing
    await sql`
      UPDATE businesses
      SET next_billing_at = NOW() - INTERVAL '1 hour',
          trial_ends_at = NOW() - INTERVAL '1 hour'
      WHERE id = ${bizAId}
    `;

    const cronRes = await call(cronBilling.GET, 'GET', '/api/cron/billing', {
      headers: { authorization: 'Bearer pos-test-cron' },
    });
    assert.equal(cronRes.status, 200);

    const [expired] = await sql`
      SELECT package_type, subscription_status, trial_package, trial_ends_at, next_billing_at, tier_grant_type
      FROM businesses WHERE id = ${bizAId}
    `;
    assert.equal(expired.package_type, 'free');
    assert.equal(expired.subscription_status, 'cancelled');
    assert.equal(expired.trial_package, null);
    assert.equal(expired.trial_ends_at, null);
    assert.equal(expired.next_billing_at, null);
    assert.equal(expired.tier_grant_type, null);
  });

  it('removes a paid/active tier to Free cleanly while preserving vetted document badges', async () => {
    const res = await callTierPost(bizBId, adminUser, {
      mode: 'remove',
      revokeAdminBadge: true, // Even if true, must NEVER strip a vetting_review badge!
      reason: 'Account downgraded per agreement',
    });
    assert.equal(res.status, 200, JSON.stringify(res.json));
    assert.equal(res.json.business.package_type, 'free');
    assert.equal(res.json.business.subscription_status, 'cancelled');
    assert.equal(res.json.business.auto_renew, false);
    assert.equal(res.json.business.status, 'verified', 'vetted badge must stay intact');
    assert.equal(res.json.business.badge_source, 'vetting_review');
  });

  it('removes unvetted admin-granted badge when admin checks revokeAdminBadge', async () => {
    const res = await callTierPost(bizAId, adminUser, {
      mode: 'remove',
      revokeAdminBadge: true,
      reason: 'Removing promo access and temporary badge',
    });
    assert.equal(res.status, 200);
    assert.equal(res.json.business.package_type, 'free');
    assert.equal(res.json.business.status, 'unregistered');
    assert.equal(res.json.business.badge_source, null);
  });

  it('admin can manually downgrade a business to Free for non-payment and terms violation', async () => {
    const nonPayUser = await createUser('non-pay@test.local', 'business');
    const [bizNP] = await sql`
      INSERT INTO businesses (user_id, company_name, package_type, subscription_status, auto_renew, payfast_token, next_billing_at)
      VALUES (${nonPayUser.id}, 'Unpaid Merchant Co', 'standard', 'active', true, 'pf-tok-np-123', NOW() + INTERVAL '10 days')
      RETURNING id
    `;
    const npId = String(bizNP.id);

    // Manual admin downgrade for non-payment
    const resNP = await callTierPost(npId, financeUser, {
      mode: 'remove',
      downgradeReasonCategory: 'non_payment',
      reason: 'Card expired and 3 failed renewal attempts',
    });
    assert.equal(resNP.status, 200);
    assert.equal(resNP.json.business.package_type, 'free');
    assert.equal(resNP.json.business.subscription_status, 'downgraded_nonpayment');
    assert.equal(resNP.json.business.downgraded_from, 'standard');
    assert.equal(resNP.json.payfastCancelled, true);

    // Owner checks billing settings and sees canPayNow=true to restore or re-subscribe
    const subRes = await call(subRoute.GET, 'GET', '/api/billing/subscription', { user: nonPayUser });
    assert.equal(subRes.status, 200);
    assert.equal(subRes.json.subscription.tierKey, 'free');
    assert.equal(subRes.json.subscription.downgradedFrom, 'standard');
    assert.equal(subRes.json.subscription.canPayNow, true);

    // Terms violation test
    const violatorUser = await createUser('violator@test.local', 'business');
    const [bizV] = await sql`
      INSERT INTO businesses (user_id, company_name, package_type, subscription_status, auto_renew, next_billing_at)
      VALUES (${violatorUser.id}, 'Bad Actor Inc', 'premium', 'active', false, NOW() + INTERVAL '15 days')
      RETURNING id
    `;
    const vId = String(bizV.id);

    const resV = await callTierPost(vId, adminUser, {
      mode: 'remove',
      downgradeReasonCategory: 'terms_violation',
      reason: 'Spamming unlicensed financial products',
    });
    assert.equal(resV.status, 200);
    assert.equal(resV.json.business.package_type, 'free');
    assert.equal(resV.json.business.subscription_status, 'terms_violation');
    assert.equal(resV.json.business.downgraded_from, 'premium');
  });

  it('automated billing cron flags overdue renewal, warns user, and drops to Free after 3 days without payment', async () => {
    const autoUser = await createUser('auto-lapse@test.local', 'business');
    const [bizAuto] = await sql`
      INSERT INTO businesses (user_id, company_name, package_type, subscription_status, auto_renew, payfast_token, next_billing_at)
      VALUES (${autoUser.id}, 'Lapse Cafe', 'standard', 'active', true, 'pf-lapse-999', NOW() - INTERVAL '25 hours')
      RETURNING id
    `;
    const autoId = String(bizAuto.id);

    // Job 0 & 1a: Catch renewal overdue (24h) and immediately send first warning notice
    const sweep1 = await call(cronBilling.GET, 'GET', '/api/cron/billing', {
      headers: { authorization: 'Bearer pos-test-cron' },
    });
    assert.equal(sweep1.status, 200);
    assert.equal(sweep1.json.overdue, 1);
    assert.equal(sweep1.json.noticed, 1);

    const [afterSweep1] = await sql`SELECT payment_failed_at, payment_failed_notified_at, subscription_status FROM businesses WHERE id = ${autoId}`;
    assert.ok(afterSweep1.payment_failed_at);
    assert.ok(afterSweep1.payment_failed_notified_at);
    assert.equal(afterSweep1.subscription_status, 'renewal_overdue');

    // User is in grace period and can see days remaining and can pay now
    const subInGrace = await call(subRoute.GET, 'GET', '/api/billing/subscription', { user: autoUser });
    assert.equal(subInGrace.status, 200);
    assert.ok(subInGrace.json.subscription.graceHoursRemaining > 0);
    assert.equal(subInGrace.json.subscription.canPayNow, true);

    // Job 1b: 48 hours after failure (1 day before expiry), final reminder warning is sent
    await sql`
      UPDATE businesses
      SET payment_failed_at = NOW() - INTERVAL '49 hours',
          payment_failed_notified_at = NOW() - INTERVAL '49 hours',
          grace_warned_at = NULL
      WHERE id = ${autoId}
    `;

    const sweep2 = await call(cronBilling.GET, 'GET', '/api/cron/billing', {
      headers: { authorization: 'Bearer pos-test-cron' },
    });
    assert.equal(sweep2.status, 200);
    assert.equal(sweep2.json.finalNoticed, 1);

    // Fast-forward: 3 days (73 hours) without payment received -> auto-downgrades to Free
    await sql`
      UPDATE businesses
      SET payment_failed_at = NOW() - INTERVAL '73 hours',
          payment_failed_notified_at = NOW() - INTERVAL '73 hours',
          grace_warned_at = NOW() - INTERVAL '25 hours'
      WHERE id = ${autoId}
    `;

    const sweep3 = await call(cronBilling.GET, 'GET', '/api/cron/billing', {
      headers: { authorization: 'Bearer pos-test-cron' },
    });
    assert.equal(sweep3.status, 200);
    assert.equal(sweep3.json.downgraded, 1);

    const [dropped] = await sql`
      SELECT package_type, subscription_status, downgraded_from, auto_renew
      FROM businesses WHERE id = ${autoId}
    `;
    assert.equal(dropped.package_type, 'free');
    assert.equal(dropped.subscription_status, 'downgraded_nonpayment');
    assert.equal(dropped.downgraded_from, 'standard');
    assert.equal(dropped.auto_renew, false);

    // The merchant can now pay again to resume their plan!
    const renewStart = await call(renewRoute.POST, 'POST', '/api/billing/renew', { user: autoUser });
    assert.equal(renewStart.status, 200);
    assert.equal(renewStart.json.success, true);
    assert.ok(renewStart.json.payfastUrl);
  });
});
