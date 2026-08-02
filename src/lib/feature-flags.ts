// Temporarily off (2026-08-02) — outbound verification email is broken
// (Titan SMTP auth failing, see project notes) and the business wants to
// launch now rather than block every new signup on a broken send path.
// Flip back to true once Titan/Resend email delivery is confirmed working;
// nothing else needs to change — middleware.ts and the verification banner
// both key off this one flag.
export const REQUIRE_EMAIL_VERIFICATION = false;
