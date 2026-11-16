# Settings the live site needs

**Why this file exists:** AWS Amplify does **not** pass its environment variables to the running app on its own. `amplify.yml` copies a fixed list of them into `.env.production` at build time.

A variable that's set in the Amplify console but missing from that list never reaches the app. That is how Build Studio stayed "being connected" in production.

**When you add a variable:**
1. Set it in Amplify (App settings → Environment variables).
2. Make sure `amplify.yml` lists it.
3. Redeploy.

## AWS Amplify → Environment variables

| Variable | Needed for | If missing |
|---|---|---|
| `DATABASE_URL`, `JWT_SECRET` | Everything | Site down / nobody can log in |
| `CRON_SECRET` | Scheduled jobs (billing sweeps, Build Studio credit) | Jobs answer 503; nobody is warned or downgraded for non-payment |
| `PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`, `PAYFAST_PASSPHRASE`, `PAYFAST_URL` | All payments | Checkout refuses |
| `HUB_PARTNER_KEY` (and optionally `HUB_URL`) | Build Studio (ARP websites/apps) | Only the 4 storefront templates show; Admin → Build Studio says "Connect the studio" |
| `JARVIS_API_KEY`, `JARVIS_WEBHOOK_URL` | Jarvis assistant and its alerts | Jarvis off |
| `SMTP_*` / `TITAN_EMAIL_*` | Email (warnings, invoices) | Emails fail and are logged |
| `POS_PLATFORM_COLLECTION_APPROVED` | QR sales collected by VerifiedBizLink | Off. Leave off until PayFast approves in writing. |
| Optional: `BOT_PROTECTION_SECRET`, `ACCOUNT_SWITCH_OWNERS`, `ACCOUNT_SWITCH_LINKED`, `HOUSE_ACCOUNT_EMAILS`, `UPSTASH_REDIS_REST_*` | — | Sensible defaults apply |

## GitHub → Settings → Secrets and variables → Actions

| Secret | Value |
|---|---|
| `APP_URL` | `https://www.verifiedbizlink.co.za` |
| `CRON_SECRET` | **Exactly** the same value as `CRON_SECRET` in Amplify |

## Build Studio needs two things

1. **`HUB_PARTNER_KEY`** in Amplify, as listed above.
2. **The live switch**, in Admin → Build Studio. It is off until an admin turns it on. While it's off, members see "being connected" even if the key works.

The monthly credit per plan is set on the same page. It's R0 until you set it, and the daily job gives nothing until then.

## Checking the scheduled jobs

GitHub → Actions → **Scheduled jobs** → **Run workflow**. If it fails, the run shows the reason in one line:

- **"missing from this repository's Actions secrets"** → add `APP_URL` / `CRON_SECRET` in GitHub.
- **"The app has no CRON_SECRET"** → add it in Amplify, then redeploy.
- **"does not match"** → make the GitHub and Amplify values identical, then redeploy.
