# VerifiedBizLink POS — Harden, Complete and Go-Live Prompt

> Paste everything below the line into Claude Code with the VerifiedBizLink repo open.

---

## Who you are and what this job is

You are the lead engineer on VerifiedBizLink (Next.js App Router, Neon Postgres via `@neondatabase/serverless`, PayFast, Capacitor Android/iOS). You have a security engineer's and a payments engineer's standards.

**A POS module already exists. Your job is to make it correct, safe and finished, not to build a second one.** It landed in commits `ddbb428`, `958c32a` and `663e4ae`:

- Service and schema: `src/lib/pos/pos-service.ts`, `src/lib/pos/schema.ts` (runtime DDL via `ensurePosSchema()`), `src/lib/pos/auth-helper.ts`, `src/lib/pos/offline-store.ts`
- Payment adapters: `src/lib/pos/payments/*` (cash, sandbox, softpos, apple-tap-to-pay, payfast)
- APIs: `src/app/api/pos/**`, `src/app/api/admin/pos/route.ts`, and the POS branch of `src/app/api/payfast/notify/route.ts`
- UI: `src/app/business/pos/**` (terminal, inventory, purchasing, sales, reports, staff, settings) and `src/app/admin/pos/page.tsx`
- Tests: `__tests__/pos.test.ts`, `scripts/run-pos-tests.ts`, `scripts/verify-pos-end-to-end.ts`

The app already has working PayFast subscription billing for its membership tiers. Reuse it; don't write another: `src/lib/payfast.ts`, `src/lib/payfast-api.ts`, `src/lib/payfast-checkout-server.ts`, `src/lib/billing.ts` (grace periods, next billing date), `src/lib/invoices.ts` (`issueInvoice`), `src/lib/billing-events.ts`, `src/lib/billing-notices.ts`, `src/lib/audit-logger.ts`, `src/lib/rate-limit.ts`.

## The business model

A small trader (market stall, food vendor, spaza shop, clothing seller) signs up for VerifiedBizLink, opens POS, pays a **R50 once-off setup fee** and a **R99/month subscription**, loads stock, and sells from their phone. VerifiedBizLink earns a **1% platform fee on every eligible completed sale**. All three numbers are launch defaults. They must come from admin-editable configuration and must never be hardcoded in business logic.

The merchant sees exactly what they owe and why. The VerifiedBizLink admin sees every merchant's subscription, sales volume, fees accrued, fees collected and fees outstanding.

## Non-negotiable rules

1. **Don't rebuild.** Change existing files. Create a new file only when there's no existing home for the code. Never add a second auth system, a second payment gateway or duplicate business records.
2. **The server is the only source of truth for money.** Prices, discounts, tax, fees and payment status are computed or verified on the server. The browser sends product IDs, quantities and requested discounts, nothing more.
3. **A redirect is not a payment.** An electronic payment is "completed" only after verified server-side confirmation: a validated PayFast ITN, or a provider API verify call. Simulated or sandbox approvals must be impossible in production builds.
4. **VerifiedBizLink must not hold merchant money** unless a provider-supported settlement arrangement is confirmed (see Decision Gate 1). Until then, no customer payment for a merchant's goods may land in VerifiedBizLink's own PayFast account.
5. **Accrued is not collected.** A fee recorded against a cash sale is a receivable, not revenue. Every report labels the two separately.
6. **Integer cents everywhere.** Snapshot each sale's fee rate and tax rate so that later config changes never rewrite history.
7. **Never delete financial records.** Refunds, reversals and corrections are new entries.
8. **Never run destructive SQL against production, and never touch production secrets.** Use a Neon branch or a local Postgres for tests.
9. **Don't report a test as passed unless it ran.** Don't call a feature operational if it depends on an approval you don't have. Mark it `AWAITING_APPROVAL`.

---

## Stage 0: Confirm the audit (read-only, about 30 minutes)

A prior review found the defects below. Verify each against the code, note file and line, and add anything else you find. Then fix them in Stage 1, in this order. These are P0: the product must not go live with any of them.

