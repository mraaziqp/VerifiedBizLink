# VerifiedBizLink POS: test report

**Run:** 8 Nov 2026, branch `feat/pos-hardening`, Windows 10, Node v24.14.0.

**Command:** `npm run test:pos`, which runs `tsx --test --test-concurrency=1 scripts/pos-tests/pos.test.ts`.

**Database:** a throwaway PostgreSQL server started by `embedded-postgres` (real Postgres binaries, UTF-8) in a temp folder.
- The real POS migrations are applied.
- The app's database driver is swapped for one pointing at this server, and `DATABASE_URL` is blanked.
- The production database is never contacted.

**What is stubbed:** only PayFast's network endpoints: the ITN `validate` call (returns `VALID`) and subscription cancel (returns 200). Any other outbound request makes the test fail. ITNs are genuinely signed with the passphrase, and the real ITN handler verifies them.

**Merchants used:**
- **Alpha** (Starter)
- **Bravo** (VAT-registered)
- **Charlie** (Business plan)
- **Delta** (new, unpaid)
- **Echo, Foxtrot, Golf** (fee statements)
- **Legacy** (simulated pre-hardening data)

## Result

```
ℹ tests 64
ℹ suites 16
ℹ pass 64
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ duration_ms 13104
```

The first full run had 1 failure: "a retried refund request with the same key refunds once" returned `[200, 409, 409]`. That was a real race. A concurrent retry waited on the row lock, then saw the sale already refunded. The fix re-checks the idempotency key under the lock. After the fix, all 64 pass, and they have passed on every run since.

## Tests and what each proves

