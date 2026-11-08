# VerifiedBizLink POS: status

**Branch:** `feat/pos-hardening`
**Last updated:** 8 Nov 2026

## Done

### Money and payments
- **Checkout:** server-priced and atomic, with idempotency per business, a conditional stock decrement and per-business receipt numbers.
- **Fees:** dated rules (merchant → plan → global) with minimum, cap, fixed amount and exemption. The rate is snapshotted on every sale.
- **VAT:** only for VAT-registered merchants with a valid SARS VAT number.
- **Payment methods:** cash and card on the merchant's own machine (`card_external`) are live. The sandbox can never run in production. SoftPOS, Tap to Pay and platform-collected QR refuse every charge.
- **Refunds:** full and partial, with proportional fee reversal and optional restock. They are recorded as separate refund records, never as edits to the sale.
- **Ledger:** double-entry, one balanced journal per event, each posted once.

### Billing
- **Activation:** a PayFast subscription (setup fee + first month, then monthly). Only a validated ITN activates it. Plan changes cancel the old PayFast subscription. Cancellation is confirmed with PayFast first.
- **Monthly fee statements:** fees less refund reversals, plus amounts carried forward. Paid through PayFast. Under R5 carries forward.
- **Revenue reporting:** platform revenue is only what was collected (`pos_billing_charges`).
- **Lifecycle sweep** (`/api/cron/pos-billing`, hourly via GitHub Actions):
  - missed renewal → 5-day grace → read-only
  - overdue statement → grace
  - cancelled → read-only at period end
  - month-end statements are issued
  - nothing is ever deleted

### Access
- Server-side role matrix: owner, manager, cashier, stock controller, and read-only platform admin. Admin views are audit-logged.
- Cashier PIN switch with signed operator tokens. A sale records the PIN holder and applies their limits.
- Subscription gating: in read-only mode merchants can still view and export everything, and pay.
- `/api/payfast/init` refuses POS purchase types.

### Product
- Inventory: valuation, stock counts, reasons for adjustments, oversell review list.
- Purchase orders with part deliveries and weighted-average cost. Expenses.
- Reports: net sales, gross profit and net profit, compared with the previous period. Ledger balances.
- Offline cash sales: queued on the device and synced idempotently. Shortfalls are flagged.
- CSV exports for merchants and admins, guarded against spreadsheet formula injection.
- Admin console: overview, merchants with audited actions, statements and waivers, collected revenue, plans and fee rules, audit log.
- Versioned schema migrations. `npm run db:migrate:pos` applies them; `-- --check` only reports.

## Before deploying

1. **Apply the migrations.** Either deploy (the first POS request applies them) or run `npm run db:migrate:pos`. To see what's pending without changing anything first, run `npm run db:migrate:pos -- --check`.
   - Migration v2 resets subscriptions marked `active` that have no PayFast token to `inactive`. Those were activated by the old free `setupFeePaid` flag.
   - Any merchant in that state will see **Activate POS**. Their data is untouched.
2. **Check the PayFast settings in Amplify:** `PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`, `PAYFAST_PASSPHRASE` and `PAYFAST_URL` must be set. The POS no longer falls back to sandbox credentials.
3. **Check the GitHub Actions secrets** `APP_URL` and `CRON_SECRET` exist. The new `pos-billing` job uses them.
4. **Test the full flow once in the PayFast sandbox** before going live: activate → ITN → sale → month-end statement → pay.

## Blocked / AWAITING_APPROVAL

| Item | Status | Who acts | What unblocks it |
|------|--------|----------|------------------|
| **QR / payment-link sales** (Gate 1) | Built, tested in sandbox, off in production | Owner + PayFast | Written approval from PayFast for collecting POS sales on merchants' behalf, including who is merchant of record for refunds and chargebacks. Then set `POS_PLATFORM_COLLECTION_APPROVED=true` in Amplify. Also check whether this activity needs anything from the SARB / PASA side (a question for a payments lawyer). |
| **PayFast Split Payments** (alternative to the above) | Not built | Owner + PayFast | PayFast documents a split-payments feature. Confirm with PayFast whether a platform can take a percentage from independent merchants' payments, where each merchant has their own PayFast account. |
| **Tap on phone** (SoftPOS / Tap to Pay on iPhone) | Adapters refuse every call | Owner + provider | A contract with a certified provider that onboards each merchant (KYC) as its own sub-merchant, the provider's native SDK in the Capacitor app, and a server-side verify call or signed webhook. |
| **QR refunds** | Refused at the till | VerifiedBizLink support | Refunded from the PayFast dashboard, since the money sits in VerifiedBizLink's account. Only relevant once Gate 1 is approved. |
| **Legal and compliance review** | Not done | Owner + lawyer | Update the terms and privacy notice for POS: merchants' customer data under POPIA, fee disclosure, refund policy, record-keeping. The code provides the controls; it doesn't make the business compliant. |

## Known limits (deliberate for v1)

- **The PIN switch isn't a device lock.** It decides who is recorded at the till and applies their limits on till actions. If the owner's account stays signed in, someone at that device can still open owner-only pages such as Settings. For real separation, cashiers should sign in on their own accounts.
- **No live tap-on-phone or QR payments** (see the table above). Card sales are recorded from the merchant's own machine and confirmed by the merchant.
- **Admin plan changes don't change the PayFast recurring amount.** A price change applies to new subscriptions only.
- **One location per business.** Stock transfers are recorded as `transfer_in` / `transfer_out` adjustments. There's no per-location stock yet.
- **No camera barcode scanning yet.** USB and Bluetooth scanners work, because they type into the field.
- **Not tested on Neon:** the interactive transaction path. The suite runs the same `BEGIN`/`COMMIT` code through `pg` against a real Postgres. A Neon dev branch run is worth doing before go-live.
- **Not exercised in a browser:** the UI. It passes typecheck, lint and `next build`, but running it locally would hit the production database. Click through it against a Neon dev branch before go-live.
- **The `__tests__/*.test.ts` suite (not POS) has never run,** because Jest isn't installed.