| # | Defect | Where |
|---|--------|-------|
| 1 | **Every card sale is auto-approved.** The terminal always sends `useSandbox: true`, the checkout route passes it through, and `resolveAdapterForMethod` returns the sandbox adapter, which approves. On web, `card_tap` also falls back to sandbox. | `business/pos/terminal/page.tsx` (~L286), `api/pos/checkout/route.ts`, `lib/pos/payments/index.ts` |
| 2 | **Activation is free.** Settings posts `setupFeePaid: true`. The subscription route trusts it and marks the subscription `active` for 30 days with no payment. | `business/pos/settings/page.tsx` (~L115), `api/pos/subscription/route.ts`, `subscribeToPos()` |
| 3 | **Prices come from the client.** Checkout uses `unitPriceCents`, `costPriceCents` and `discountCents` from the request body, so a cashier can sell at any price and shrink the fee. | `api/pos/checkout/route.ts`, `processPosSale()` |
| 4 | **The fee and VAT are hardcoded.** `totalCents * 0.01` ignores `pos_subscription_plans.transaction_fee_percent`, and a 15% VAT component is applied to every merchant. Most stall owners are not VAT-registered, and their receipts must not show VAT or say "Tax Invoice". | `processPosSale()` ~L540–550 |
| 5 | **PayFast adapter stubs.** `verify()` always returns `approved` and `refund()` always returns success without calling PayFast. The adapter falls back to the public sandbox merchant ID/key when env vars are missing. POS QR payments go into VerifiedBizLink's own PayFast account (see rule 4). | `lib/pos/payments/payfast-adapter.ts` |
| 6 | **The SoftPOS and Apple Tap to Pay adapters simulate approvals** when keys are missing. | `softpos-adapter.ts`, `apple-tap-to-pay-adapter.ts` |
| 7 | **No atomicity.** The sale insert, item inserts, stock decrement, payment and ledger entries are separate HTTP statements. A failure halfway leaves partial state. Two tills can oversell the last unit. | `pos-service.ts` (no transaction, no conditional decrement) |
| 8 | **The idempotency check races.** It does SELECT-then-INSERT and has no visible unique constraint on `(business_id, idempotency_key)`. | `processPosSale()`, `schema.ts` |
| 9 | **The POS ITN branch** doesn't compare `amount_gross` to `sale.total_cents`. Confirm whether it does and fix it if not. Confirm duplicate ITNs can't double-post ledger rows or double-decrement stock. | `api/payfast/notify/route.ts` (~L137–230) |
| 10 | **Platform staff become `owner` of any business,** including a fallback to "the latest registered business" when none is specified. That lets admins ring up sales and refunds as merchants. Admin access to merchant POS data must be read-only and audit-logged. | `lib/pos/auth-helper.ts` |
| 11 | **No subscription gating.** `getPosAuth` never checks subscription status, so suspended or never-paid merchants can use the till. | `auth-helper.ts`, all `api/pos/**` |
| 12 | **The role matrix is incomplete.** Only `cashier` is blocked from refunds, so a `stock_controller` can refund. Check every route against the matrix in Stage 2.6. | `api/pos/**` |
| 13 | **Receipt numbers** are `VBL-YYYYMMDD-` plus 4 random digits. They will collide. Use a per-business sequence. | `processPosSale()` |
| 14 | **Runtime schema with a one-shot guard.** `ensurePosSchema()` returns early if `pos_sales` exists, so new columns or tables never reach existing databases. | `lib/pos/schema.ts` |
| 15 | **The tests prove the stubs, not the system.** They assert that sandbox adapters approve and that `x * 0.01` is 1%. Nothing hits a real database, an API route or tenant isolation. | `__tests__/pos.test.ts`, `scripts/*pos*` |

**Output of Stage 0:** a short `docs/POS_AUDIT.md` with the confirmed table, any new findings, and your plan. Then continue. Don't wait for approval unless you hit a Decision Gate.

---

## Decision Gates: stop and ask the owner

Raise each one as a short question with your recommendation. Build the infrastructure behind a feature flag, but don't enable a gated path until the owner answers.

**Gate 1: How card and QR money reaches the merchant.**
- **Recommended for v1:** each merchant takes card payments through **their own** provider account: their own PayFast merchant ID, or a SoftPOS provider they sign up with directly. VerifiedBizLink never touches the money. VerifiedBizLink records every sale and bills the 1% fee monthly, together with the subscription, through the existing PayFast subscription and invoice flow. This works for cash and card alike and needs no regulatory approval.
- **Later option:** PayFast documents a Split Payments feature. Research its current docs. Confirm whether it supports a platform taking a percentage from independent merchants' payments, and who is merchant of record for refunds and chargebacks. Write up the findings, then implement it only if the owner confirms PayFast approval in writing.
- Until Gate 1 is answered, `qr_online` and `card_tap` are disabled in production. Cash and "card on own machine" sales are allowed. "Card on own machine" means the merchant used their own external card machine and the till records the method and reference.

**Gate 2: VAT.** Confirm the merchant settings model: a `vat_registered` boolean, a VAT number, and per-product tax-inclusive pricing. Default is not registered.

