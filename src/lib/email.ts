import type { SendMailOptions, SentMessageInfo } from 'nodemailer';
import React from 'react';
import type { InvoiceEmailProps } from '@/emails/InvoiceEmail';

// nodemailer, the email renderer and the templates are loaded when an email
// is actually sent. ~85 server routes import this module (often only for
// appUrlFromRequest), and a static import made every one of them parse the
// SMTP stack and React Email on each cold start.
async function renderTemplate<P extends object>(
  load: () => Promise<React.ComponentType<P>>,
  props: P,
): Promise<string> {
  const [{ render }, Component] = await Promise.all([import('@react-email/render'), load()]);
  return render(React.createElement(Component, props));
}

// Certificates are verified: the mailbox password goes over this connection.
// Set SMTP_ALLOW_INVALID_CERT=true only for a mail host with a broken chain.
const SMTP_TLS = { rejectUnauthorized: process.env.SMTP_ALLOW_INVALID_CERT !== 'true' };

// Note: info@verifiedbizlink.co.za is hosted on GoDaddy Secureserver (smtpout.secureserver.net).
// If AWS Amplify has SMTP_HOST set to smtp.titan.email, we automatically override it to smtpout.secureserver.net.
const rawHost = process.env.SMTP_HOST;
const SMTP_HOST = (!rawHost || rawHost.includes('titan')) ? 'smtpout.secureserver.net' : rawHost;
const _SMTP_PORT = Number(process.env.SMTP_PORT || 465);
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
 * Resilient email dispatcher with dual-port (Port 465 SSL -> Port 587 STARTTLS) and host auto-failover.
 * This guarantees dispatch works across all cloud environments (AWS Lambda/Amplify, local, VPS).
 */
export async function sendWithFallback(mailOptions: SendMailOptions): Promise<SentMessageInfo> {
  const { default: nodemailer } = await import('nodemailer');
  const user = FROM_EMAIL;
  const pass = FROM_PASS;

  const hostsToTry = [SMTP_HOST, 'smtpout.secureserver.net'];
  const uniqueHosts = Array.from(new Set(hostsToTry.filter(Boolean)));

  let lastError: unknown = null;

  for (const host of uniqueHosts) {
    // 1. Try Port 465 (SSL)
    try {
      const t465 = nodemailer.createTransport({
        host,
        port: 465,
        secure: true,
        auth: { user, pass },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 10000,
        tls: SMTP_TLS,
      });
      return await t465.sendMail(mailOptions);
    } catch (err465) {
      console.warn(`[SMTP ${host}:465 failed]:`, err465);
      lastError = err465;
    }

    // 2. Try Port 587 (STARTTLS)
    try {
      const t587 = nodemailer.createTransport({
        host,
        port: 587,
        secure: false,
        requireTLS: true,
        auth: { user, pass },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 10000,
        tls: SMTP_TLS,
      });
      return await t587.sendMail(mailOptions);
    } catch (err587) {
      console.warn(`[SMTP ${host}:587 failed]:`, err587);
      lastError = err587;
    }
  }

  throw lastError || new Error('All SMTP dispatch attempts failed');
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
    const html = await renderTemplate(() => import('@/emails/PasswordResetEmail').then((m) => m.PasswordResetEmail), { resetLink: link });
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

/**
 * Wait for an email for at most `ms`, so a slow mail server cannot leave
 * someone staring at a spinner on signup. The send keeps going in the
 * background; if it is cut short they can resend from the verify banner.
 */
export async function sendWithin(send: Promise<unknown>, ms = 6000): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`email still sending after ${ms}ms`)), ms);
  });
  try {
    await Promise.race([send, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export async function sendVerificationEmail(to: string, fullName: string, token: string, baseUrl?: string) {
  const link = `${baseUrl ?? APP_URL}/api/auth/verify-email?token=${token}`;
  try {
    const html = await renderTemplate(() => import('@/emails/VerificationEmail').then((m) => m.VerificationEmail), { userFirstName: fullName, verificationLink: link });
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
    const html = await renderTemplate(() => import('@/emails/WelcomeEmail').then((m) => m.WelcomeEmail), { userFirstName: fullName, role, appUrl: baseUrl ?? APP_URL });
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
    const html = await renderTemplate(() => import('@/emails/AbandonedSignupEmail').then((m) => m.AbandonedSignupEmail), {
        userFirstName: fullName,
        reason,
        verificationLink: verificationToken
          ? `${root}/api/auth/verify-email?token=${verificationToken}`
          : undefined,
        appUrl: root,
      });
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
    const html = await renderTemplate(() => import('@/emails/InvoiceEmail').then((m) => m.InvoiceEmail), { ...props, appUrl: props.appUrl ?? APP_URL });
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
    const html = await renderTemplate(() => import('@/emails/PaymentFailedEmail').then((m) => m.PaymentFailedEmail), {
        userFirstName: fullName, tierName, amount, hoursRemaining, deadline,
        appUrl: baseUrl ?? APP_URL,
      });
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
    const html = await renderTemplate(() => import('@/emails/AgentInviteEmail').then((m) => m.AgentInviteEmail), { ...props, appUrl: props.appUrl ?? APP_URL });
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
    const html = await renderTemplate(() => import('@/emails/UsernameRecoveryEmail').then((m) => m.UsernameRecoveryEmail), { usernames, loginLink: link });
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
