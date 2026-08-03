// Temporarily off (2026-08-02) — outbound verification email is broken
// (Titan SMTP auth failing, see project notes) and the business wants to
// launch now rather than block every new signup on a broken send path.
// Flip back to true once Titan/Resend email delivery is confirmed working;
// nothing else needs to change — middleware.ts and the verification banner
// both key off this one flag.
export const REQUIRE_EMAIL_VERIFICATION = false;

// Same root cause, different flow (2026-08-02): outbound email is down
// entirely, which also broke self-service "forgot password" — the account
// exists, the token gets issued, but the email carrying it never sends, so
// the user is stuck. While this is false, /api/auth/forgot-password skips
// the send attempt and hands the reset link straight back in its own
// response instead, so a locked-out user can still get back in. This is a
// deliberate, temporary trade-off — it means anyone who enters a real
// account's email gets a live reset link for it immediately, no inbox
// access required, until this is flipped back to true. Flip back to true
// the moment real email delivery (Titan or Resend) is confirmed working —
// nothing else needs to change.
export const EMAIL_DELIVERY_AVAILABLE = false;
