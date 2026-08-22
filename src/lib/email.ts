import nodemailer from 'nodemailer';
import { render } from '@react-email/render';
import React from 'react';
import { VerificationEmail } from '@/emails/VerificationEmail';
import { PasswordResetEmail } from '@/emails/PasswordResetEmail';
import { UsernameRecoveryEmail } from '@/emails/UsernameRecoveryEmail';
import { WelcomeEmail } from '@/emails/WelcomeEmail';
import { AbandonedSignupEmail } from '@/emails/AbandonedSignupEmail';
import { InvoiceEmail, type InvoiceEmailProps } from '@/emails/InvoiceEmail';
import { PaymentFailedEmail } from '@/emails/PaymentFailedEmail';
import { AgentInviteEmail } from '@/emails/AgentInviteEmail';

const SMTP_HOST = process.env.SMTP_HOST || 'smtpout.secureserver.net';
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const FROM_EMAIL = process.env.TITAN_EMAIL_ADDRESS || process.env.SMTP_USER || 'info@verifiedbizlink.co.za';
const FROM_PASS = process.env.TITAN_EMAIL_PASSWORD || process.env.SMTP_PASS || process.env.SMTP_PASSWORD || 'Verified@123!@';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.verifiedbizlink.co.za';

/**
 * Base URL for links inside emails.
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

/**
 * Resilient email dispatcher with dual-port (Port 465 SSL -> Port 587 STARTTLS) auto-failover.
 * This guarantees dispatch works across all cloud environments (AWS Lambda/Amplify, local, VPS).
 */
export async function sendWithFallback(mailOptions: nodemailer.SendMailOptions): Promise<nodemailer.SentMessageInfo> {
  const user = FROM_EMAIL;
  const pass = FROM_PASS;

  // Primary: Port 465 SSL (or configured SMTP_PORT)
  try {
    const primaryTransporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      requireTLS: SMTP_PORT !== 465,
      auth: { user, pass },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
      tls: { rejectUnauthorized: false },
    });
    return await primaryTransporter.sendMail(mailOptions);
  } catch (err465) {
    console.warn(`[SMTP Port ${SMTP_PORT} failed, attempting Port 587 STARTTLS fallback]:`, err465);
    // Fallback: Port 587 STARTTLS
    const fallbackTransporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user, pass },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
      tls: { rejectUnauthorized: false },
    });
    return await fallbackTransporter.sendMail(mailOptions);
  }
}

// For callers that need to send custom HTML
export async function sendRawEmail(to: string, subject: string, html: string) {
  return await sendWithFallback({
    from: `VerifiedBizLink <${FROM_EMAIL}>`,
    to,
    subject,
    html,
  });
}

export async function sendPasswordResetEmail(to: string, fullName: string, token: string, baseUrl?: string) {
  const link = `${baseUrl ?? APP_URL}/reset-password?token=${token}`;
  try {
    const html = await render(React.createElement(PasswordResetEmail, { resetLink: link }));
    return await sendWithFallback({
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
    const html = await render(React.createElement(VerificationEmail, { userFirstName: fullName, verificationLink: link }));
    return await sendWithFallback({
      from: `VerifiedBizLink <${FROM_EMAIL}>`,
      to,
      subject: 'Verify your VerifiedBizLink email address',
      html,
    });
  } catch (error) {
    console.error('Failed to dispatch verification email to:', to, error);
    console.log(`[FALLBACK VERIFICATION LINK] To: ${to} -> ${link}`);
    throw error;
  }
}

export async function sendWelcomeEmail(to: string, fullName: string, role: string, baseUrl?: string) {
  try {
    const html = await render(
      React.createElement(WelcomeEmail, { userFirstName: fullName, role, appUrl: baseUrl ?? APP_URL })
    );
    return await sendWithFallback({
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

export async function sendAbandonedSignupEmail(
  to: string,
  fullName: string,
  reason: 'unverified' | 'incomplete_profile',
  verificationToken?: string,
  baseUrl?: string
) {
  const root = baseUrl ?? APP_URL;
  try {
    const html = await render(
      React.createElement(AbandonedSignupEmail, {
        userFirstName: fullName,
        reason,
        verificationLink: verificationToken
          ? `${root}/api/auth/verify-email?token=${verificationToken}`
          : undefined,
        appUrl: root,
      })
    );
    return await sendWithFallback({
      from: `VerifiedBizLink <${FROM_EMAIL}>`,
      to,
      subject:
        reason === 'unverified'
          ? 'Your VerifiedBizLink account is one click away'
          : 'Finish your VerifiedBizLink profile',
      html,
    });
  } catch (error) {
    console.error('Failed to dispatch abandoned signup email to:', to, error);
  }
}

export async function sendInvoiceEmail(
  to: string,
  props: Omit<InvoiceEmailProps, 'appUrl'> & { appUrl?: string },
) {
  try {
    const html = await render(React.createElement(InvoiceEmail, { ...props, appUrl: props.appUrl ?? APP_URL }));
    return await sendWithFallback({
      from: `VerifiedBizLink <${FROM_EMAIL}>`,
      to,
      subject: `Invoice ${props.invoiceNumber} — ${props.tierName}`,
      html,
    });
  } catch (error) {
    console.error('Failed to dispatch invoice email to:', to, error);
  }
}

export async function sendPaymentFailedEmail(
  to: string,
  fullName: string,
  tierName: string,
  amount: string,
  hoursRemaining: number,
  deadline: string,
  baseUrl?: string,
) {
  try {
    const html = await render(
      React.createElement(PaymentFailedEmail, {
        userFirstName: fullName, tierName, amount, hoursRemaining, deadline,
        appUrl: baseUrl ?? APP_URL,
      })
    );
    return await sendWithFallback({
      from: `VerifiedBizLink <${FROM_EMAIL}>`,
      to,
      subject: `Action needed: we couldn't process your ${tierName} payment`,
      html,
    });
  } catch (error) {
    console.error('Failed to dispatch payment-failed email to:', to, error);
  }
}

export async function sendAgentInviteEmail(
  to: string,
  props: {
    fullName: string;
    inviteUrl: string;
    referralCode: string;
    invitedByName: string;
    commissionPercent: number;
    expiresInDays: number;
    appUrl?: string;
  },
): Promise<boolean> {
  try {
    const html = await render(
      React.createElement(AgentInviteEmail, { ...props, appUrl: props.appUrl ?? APP_URL })
    );
    await sendWithFallback({
      from: `VerifiedBizLink <${FROM_EMAIL}>`,
      to,
      subject: 'Activate your VerifiedBizLink sales account',
      html,
    });
    return true;
  } catch (error) {
    console.error('Failed to dispatch agent invite email to:', to, error);
    return false;
  }
}

export async function sendUsernameRecoveryEmail(to: string, usernames: string[], baseUrl?: string) {
  const link = `${baseUrl ?? APP_URL}/login`;
  try {
    const html = await render(React.createElement(UsernameRecoveryEmail, { usernames, loginLink: link }));
    return await sendWithFallback({
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