**Gate 3: Overdue policy.** Recommended: 7-day grace, using the existing `graceExpiresAt`. After that the till goes read-only. The merchant can still log in, view and export all history, and pay to reactivate. Data is never deleted.

---

## Stage 1: Fix the P0 defects

Address every row in the Stage 0 table. Specific requirements:

### 1.1 Migrations, not runtime DDL
- Move the POS schema into numbered SQL files in `migrations/`, following the existing `00N_*.sql` convention. Use idempotent `CREATE ... IF NOT EXISTS` and `ALTER ... ADD COLUMN IF NOT EXISTS` so the files are safe on databases where `ensurePosSchema()` already ran.
- Reduce `ensurePosSchema()` to a check that fails loudly if migrations are missing, or remove it. Document how migrations are applied in this repo.
- Add constraints:
  - `UNIQUE (business_id, idempotency_key)` on sales
  - `UNIQUE (business_id, receipt_number)`
  - `CHECK (stock_quantity >= 0)` unless the merchant has allowed negative stock
  - `CHECK` on non-negative money columns
  - foreign keys to `businesses(id)`
  - indexes on `(business_id, created_at)` for sales, ledger and inventory logs

### 1.2 Atomic, server-priced checkout
- The checkout API accepts `{ productId, quantity, requestedDiscountCents? }[]`, `paymentMethod`, `tillId`, `idempotencyKey` and tender details. Custom or open-price items are allowed only with an explicit `customItem` shape, if the merchant's settings permit them.
- The server loads products with `business_id = auth.businessId`. It rejects any product from another tenant and computes every line from the database price.
- Discounts are validated against the merchant's discount settings and the cashier's role.
- Run the whole sale in **one database transaction**: sale, items, conditional stock decrement, payment row, ledger rows. Use the Neon `Pool`/WebSocket client for interactive transactions, or `sql.transaction([...])` if non-interactive is enough. Decrement stock with `UPDATE ... SET stock_quantity = stock_quantity - $q WHERE id = $id AND business_id = $b AND stock_quantity >= $q RETURNING`. Zero rows returned means insufficient stock, so roll back.
- Idempotency is an `INSERT ... ON CONFLICT (business_id, idempotency_key) DO NOTHING RETURNING`. On conflict, return the original sale.
- Receipt numbers come from a per-business counter incremented inside the same transaction.

### 1.3 Fee engine (`src/lib/pos/fees.ts`)
- One pure function, `calculatePlatformFee({ eligibleAmountCents, rule }) → { feeCents, rateBps, ruleId }`.
- Rules resolve in this order: merchant-specific override → plan default → global default. Every rule has `effective_from` and `effective_to`, and supports percentage (in basis points), fixed amount, minimum, cap and exemption.
- Store `fee_rate_bps` and `fee_rule_id` on every sale.
- Document the rounding rule (half-up to the cent) and test it.
- Add a `pos_fee_rules` table, or extend `pos_subscription_plans` plus a merchant override table, whichever fits the existing schema better.

### 1.4 Payment adapters
- In production (`NODE_ENV === 'production'` and no explicit `POS_SANDBOX_ENABLED=true`, which must never be set in Vercel prod), the sandbox adapter and all simulation branches **throw**. The client can no longer select sandbox at all; remove `useSandbox` from the API contract.
- Delete the hardcoded sandbox credential fallbacks. If credentials are missing, fail with a clear configuration error.
- `PayFastPaymentAdapter.verify()` and `refund()` either call the real PayFast API (reuse `payfast-api.ts`) or throw `NotSupported`. They never return fake success.
- Add a method `card_external`: card paid on the merchant's own machine. It records an optional reference and is treated as confirmed by the merchant. It is labelled that way in reports.
- SoftPOS and Tap to Pay stay behind a feature flag, marked `AWAITING_APPROVAL`, with the integration seams kept.

### 1.5 Webhook (POS branch of the PayFast ITN)
Keep the existing `isGenuineItn` validation. Add these checks:
- the amount matches the sale total
- the merchant ID matches
- the sale belongs to the business named in the custom fields

Make the completion step atomic and idempotent: `UPDATE pos_sales SET payment_status='completed' WHERE id=$1 AND payment_status <> 'completed' RETURNING`. Post ledger rows only when that returns a row.

### 1.6 Auth and gating
- Rewrite `getPosAuth`:
  - Platform staff get a separate `admin_readonly` context. They never get `owner`, and there is no fallback to an arbitrary business.
  - Admin reads of merchant data are audit-logged.
  - Admin writes to merchants (suspend, fee override, plan change) go only through `api/admin/pos/**` with permission checks and audit logs.
