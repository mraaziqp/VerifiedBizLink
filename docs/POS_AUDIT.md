# VerifiedBizLink POS: audit findings

**Scope:** the POS module as it stood at commit `663e4ae` (merged to `main` on 6–8 Nov 2026), before the `feat/pos-hardening` branch.
**Method:** I read the code line by line. Each finding was then proven fixed by an automated test against a real Postgres database (see [POS_TEST_REPORT.md](POS_TEST_REPORT.md)).

All of these were go-live blockers. Each one is fixed on `feat/pos-hardening`.

## Confirmed defects (from the audit prompt)

| # | Defect | Where it was | Fix |
|---|--------|--------------|-----|
| 1 | **Every card sale was approved.** The till always sent `useSandbox: true`, and the sandbox adapter approves everything. On web, `card_tap` also fell back to the sandbox. | `terminal/page.tsx`, `payments/index.ts` | The sandbox can't run when `NODE_ENV=production`. The client can no longer choose it. There are no fallbacks: an unavailable method throws. |
| 2 | **Activation was free.** The settings page posted `setupFeePaid: true`, and the server marked the subscription active for 30 days. | `settings/page.tsx`, `subscribeToPos()` | Activation is now a PayFast subscription: R50 setup + R99 first month, then R99/month. Only a validated ITN activates it. |
| 3 | **Prices came from the browser.** `unitPriceCents` / `costPriceCents` / `discountCents` were read from the request body. | `api/pos/checkout` | The server looks up each product, scoped to the business, and computes every amount. Body prices are ignored. |
| 4 | **The 1% fee and 15% VAT were hardcoded.** VAT was charged even for merchants not registered for VAT. | `processPosSale()` | Fees come from dated fee rules (merchant → plan → global) and are snapshotted on each sale. VAT applies only when the merchant is VAT-registered with a valid number. |
| 5 | **PayFast adapter stubs.** `verify()` and `refund()` always reported success. The adapter fell back to public sandbox credentials. POS QR money landed in VerifiedBizLink's own account. | `payfast-adapter.ts` | No fake results. No credential fallbacks. QR is disabled unless `POS_PLATFORM_COLLECTION_APPROVED=true` (Gate 1). |
| 6 | **SoftPOS and Tap to Pay faked approvals.** The Apple adapter even invented an auth code on its "production" path. The Yoco call would have charged VerifiedBizLink's account. | `softpos-adapter.ts`, `apple-tap-to-pay-adapter.ts` | Both refuse every call (`AWAITING_APPROVAL`). Card sales are taken on the merchant's own machine (`card_external`). |
| 7 | **Nothing was atomic.** The sale, items, stock, payment and ledger were separate HTTP statements. Two tills could both sell the last unit. | `pos-service.ts` | One interactive transaction (Neon `Pool`). Stock uses a conditional decrement. 20 parallel sales for 1 unit produce exactly 1 sale. |
| 8 | **The idempotency check could race,** and keys were global, so one merchant's key could look up another merchant's sale. | `processPosSale()`, schema | A unique index on `(business_id, idempotency_key)` plus `INSERT … ON CONFLICT`. |
| 9 | **The POS ITN never compared the amount paid with the sale total.** A replayed ITN could post the ledger twice. | `api/payfast/notify` | Exact amount and reference checks. Completion is conditional. The ledger journal key is unique. |
| 10 | **Platform staff became the owner of any business,** with a fallback to "the latest business". | `auth-helper.ts` | Platform staff get `admin_readonly`, every view is audit-logged, and there's no fallback. |
| 11 | **No subscription gating.** Unpaid or suspended merchants could still sell. | all `api/pos/**` | `requirePosAccess()` enforces the role matrix and subscription state. Lapsed merchants keep read and export access. |
| 12 | **The role matrix was incomplete.** Stock controllers could refund. Staff could be assigned by raw user ID. | `api/pos/**` | A server-side matrix covers every route. Staff are added by account email. Managers can't create or change owners or managers. |
| 13 | **Receipt numbers collided:** 4 random digits per day. | `processPosSale()` | A per-business sequence (`VBL-000123`), unique-indexed. Migration v2 renumbers any existing duplicates. |
| 14 | **The runtime schema only ran once.** `ensurePosSchema()` returned early if `pos_sales` existed, so no later change could ever reach an existing database. | `schema.ts` | Versioned migrations (`pos_schema_migrations`) under an advisory lock. Also runnable with `npm run db:migrate:pos`. |
| 15 | **The tests proved the stubs,** not the system. | `__tests__/pos.test.ts`, `scripts/*pos*` | Replaced by 64 end-to-end tests against a real Postgres, through the real route handlers. |

## Additional findings

| # | Finding | Fix |
|---|---------|-----|
| 16 | **`/api/payfast/init` accepted `purchaseType: pos_*` with any amount of R5 or more,** and passed the caller's `adId` into `custom_str1`. Combined with #2-style trust in the checkout row, someone could have bought POS for R5. | The route now refuses `pos_*` purchase types. Activation is also checked against the plan's current price. Test: "an underpaid or forged ITN does not activate". |
| 17 | **Offline sales never synced.** `syncPendingSales()` was never called anywhere. | The till syncs on load and whenever the connection returns. Sales the server refuses are moved to a "needs attention" list instead of being dropped or retried forever. |
| 18 | **A PayFast renewal failing for a POS subscription would have flagged the merchant's membership tier.** | The ITN failure path now branches for POS. |
| 19 | **PayFast's minimum charge is R5,** so a small stall's monthly fee (e.g. R3) could never be collected. | Statements under R5 are marked `carried` and roll into the next statement. |
| 20 | **Refunds were all-or-nothing and could be processed twice concurrently.** | Partial refunds by line, with proportional fee reversal. The idempotency key is re-checked under the row lock. |
| 21 | **Stock adjustments were read-then-write.** They could go negative and allowed any reason. | Row-locked, never below zero, fixed list of reasons, notes required for write-offs. |
| 22 | **Purchase orders accepted another business's supplier or product IDs** (foreign keys only check that the row exists). | Ownership is checked for every ID. |
| 23 | **`audit-logger.logAction` calls `fetch('/api/logs')`,** which does nothing on the server. | POS uses its own `pos_audit_logs` table, written inside the transaction where the action is financial. |
| 24 | **Hub page and admin tile advertised "SoftPOS & Tap to Pay Enabled".** | Removed. Both now show the real status from the server. |
| 25 | **The Neon WebSocket `Pool` needs a global `WebSocket`** (Node 22+), and the hosting runtime's Node version isn't pinned. | Falls back to `ws`. |
| 26 | **The `__tests__/*.test.ts` files are Jest-style, but Jest isn't installed and no script runs them.** They have never executed. | Not changed (outside POS). Noted here so nobody counts them as coverage. |
