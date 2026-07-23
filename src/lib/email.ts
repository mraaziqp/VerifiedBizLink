import * as postmark from 'postmark';
import { render } from '@react-email/render';
import { VerificationEmail } from '@/emails/VerificationEmail';
import { PasswordResetEmail } from '@/emails/PasswordResetEmail';
import { UsernameRecoveryEmail } from '@/emails/UsernameRecoveryEmail';

const FROM = process.env.POSTMARK_FROM_EMAIL ?? process.env.RESEND_FROM_EMAIL ?? 'info@verifiedbizlink.co.za';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.verifiedbizlink.co.za';

function getPostmarkClient() {
  const serverToken = process.env.POSTMARK_SERVER_TOKEN ?? process.env.RESEND_API_KEY;
  if (!serverToken) {
    console.error('POSTMARK_SERVER_TOKEN environment variable is missing.');
    throw new Error('Postmark Server Token missing');
  }
  return new postmark.ServerClient(serverToken);
}

export async function sendPasswordResetEmail(to: string, fullName: string, token: string) {
  const link = `${APP_URL}/reset-password?token=${token}`;
  try {
    const client = getPostmarkClient();
    const html = await render(PasswordResetEmail({ resetLink: link }));
    await client.sendEmail({
      From: `VerifiedBizLink <${FROM}>`,
      To: to,
      Subject: 'Reset your VerifiedBizLink password',
      HtmlBody: html,
    });
  } catch (error) {
    console.error('Failed to dispatch password reset email to:', to, error);
    throw error;
  }
}

export async function sendVerificationEmail(to: string, fullName: string, token: string) {
  const link = `${APP_URL}/api/auth/verify-email?token=${token}`;
  try {
    const client = getPostmarkClient();
    const html = await render(VerificationEmail({ userFirstName: fullName, verificationLink: link }));
    await client.sendEmail({
      From: `VerifiedBizLink <${FROM}>`,
      To: to,
      Subject: 'Verify your VerifiedBizLink email address',
      HtmlBody: html,
    });
  } catch (error) {
    console.error('Failed to dispatch verification email to:', to, error);
    throw error;
  }
}

export async function sendUsernameRecoveryEmail(to: string, usernames: string[]) {
  const link = `${APP_URL}/login`;
  try {
    const client = getPostmarkClient();
    const html = await render(UsernameRecoveryEmail({ usernames, loginLink: link }));
    await client.sendEmail({
      From: `VerifiedBizLink <${FROM}>`,
      To: to,
      Subject: 'Your VerifiedBizLink usernames',
      HtmlBody: html,
    });
  } catch (error) {
    console.error('Failed to dispatch username recovery email to:', to, error);
    throw error;
  }
}