- Add `requirePosAccess(auth, capability)`. It checks the role matrix (Stage 2.6) **and** the subscription state: `active`, `grace` (full access plus a banner), or `suspended`/`unpaid` (read and export only, no new sales, no new stock changes).
- Apply both checks to every route in `api/pos/**`. Add rate limiting to checkout, PIN verification and refunds using `lib/rate-limit.ts`.

---

## Stage 2: Finish the product

### 2.1 Paid activation and subscription billing
- Activation becomes a real PayFast checkout: R50 setup fee plus the first month, then recurring. Reuse the existing tier-subscription pattern (`payfast-checkout-server.ts`, the subscription branch of the ITN handler, `billing.ts`, `issueInvoice`).
- The subscription becomes `active` only from a validated ITN.
- Support plan change, cancel at period end, failed payment → grace → suspended, and reactivation. Each step writes a billing event and sends the existing billing notices.
- Pricing (setup fee, monthly price, fee %, till and staff limits, feature flags per plan) is editable in the admin UI and validated server-side. Changing a price never changes past invoices or sales.

### 2.2 Monthly fee statement and collection
- On each billing cycle, generate a **fee statement** per merchant:
  - eligible sales
  - fees accrued
  - reversals from refunds
  - net fee due
- Invoice the net fee with `issueInvoice` and collect it through PayFast. Use an ad-hoc charge on the subscription token if PayFast supports that, verified against the docs. Otherwise send a payment link.
- When paid, ledger rows move from `accrued` to `collected`. Unpaid fees appear as `outstanding` and follow the Gate 3 policy.
- Merchants see a **Payments & Fees** page: subscription status, each statement, each fee line traceable to a receipt, and amounts paid and outstanding.

### 2.3 Ledger correctness
- Every financial event has a unique reference and an idempotency guard, and every journal is balanced (debits = credits). Enforce this with a check in the posting function and a test.
- Keep separate accounts for:
  - merchant gross sales
  - platform fee receivable (accrued)
  - platform fee revenue (collected)
  - subscription revenue
  - setup-fee revenue
  - refunds
  - fee reversals
- Partial refunds reverse a proportional fee. Full refunds reverse the whole fee. Refunds after the fee was collected create a credit on the next statement.
- Admin "platform revenue" counts **collected** amounts only. Accrued and outstanding amounts are shown separately and labelled. Merchant sales never appear as platform revenue.

### 2.4 Till UX (mobile-first)
- A sale should take **under 10 seconds** on a 360 px-wide phone: tap products, choose Cash / Card (own machine) / other enabled methods, enter tendered amount, see change, done.
- Large touch targets, search, barcode via camera where Capacitor allows it, quick-add favourites.
- Clear states for loading, out of stock, offline and pending sync.
- Receipt: printable view, PDF, share to WhatsApp (`wa.me` link with a hosted receipt URL), and email via the existing email lib.
- Receipt content: merchant name and contact, receipt number, date and time, lines, discounts, total, method, reference, change given. Show VAT only if the merchant is VAT-registered.
- Match the existing VerifiedBizLink design system and components (`components.json`, shadcn/Radix). It must look like part of the app.

### 2.5 Offline cash sales
- Cache the catalogue locally. Cash sales made offline queue in `offline-store.ts` with a client-generated idempotency key and the original timestamp.
- Sync replays them through the same atomic checkout. Duplicates are no-ops. Stock conflicts are flagged for owner review and never silently dropped.
- Card or QR sales can never complete offline.
- Show a visible pending-sync count and a "last synced" time.

### 2.6 Roles and staff
Enforce this matrix on the server (O = owner, M = manager, C = cashier, S = stock controller, A = platform admin, read-only):

| Capability | O | M | C | S | A |
|---|---|---|---|---|---|
| Ring up sales | ✓ | ✓ | ✓ | – | – |
| Refund / void | ✓ | ✓ | – | – | – |
| Discounts above the cashier limit | ✓ | ✓ | – | – | – |
| Products and stock adjustments | ✓ | ✓ | – | ✓ | – |
| Purchase orders and receiving | ✓ | ✓ | – | ✓ | – |
| Reports and ledger | ✓ | ✓ | – | – | read |
| Staff management | ✓ | ✓* | – | – | – |
| Subscription and billing | ✓ | – | – | – | read |

\*Managers can't create or remove owners or managers.

- Staff PINs stay hashed with lockout (already present; verify it). Every sale, refund and stock movement records the acting user.
- Till and staff counts are enforced against plan limits.

