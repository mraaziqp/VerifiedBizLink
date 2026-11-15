#!/usr/bin/env bash
# Calls one of the app's scheduled-job routes and fails loudly, with a reason
# that shows up as a GitHub annotation, when it does not succeed.
#
#   run-cron.sh <route under /api/cron/> <label> [--check-errors]
#
# Needs APP_URL and CRON_SECRET in the environment (repository secrets).
set -uo pipefail

route="$1"
label="$2"
check_errors="${3:-}"

if [ -z "${APP_URL:-}" ] || [ -z "${CRON_SECRET:-}" ]; then
  echo "::error title=${label}::APP_URL or CRON_SECRET is missing from this repository's Actions secrets (Settings → Secrets and variables → Actions)."
  exit 1
fi

base="${APP_URL%/}"

# Resolve redirects first WITHOUT the secret (e.g. verifiedbizlink.co.za ->
# www.verifiedbizlink.co.za answers 308), so the secret is only ever sent to
# the final address and a bare-domain APP_URL still works.
target=$(curl -sS -o /dev/null -L --max-redirs 3 --max-time 30 -w '%{url_effective}' "$base/api/cron/$route" || true)
if [ -z "$target" ]; then
  echo "::error title=${label}::Could not reach $base. Check the APP_URL secret."
  exit 1
fi
case "$target" in
  https://*) ;;
  *) echo "::error title=${label}::$base/api/cron/$route resolved to a non-HTTPS address; refusing to send the secret."; exit 1 ;;
esac

response=$(curl -sS -w '\n%{http_code}' --max-time 90 -H "Authorization: Bearer $CRON_SECRET" "$target")
status=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

echo "Resolved URL: $target"
echo "HTTP $status"
echo "$body"

case "$status" in
  200) ;;
  503)
    echo "::error title=${label}::The app has no CRON_SECRET. Add it in AWS Amplify → Environment variables (the same value as the GitHub secret) and redeploy."
    exit 1 ;;
  401)
    echo "::error title=${label}::The CRON_SECRET in GitHub does not match the one in AWS Amplify. Make them identical, then redeploy the app."
    exit 1 ;;
  *)
    echo "::error title=${label}::The job route answered HTTP $status."
    exit 1 ;;
esac

# A route that ran but reports per-step errors is still a failed run.
if [ "$check_errors" = "--check-errors" ] && echo "$body" | grep -qE '"errors":[1-9]'; then
  echo "::error title=${label}::The job ran but reported errors — see the log above and Admin → billing log."
  exit 1
fi