| Suite | Test | Expected → actual |
|-------|------|-------------------|
| Schema migrations | Re-running migrations applies nothing | `[]` → `[]` ✔ |
| | v2 repairs a legacy database | Free "active" subscription → `inactive`. Duplicate receipt → `…-2`. Unique index re-created. ✔ |
| Fee engine | 1% rounds half-up | R0.01→0c, R0.49→0c, R0.50→1c, R99.99→100c, R100 000→R1 000, 0.85% of R150→128c ✔ |
| | Minimum, cap, fixed, exemption | 200c / 5 000c / 150c / 0c. Never more than the sale. ✔ |
| | Partial reversals add up to the fee | 3 × 3 333c refunds of a 9 999c sale reverse exactly 100c ✔ |
| | VAT-inclusive and weighed goods | 15% of R115 = R15. 0.5 kg × R19.99 = R10.00 ✔ |
| Checkout | Prices come from the catalogue | Body price 1c is ignored. Total 3 000c, fee 30c, stock 50→48 ✔ |
| | VAT only for VAT vendors | Non-VAT: 0c. VAT vendor: 1 500c ✔ |
| | Custom items; bad quantities refused | 0, −1, 1.234 and "x" all give 400 ✔ |
| | Cash short is declined | 402, no sale row, stock unchanged ✔ |
| | Card on the merchant's own machine | `card_external`, reference stored, provider `external_terminal` ✔ |
| | Idempotency key required | 400 `IDEMPOTENCY_REQUIRED` ✔ |
| Payment safety | Production blocks the sandbox | `NODE_ENV=production` + `POS_ALLOW_SANDBOX=true` + `useSandbox:true` → 409. Sandbox adapter throws. ✔ |
| | Tap and QR off by default | 409. Settings show only cash and card-on-own-machine as enabled. ✔ |
| | Real SoftPOS / Tap to Pay never approve | Both reject ✔ |
| Concurrency | 20 tills, 1 unit | 1 × 201, 19 × 409 `INSUFFICIENT_STOCK`, stock 0 ✔ |
| | Same key × 10 in parallel | 1 sale, 1 journal, stock −2 once ✔ |
| | Keys are per business | Same key at A and B gives two separate sales ✔ |
| Tenant isolation | A sells B's product | 404, B's stock unchanged ✔ |
| | A reads, refunds, edits or adjusts B's records | 404 on each. B's price and stock unchanged. ✔ |
| | A orders from B's supplier or B's product | 404 / 404 ✔ |
| | A sends `x-business-id: B` | 401 ✔ |
| | Lists and exports | Only A's rows. CSV row count = A's sale count. ✔ |
| | Stranger with no business | 401 on sales, products and fees ✔ |
| Refunds | Full refund | `refunded`, 50 000c back, fee 500c reversed, stock restored, ledger balanced, second refund 409 ✔ |
| | Partial refunds | 1/3 → 3 333c, fee 33c. Over-refund 400. Rest → total refunded 9 999c, fee reversed 100c. ✔ |
| | Same key × 3 in parallel | 3 × 200, exactly 1 refund row ✔ |
| Roles | Matrix matches the spec | 10 capabilities checked exactly ✔ |
| | Cashier | Sells (cashier ID recorded). 403 on refund, product, stock, reports, staff, settings, fees, export. ✔ |
| | Cashier discount limit | 20% → 403. 10% → 201. Manager 50% → 201. ✔ |
| | Stock controller | Sell 403, stock adjust 200, reports 403 ✔ |
| | Manager | Reports 200. Add cashier 200, add manager 403. Cancel billing 403. ✔ |
| | PIN switch | Sale recorded against the cashier. Cashier PIN on owner's device can't refund (403). Bad token 401. ✔ |
| | 5 wrong PINs | 401 × 5, then 429 ✔ |
| | Platform admin | Read 200 + audit row. Sell 403. No business named → 401. ✔ |
| Inventory | Adjustments | −6 of 5 → 409. Log rows `[5→3 −2 waste]`, `[3→10 +7 count]` with the actor. PATCH stock 400. ✔ |
| | Purchase orders | `PO-00001`. Receive 5 → `partially_received`, stock 15, average cost R220. Over-receive 400. Rest → `received`, 20. ✔ |
| | Plan limit | Second till on Starter → 403 `TILL_LIMIT` ✔ |
| | Expenses | Net profit = gross profit − fees − expenses. Sales > gross profit. ✔ |
| | CSV formula injection | `=HYPERLINK(…)` exported as `'=HYPERLINK(…)` ✔ |
| Offline | 5 sales synced twice | Exactly 5 sales, stock 100→95 ✔ |
| | Oversold offline | Sale kept, `stock_shortfall` flag, stock 0, conflict row (3 requested, 1 available) ✔ |
| | Price changed since sale | `offline_price_mismatch` flag ✔ |
| | Card offline | 400 ✔ |
| Fee rules | Negotiated rate | Compliance admin 403. Finance admin 200. New sale 50 bps, old sale stays 100 bps. Future rule not applied yet. Audit row written. ✔ |
| Activation | Unpaid merchant | Sale 402 `POS_SUBSCRIPTION_INACTIVE` ✔ |
| | Old `setupFeePaid` flag | Returns a PayFast checkout: `149.00` first, `99.00` recurring. Status stays `inactive`. ✔ |
| | Underpaid or forged | R5 ITN not applied. Bad signature 403. Planted R5 checkout row not applied. Billing events raised. ✔ |
| | Genuine ITN, sent twice | `active`, setup fee paid, recurring 9 900c. Charges: setup 5 000 + subscription 9 900, once. Can sell. ✔ |
| | Grace → read-only → renewal | Overdue → grace (still sells) → 6 days → suspended (sale 402; history and export 200) → renewal ITN → active ✔ |
| | Cancel | PayFast cancel → `cancel_at_period_end`, then `cancelled` after the period ✔ |
| | Cron secret | 401 without it ✔ |
| Statements | Statement built | Fees 6 000 − refunds 2 000 = 4 000 due. One statement per period. Outstanding 4 000, collected 0. ✔ |
| | Paid via ITN | `paid`, collected 4 000, sales `collected`, fee payable 0 ✔ |
| | Refund after payment | Next statement `credit` −4 000 ✔ |
| | Under R5 | 100c → `carried` (not due). Next statement 500 + 100 = 600 due ✔ |
| | Overdue | Account → grace, reason `fee_statement_overdue` ✔ |
| QR (sandbox) | ITN-only completion | Pending, no stock taken. Wrong amount: not completed. Correct ITN × 2: completed once, stock −2 once, 1 journal. ✔ |
| Admin | Revenue = collected | Total = sum of billing charges, below merchant sales volume ✔ |
| | Suspend / reactivate | Suspended merchant can't sell. Reactivating without a reason → 400. With a reason → sells again. Both audited. ✔ |
| | Non-staff | 403 ✔ |
| Ledger | All journals balance | 0 unbalanced journals; debits = credits for A, B and C ✔ |
| | Unbalanced journal refused | Throws "unbalanced" ✔ |

## Other checks run

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | 0 errors |
| `npm run lint` (whole repo) | 0 errors, 0 warnings |
| `npm run build` | Succeeds. All POS pages and API routes compile. |
| `ws` fallback with no global `WebSocket` | `neonConfig.webSocketConstructor` set to `ws` |

## Not tested

- The Neon `Pool` transaction path against an actual Neon database. Same SQL and `BEGIN`/`COMMIT` code, different driver.
- The UI in a browser. Running it locally would use the production database.
- Live PayFast (sandbox or production). ITNs were signed and validated locally against a stubbed validation endpoint.
- The `__tests__/*.test.ts` Jest files outside POS. Jest isn't installed, so they can't run.