### 2.7 Inventory, purchasing, expenses
These largely exist. Verify, and close gaps:
- Every stock change writes an inventory log with previous quantity, new quantity, delta, reason, user and timestamp.
- Partial PO receiving updates stock and weighted-average cost.
- Add an expenses table and page if it's missing.
- Inventory valuation is shown at both cost and retail.
- Merchants can export products, sales, purchases and the fee ledger to CSV. They own their data.

### 2.8 Admin console (`/admin/pos`)
- **Overview:** merchants by status, MRR, setup-fee revenue, GMV processed, fees accrued / collected / outstanding, refunds, failed payments.
- **Merchant list:** verification status, plan, status, tills, monthly and lifetime sales, fees accrued / collected / outstanding, last activity.
- **Merchant drill-down:** read-only.
- **Actions:** suspend, reactivate, change plan, set a fee override with effective date and reason. Each action requires permission and is audit-logged.
- Date filters and CSV export on every financial table.

---

## Stage 3: Tests that prove the real system

Replace the stub-asserting tests. Tests run against a **disposable database**: a Neon branch or local Postgres from `TEST_DATABASE_URL`, with migrations applied fresh and three seeded merchants (A, B, C) with different plans and fee overrides. If you can't get a test database, say so and stop. Don't fall back to mocks and call it end-to-end.

Must cover, through the actual API route handlers where practical:
1. **Price tampering:** a request with a client-sent price is ignored or rejected, and the total uses the DB price.
2. **Cross-tenant attacks:** A's token with B's `productId`, `saleId`, `tillId` or `businessId` header, across every `api/pos/**` route, always gets 403 or 404 and never leaks data.
3. **Concurrency:** 2 tills, 1 unit left, 20 parallel checkouts. Exactly one succeeds and stock ends at 0.
4. **Idempotency:** the same key sent 10 times in parallel produces one sale, one set of ledger rows and one stock decrement.
5. **ITN:** a valid ITN completes the sale. Replaying it is a no-op. A wrong amount, wrong merchant or invalid signature is rejected.
6. **Activation:** POSTing `setupFeePaid: true` no longer activates anything. Only a validated ITN does.
7. **Production guard:** with `NODE_ENV=production`, the sandbox and simulation paths throw.
8. **Fee engine:** rounding (R0.01, R0.49, R0.50, R99.99, R100,000), overrides, effective dates, caps, minimums, exemptions. Historic sales are unchanged after a rule change.
9. **Refunds:** full, partial, after the fee was collected (credit), double refund blocked. The ledger is balanced after every operation.
10. **Subscription lifecycle:** active → failed → grace → suspended (read-only till) → paid → active.
11. **Role matrix:** every capability × every role, including `admin_readonly`.
12. **Offline:** queue 5 cash sales, sync twice. Exactly 5 sales result, and a stock conflict is surfaced.
13. **Regression:** the existing suite (`__tests__/*`, `npm run typecheck`, `npm run lint`, `npm run build`) still passes.

**Report:** `docs/POS_TEST_REPORT.md` with the command run, each test, expected vs actual, pass/fail, and real output excerpts. Don't include a row you didn't execute.

---

## Working method

- Work stage by stage. After each stage, run typecheck, lint and the relevant tests, then commit with a descriptive message on a feature branch (`feat/pos-hardening`), not `main`.
- Keep a running `docs/POS_STATUS.md` with three sections: Done, In progress, and Blocked / AWAITING_APPROVAL (each with the reason and who has to act).
- Prefer small, reviewable diffs. Don't refactor unrelated code. Don't touch the networking, verification, storefront or Build Studio features except where they share billing code, and then re-run their tests.
- When unsure about a provider capability, read the provider's current docs and cite the URL in the status file. Don't guess.

## Done means

1. A merchant can't use the till without a paid, ITN-confirmed activation.
2. A sale can't be priced, approved or fee-reduced from the browser.
3. No simulated payment path is reachable in production.
4. No VerifiedBizLink-account collection of merchant sale money exists without Gate 1 approval.
5. Checkout is atomic, idempotent and oversell-proof under concurrency.
6. Fees follow configurable, dated rules, are snapshotted per sale, and roll into a monthly statement that is invoiced and collected through the existing PayFast billing.
7. Accrued, collected, reversed and outstanding fees are separate and correct for merchant and admin alike.
8. Tenant isolation and the role matrix are proven by tests against a real database.
9. Existing VerifiedBizLink functionality and tests are unaffected.
10. `POS_AUDIT.md`, `POS_STATUS.md` and `POS_TEST_REPORT.md` are accurate, and every external dependency or approval is listed.

Start with Stage 0.
