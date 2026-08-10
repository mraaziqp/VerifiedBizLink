// Re-enabled 2026-08-05 — outbound email works again. The earlier failure
// was never a bad password: the mailbox lives on GoDaddy's own mail
// platform (MX -> secureserver.net), but src/lib/email.ts was pointed at
// smtp.titan.email, which rejected the correct credentials with
// `535 authentication failed` because that mailbox doesn't exist there.
// Fixed by switching the SMTP host; delivery verified end to end.
export const REQUIRE_EMAIL_VERIFICATION = true;

// Same fix, same verification — /api/auth/forgot-password sends the reset
// link by email again instead of handing it back in the HTTP response
// (which briefly let anyone holding an account's email address reset it).
export const EMAIL_DELIVERY_AVAILABLE = true;
