# Moving VerifiedBizLink from Vercel to AWS Amplify

Status of each piece, and the order to do the remaining work in. The goal is
AWS as the only host, with Vercel decommissioned afterwards.

## Already done (in the repo)

- **Build works on Amplify.** `amplify.yml` pins the install to
  `npm ci --legacy-peer-deps`. Amplify's build image runs npm 10.x, which
  demands `firebase-admin` in the lockfile because `@genkit-ai/core` lists
  `@genkit-ai/firebase` as an optional dependency and that package declares
  `firebase-admin` as a peer. npm 11 (local) omits it. Nothing in the app
  imports Firebase, so skipping peer resolution is cheaper than installing
  ~60 unused packages.
- **The build no longer needs secrets.** `lib/auth`, `middleware`,
  `lib/supabase` and the two upload routes used to resolve environment
  variables at import time, and `next build` imports every route module while
  collecting page data — so one missing variable failed the whole build.
  All are lazy now. Verified by building with `.env.local` renamed away:
  exit 0, 147/147 pages.
- **Scheduled jobs** are defined in `infra/aws/cron-stack.yaml` (below).

## 1. Environment variables (Amplify console)

App settings -> Environment variables. Paste values directly; do not pipe them
through a shell. A PowerShell pipe prepends a UTF-8 BOM, which silently
corrupted `CRON_SECRET` on Vercel and cost two failed deploys.

Required for the app to function at all:

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Production Neon branch |
| `JWT_SECRET` | Signs sessions. Changing it logs everyone out. |
| `NEXT_PUBLIC_SUPABASE_URL` | Baked in at build time |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Baked in at build time |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only; bypasses row-level security |
| `NEXT_PUBLIC_APP_URL` | Must be the live origin — `notify_url` for PayFast is built from it |
| `TITAN_EMAIL_ADDRESS` / `TITAN_EMAIL_PASSWORD` | All outbound email |
| `GOOGLE_API_KEY` | Chatbot and AI drafting |
| `CRON_SECRET` | Must match the value given to the cron stack |
| `TWO_FACTOR_ENCRYPTION_KEY` | 64-char hex |
| `PAYFAST_MERCHANT_ID` / `PAYFAST_MERCHANT_KEY` / `PAYFAST_PASSPHRASE` | Payments |
| `SETUP_SECRET` | Only gates `/api/setup/migrate` |

These need no entry — the code defaults are correct: `SMTP_HOST`,
`SMTP_PORT`, `SUPPORT_EMAIL`, `PAYFAST_URL`, `PAYFAST_VALIDATE_URL`,
`GEMINI_API_KEY` (falls back to `GOOGLE_API_KEY`).

The two `NEXT_PUBLIC_*` values are inlined into the client bundle at build
time, so they must exist *before* the build and a change requires a rebuild,
not a restart.

## 2. Scheduled jobs (EventBridge)

Amplify has no scheduler, so `vercel.json`'s `crons` block does nothing on
AWS. Deploy the stack instead:

```bash
aws cloudformation deploy \
  --template-file infra/aws/cron-stack.yaml \
  --stack-name verifiedbizlink-crons \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides AppBaseUrl=https://www.verifiedbizlink.co.za \
                        CronSecret=<same value as CRON_SECRET in Amplify>
```

It creates an EventBridge Connection holding `Authorization: Bearer <secret>`,
two API Destinations pointing at the cron routes, and two scheduled Rules.

Billing runs **hourly** here. It was forced to daily on Vercel because the
Hobby plan caps crons at one run per day; EventBridge has no such limit, so
the 72-hour grace window is enforced within the hour again.

Verify by hand once deployed:

```bash
curl -i -H "Authorization: Bearer <secret>" https://www.verifiedbizlink.co.za/api/cron/billing
```

`{"ok":true,...}` means the secret matches. `401` means Amplify's `CRON_SECRET`
and the stack parameter differ.

## 3. Database

Nothing to migrate — Neon stays. The app talks to it over HTTPS via
`@neondatabase/serverless`, which works unchanged from Amplify.

**Outstanding:** the billing migration has still only been applied to the
QaTst branch, not production. Until it runs, `/settings/billing` returns 500
for business users:

```powershell
$env:DATABASE_URL = '<production Neon URL>'
node scripts/migrate-billing.mjs
Remove-Item Env:DATABASE_URL
```

The script prints the target host first — confirm it is *not*
`ep-gentle-cherry-abc3llxy` (that is QaTst).

If you later move off Neon to RDS/Aurora, note it is not a connection-string
swap: `@neondatabase/serverless` speaks HTTP, and Aurora needs a TCP driver
plus pooling (RDS Proxy) to avoid exhausting `max_connections`.

## 4. Domain cutover

1. Add the custom domain in Amplify and complete its certificate validation.
2. Test thoroughly on the `*.amplifyapp.com` URL first — sign-up, login,
   image upload, a real R5 PayFast payment.
3. Lower the DNS TTL a day ahead so the switch is quick to reverse.
4. Point the records at Amplify.
5. Leave Vercel deployed but idle for a few days as a rollback path.

PayFast's ITN calls whatever `notify_url` the app sends, which is built from
`NEXT_PUBLIC_APP_URL` — so that variable must be the live domain on Amplify,
or payments will complete at the gateway and never be recorded.

## 5. After cutover

- Delete the `crons` block from `vercel.json` once Vercel is retired, so the
  schedule lives in one place.
- Remove the Vercel project and its secrets.
- Keep `amplify.yml` and this document in sync with reality.

## Known gaps versus Vercel

- **No preview deployments per branch** unless you enable branch builds.
- **Image optimization** is handled by Amplify's Next.js support, but is worth
  checking on the gallery and public profile pages after cutover.
- **Build minutes** are billed; the full build takes roughly 1–3 minutes.
