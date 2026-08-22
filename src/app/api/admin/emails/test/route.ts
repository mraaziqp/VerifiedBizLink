import { NextRequest, NextResponse } from 'next/server';
import { getSession, isStaff } from '@/lib/auth';
import {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendAgentInviteEmail,
  sendInvoiceEmail,
  sendPaymentFailedEmail,
  sendAbandonedSignupEmail,
  sendUsernameRecoveryEmail,
  appUrlFromRequest,
} from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isStaff(session)) {
      return NextResponse.json({ error: 'Forbidden — Staff access only' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { type, targetEmail } = body;
    const recipient = (targetEmail || session.email || 'info@verifiedbizlink.co.za').trim().toLowerCase();
    const baseUrl = appUrlFromRequest(request);
    const mockToken = crypto.randomUUID();

    const results: Record<string, string> = {};

    switch (type) {
      case 'verification': {
        await sendVerificationEmail(recipient, 'Test Business Owner', mockToken, baseUrl);
        results.verification = `Verification email sent with token: ${mockToken}`;
        break;
      }

      case 'welcome': {
        await sendWelcomeEmail(recipient, 'Test Business Owner', 'business', baseUrl);
        results.welcome = 'Welcome & onboarding email sent for Business role';
        break;
      }

      case 'password_reset': {
        await sendPasswordResetEmail(recipient, 'Test User', mockToken, baseUrl);
        results.password_reset = `Password reset email sent with token: ${mockToken}`;
        break;
      }

      case 'agent_invite': {
        const ok = await sendAgentInviteEmail(recipient, {
          fullName: 'Test Sales Marketer',
          inviteUrl: `${baseUrl}/agent-invite/${mockToken}`,
          referralCode: 'TEST-MKTR-88',
          invitedByName: session.fullName || 'VerifiedBizLink Management',
          commissionPercent: 20,
          expiresInDays: 7,
          appUrl: baseUrl,
        });
        results.agent_invite = ok ? 'Marketer invite email sent with referral code TEST-MKTR-88' : 'Failed to send invite';
        break;
      }

      case 'invoice': {
        await sendInvoiceEmail(recipient, {
          userFirstName: 'Test',
          invoiceNumber: `INV-TEST-${Math.floor(1000 + Math.random() * 9000)}`,
          tierName: 'Gold Verified Tier',
          description: 'VerifiedBizLink Gold Business Subscription',
          amount: 'R1,499.00',
          purchasedOn: new Date().toLocaleDateString('en-ZA'),
          renewalPrice: 'R1,499.00',
          nextBillingAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-ZA'),
          intervalLabel: 'monthly',
          terms: 'Cancel anytime in Settings > Billing before your renewal date.',
          appUrl: baseUrl,
        });
        results.invoice = 'Invoice & payment receipt email sent';
        break;
      }

      case 'payment_failed': {
        await sendPaymentFailedEmail(
          recipient,
          'Test Business Owner',
          'Gold Verified Tier',
          'R1,499.00',
          48,
          new Date(Date.now() + 48 * 60 * 60 * 1000).toLocaleDateString('en-ZA'),
          baseUrl,
        );
        results.payment_failed = 'Payment failed alert email sent';
        break;
      }

      case 'abandoned_signup': {
        await sendAbandonedSignupEmail(
          recipient,
          'Test Registrant',
          'unverified',
          mockToken,
          baseUrl,
        );
        results.abandoned_signup = 'Abandoned signup recovery nudge email sent';
        break;
      }

      case 'username_recovery': {
        await sendUsernameRecoveryEmail(recipient, ['test.business.owner', 'acme_solutions_za'], baseUrl);
        results.username_recovery = 'Username recovery email sent';
        break;
      }

      case 'all': {
        await Promise.all([
          sendVerificationEmail(recipient, 'Test Business Owner', mockToken, baseUrl),
          sendWelcomeEmail(recipient, 'Test Business Owner', 'business', baseUrl),
          sendPasswordResetEmail(recipient, 'Test User', mockToken, baseUrl),
          sendAgentInviteEmail(recipient, {
            fullName: 'Test Sales Marketer',
            inviteUrl: `${baseUrl}/agent-invite/${mockToken}`,
            referralCode: 'TEST-MKTR-88',
            invitedByName: session.fullName || 'VerifiedBizLink Management',
            commissionPercent: 20,
            expiresInDays: 7,
            appUrl: baseUrl,
          }),
          sendInvoiceEmail(recipient, {
            userFirstName: 'Test',
            invoiceNumber: `INV-TEST-${Math.floor(1000 + Math.random() * 9000)}`,
            tierName: 'Gold Verified Tier',
            description: 'VerifiedBizLink Gold Business Subscription',
            amount: 'R1,499.00',
            purchasedOn: new Date().toLocaleDateString('en-ZA'),
            renewalPrice: 'R1,499.00',
            nextBillingAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-ZA'),
            intervalLabel: 'monthly',
            terms: 'Cancel anytime in Settings > Billing before your renewal date.',
            appUrl: baseUrl,
          }),
          sendPaymentFailedEmail(
            recipient,
            'Test Business Owner',
            'Gold Verified Tier',
            'R1,499.00',
            48,
            new Date(Date.now() + 48 * 60 * 60 * 1000).toLocaleDateString('en-ZA'),
            baseUrl,
          ),
          sendAbandonedSignupEmail(
            recipient,
            'Test Registrant',
            'unverified',
            mockToken,
            baseUrl,
          ),
          sendUsernameRecoveryEmail(recipient, ['test.business.owner', 'acme_solutions_za'], baseUrl),
        ]);
        results.all = 'Full test suite (all 8 emails) dispatched successfully!';
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid email test type specified' }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      type,
      recipient,
      results,
      message: `Test email (${type}) dispatched successfully to ${recipient}`,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Test email dispatch error:', errorMsg);
    return NextResponse.json({ error: 'Failed to send test email', detail: errorMsg }, { status: 500 });
  }
}
