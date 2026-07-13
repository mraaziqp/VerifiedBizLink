import { Resend } from 'resend';
import { VerificationEmail } from '@/emails/VerificationEmail';
import { PasswordResetEmail } from '@/emails/PasswordResetEmail';
import { UsernameRecoveryEmail } from '@/emails/UsernameRecoveryEmail';

const FROM = process.env.RESEND_FROM_EMAIL ?? 'info@verifiedbizlink.co.za';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.verifiedbizlink.co.za';

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY environment variable is missing.');
    throw new Error('Resend API key missing');
  }
  return new Resend(apiKey);
}

export async function sendPasswordResetEmail(to: string, fullName: string, token: string) {
  const link = `${APP_URL}/reset-password?token=${token}`;
  try {
    const resend = getResend();
    const result = await resend.emails.send({
      from: `VerifiedBizLink <${FROM}>`,
      to,
      subject: 'Reset your VerifiedBizLink password',
      react: PasswordResetEmail({ resetLink: link }),
    });
    if (result.error) {
      console.error('Resend error resetting password for:', to, result.error);
      throw result.error;
    }
  } catch (error) {
    console.error('Failed to dispatch password reset email to:', to, error);
    throw error;
  }
}

export async function sendVerificationEmail(to: string, fullName: string, token: string) {
  const link = `${APP_URL}/api/auth/verify-email?token=${token}`;
  try {
    const resend = getResend();
    const result = await resend.emails.send({
      from: `VerifiedBizLink <${FROM}>`,
      to,
      subject: 'Verify your VerifiedBizLink email address',
      react: VerificationEmail({ userFirstName: fullName, verificationLink: link }),
    });
    if (result.error) {
      console.error('Resend error sending verification email to:', to, result.error);
      throw result.error;
    }
  } catch (error) {
    console.error('Failed to dispatch verification email to:', to, error);
    throw error;
  }
}

export async function sendUsernameRecoveryEmail(to: string, usernames: string[]) {
  const link = `${APP_URL}/login`;
  try {
    const resend = getResend();
    const result = await resend.emails.send({
      from: `VerifiedBizLink <${FROM}>`,
      to,
      subject: 'Your VerifiedBizLink usernames',
      react: UsernameRecoveryEmail({ usernames, loginLink: link }),
    });
    if (result.error) {
      console.error('Resend error sending username recovery email to:', to, result.error);
      throw result.error;
    }
  } catch (error) {
    console.error('Failed to dispatch username recovery email to:', to, error);
    throw error;
  }
}
