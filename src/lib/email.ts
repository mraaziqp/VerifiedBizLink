import nodemailer from 'nodemailer';
import { render } from '@react-email/render';
import { VerificationEmail } from '@/emails/VerificationEmail';
import { PasswordResetEmail } from '@/emails/PasswordResetEmail';
import { UsernameRecoveryEmail } from '@/emails/UsernameRecoveryEmail';
import { WelcomeEmail } from '@/emails/WelcomeEmail';
import { AbandonedSignupEmail } from '@/emails/AbandonedSignupEmail';

// Sends via the real GoDaddy mailbox (info@verifiedbizlink.co.za), not a
// third-party transactional API. The domain's SPF record
// (`v=spf1 include:secureserver.net -all`) only authorizes GoDaddy's own
// mail servers to send as this domain, with a hard fail (-all) for
// everything else — sending "from" this address through another provider
// (as the previous Postmark integration did) fails that SPF check.
//
// Host matters: this mailbox lives on GoDaddy's own mail platform, not on
// Titan. The domain's MX records point at secureserver.net, and
// smtp.titan.email rejects these credentials with `535 authentication
// failed` even though the password is correct — the mailbox simply doesn't
// exist on Titan's infrastructure. smtpout.secureserver.net is the right
// host and authenticates fine on both 465 and 587.
const SMTP_HOST = process.env.SMTP_HOST || 'smtpout.secureserver.net';
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const FROM_EMAIL = process.env.TITAN_EMAIL_ADDRESS || 'info@verifiedbizlink.co.za';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.verifiedbizlink.co.za';

/**
 * Base URL for links inside emails.
 *
 * Prefers the origin of the request that triggered the send, because
 * NEXT_PUBLIC_APP_URL is a config footgun: .env.local sets it to
 * http://localhost:9002 for dev, and if that value ever gets copied into
 * the hosting platform's env vars, every production reset/verification
 * email silently ships a localhost link that no recipient can open.
 * Deriving it from the request means the link always points back at
 * whatever domain the user was actually on.
 */
export function appUrlFromRequest(request?: { headers: Headers }): string {
  if (request) {
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    if (host) {
      const proto = request.headers.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
      return `${proto}://${host}`;
    }
  }
  return APP_URL;
}

let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (cachedTransporter) return cachedTransporter;

  const user = process.env.TITAN_EMAIL_ADDRESS;
  const pass = process.env.TITAN_EMAIL_PASSWORD;
  if (!user || !pass) {
    throw new Error('TITAN_EMAIL_ADDRESS / TITAN_EMAIL_PASSWORD environment variables are missing.');
  }

  cachedTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user, pass },
  });
  return cachedTransporter;
}

// For callers that need to send custom HTML (support tickets, message
// notifications) rather than one of the templated emails above.
export async function sendRawEmail(to: string, subject: string, html: string) {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: `VerifiedBizLink <${FROM_EMAIL}>`,
    to,
    subject,
    html,
  });
}

export async function sendPasswordResetEmail(to: string, fullName: string, token: string, baseUrl?: string) {
  const link = `${baseUrl ?? APP_URL}/reset-password?token=${token}`;
  try {
    const transporter = getTransporter();
    const html = await render(PasswordResetEmail({ resetLink: link }));
    await transporter.sendMail({
      from: `VerifiedBizLink <${FROM_EMAIL}>`,
      to,
      subject: 'Reset your VerifiedBizLink password',
      html,
    });
  } catch (error) {
    console.error('Failed to dispatch password reset email to:', to, error);
    throw error;
  }
}

export async function sendVerificationEmail(to: string, fullName: string, token: string, baseUrl?: string) {
  const link = `${baseUrl ?? APP_URL}/api/auth/verify-email?token=${token}`;
  try {
    const transporter = getTransporter();
    const html = await render(VerificationEmail({ userFirstName: fullName, verificationLink: link }));
    await transporter.sendMail({
      from: `VerifiedBizLink <${FROM_EMAIL}>`,
      to,
      subject: 'Verify your VerifiedBizLink email address',
      html,
    });
  } catch (error) {
    console.error('Failed to dispatch verification email to:', to, error);
    throw error;
  }
}

/**
 * Sent once, immediately after a user verifies their email.
 *
 * Deliberately non-throwing: the caller is the verification redirect, and a
 * transient SMTP hiccup must never turn a successful verification into an
 * error page. A failure here costs the user a welcome email, nothing more.
 */
export async function sendWelcomeEmail(to: string, fullName: string, role: string, baseUrl?: string) {
  try {
    const transporter = getTransporter();
    const html = await render(
      WelcomeEmail({ userFirstName: fullName, role, appUrl: baseUrl ?? APP_URL })
    );
    await transporter.sendMail({
      from: `VerifiedBizLink <${FROM_EMAIL}>`,
      to,
      subject:
        role === 'business'
          ? 'Welcome to VerifiedBizLink — let’s get you found'
          : 'Welcome to VerifiedBizLink',
      html,
    });
  } catch (error) {
    console.error('Failed to dispatch welcome email to:', to, error);
  }
}

/**
 * The 48-hour "you never finished signing up" nudge. Throws so the cron can
 * count failures and leave the user un-marked, making them eligible for a
 * retry on the next run rather than silently dropping them.
 */
export async function sendAbandonedSignupEmail(
  to: string,
  fullName: string,
  reason: 'unverified' | 'incomplete_profile',
  verificationToken?: string,
  baseUrl?: string
) {
  const root = baseUrl ?? APP_URL;
  const transporter = getTransporter();
  const html = await render(
    AbandonedSignupEmail({
      userFirstName: fullName,
      reason,
      verificationLink: verificationToken
        ? `${root}/api/auth/verify-email?token=${verificationToken}`
        : undefined,
      appUrl: root,
    })
  );
  await transporter.sendMail({
    from: `VerifiedBizLink <${FROM_EMAIL}>`,
    to,
    subject:
      reason === 'unverified'
        ? 'Your VerifiedBizLink account is one click away'
        : 'Finish your VerifiedBizLink profile',
    html,
  });
}

export async function sendUsernameRecoveryEmail(to: string, usernames: string[], baseUrl?: string) {
  const link = `${baseUrl ?? APP_URL}/login`;
  try {
    const transporter = getTransporter();
    const html = await render(UsernameRecoveryEmail({ usernames, loginLink: link }));
    await transporter.sendMail({
      from: `VerifiedBizLink <${FROM_EMAIL}>`,
      to,
      subject: 'Your VerifiedBizLink usernames',
      html,
    });
  } catch (error) {
    console.error('Failed to dispatch username recovery email to:', to, error);
    throw error;
  }
}
