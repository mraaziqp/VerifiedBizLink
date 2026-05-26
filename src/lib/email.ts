import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? 'noreply@verifiedbizlink.co.za';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.verifiedbizlink.co.za';

export async function sendVerificationEmail(to: string, fullName: string, token: string) {
  const link = `${APP_URL}/api/auth/verify-email?token=${token}`;

  await resend.emails.send({
    from: `VerifiedBizLink <${FROM}>`,
    to,
    subject: 'Verify your VerifiedBizLink email address',
    html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#111;border-radius:16px;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:#FCC200;padding:24px 32px;text-align:center;">
            <span style="font-size:22px;font-weight:900;color:#111;letter-spacing:-0.5px;">Verified<span style="color:#111;">BizLink</span></span>
            <p style="margin:4px 0 0;font-size:11px;color:#555;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">— Connecting you to Trusted Businesses —</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px 32px 24px;color:#fff;">
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#fff;">Verify your email address</h1>
            <p style="margin:0 0 24px;font-size:15px;color:#aaa;line-height:1.6;">Hi ${fullName}, welcome to VerifiedBizLink! Click the button below to verify your email and activate your account.</p>
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center">
                  <a href="${link}" style="display:inline-block;background:#FCC200;color:#111;font-weight:800;font-size:15px;padding:14px 36px;border-radius:12px;text-decoration:none;letter-spacing:0.01em;">Verify My Email</a>
                </td>
              </tr>
            </table>
            <p style="margin:24px 0 0;font-size:13px;color:#666;line-height:1.5;">Or copy this link:<br><a href="${link}" style="color:#FCC200;word-break:break-all;">${link}</a></p>
            <p style="margin:20px 0 0;font-size:12px;color:#555;">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#0a0a0f;padding:16px 32px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#444;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;">Network. Collaborate. Succeed.</p>
            <p style="margin:6px 0 0;font-size:11px;color:#333;">© ${new Date().getFullYear()} VerifiedBizLink · www.verifiedbizlink.co.za</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    `.trim(),
  });
}
