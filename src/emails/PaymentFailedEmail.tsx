import { Html, Head, Preview, Body, Container, Section, Text, Button, Hr, Link } from '@react-email/components';
import * as React from 'react';
import {
  main, shell, body, brandBar, brandWordmark, brandWordmarkAccent, brandTagline,
  h1, text, button, stepCard, stepTitle, stepBody, hr, muted, link, footerBar, footer,
} from './styles';

interface PaymentFailedEmailProps {
  userFirstName: string;
  companyName?: string;
  tierName: string;
  amount: string;
  /** Whole days left, rounded up; 1 on the final notice. */
  daysRemaining: number;
  deadline: string;
  /** True for the last reminder, a day before the plan expires. */
  final?: boolean;
  appUrl: string;
}

const secondaryButton = {
  ...button,
  backgroundColor: '#ffffff',
  color: '#0f172a',
  border: '1px solid #cbd5e1',
};

/**
 * Sent the moment a subscription payment fails or a renewal does not charge,
 * and again a day before the plan expires. Leads with the one thing that
 * fixes it — Pay now — and says exactly what happens if nothing is done:
 * the plan expires, the business stays listed, nothing is deleted.
 */
export const PaymentFailedEmail = ({
  userFirstName, companyName, tierName, amount, daysRemaining, deadline, final = false, appUrl,
}: PaymentFailedEmailProps) => {
  const dayWord = daysRemaining === 1 ? '1 day' : `${daysRemaining} days`;
  const payUrl = `${appUrl}/settings/billing?pay=1`;
  return (
    <Html>
      <Head />
      <Preview>
        {final
          ? `Last reminder: your ${tierName} subscription expires tomorrow — pay now to keep it`
          : `Payment failed for your ${tierName} subscription — pay now or it expires in ${dayWord}`}
      </Preview>
      <Body style={main}>
        <Container style={shell}>
          <Section style={brandBar}>
            <Text style={brandWordmark}>
              Verified<span style={brandWordmarkAccent}>Biz</span>Link
            </Text>
            <Text style={brandTagline}>{final ? 'Final reminder' : 'Payment failed'}</Text>
          </Section>

          <Section style={body}>
            <Text style={h1}>
              {final ? 'Your subscription expires tomorrow' : 'Your subscription payment failed'}
            </Text>
            <Text style={text}>Hi {userFirstName || 'there'},</Text>
            <Text style={text}>
              We couldn&apos;t collect the {amount} payment for your <strong>{tierName}</strong>{' '}
              subscription{companyName ? <> for <strong>{companyName}</strong></> : null}. This is
              usually an expired card, a card limit, or a bank declining a recurring debit — nothing
              is wrong with your account.
            </Text>

            <Section style={stepCard}>
              <Text style={stepTitle}>
                Please pay by {deadline} or your subscription will expire in {dayWord}
              </Text>
              <Text style={stepBody}>
                Click <strong>Pay now</strong> to pay securely through PayFast. Your plan continues
                straight away and renews monthly on the card you use. If we haven&apos;t received
                payment by {deadline}, your account moves to the Free plan: your business stays listed
                and nothing is deleted, but premium features stop until you resubscribe.
              </Text>
            </Section>

            <Section style={{ marginTop: '24px', textAlign: 'center' as const }}>
              <Button href={payUrl} style={button}>Pay now — {amount}</Button>
            </Section>

            <Section style={{ marginTop: '12px', textAlign: 'center' as const }}>
              <Button href={`${appUrl}/pricing`} style={secondaryButton}>Choose a different plan</Button>
            </Section>

            <Text style={{ ...muted, textAlign: 'center' as const, marginTop: '16px' }}>
              Don&apos;t want to continue?{' '}
              <Link href={`${appUrl}/settings/billing`} style={link}>Cancel your subscription</Link>
              {' '}and move to the Free plan.
            </Text>

            <Hr style={hr} />
            <Text style={muted}>
              Already paid? You can ignore this — it can take a few minutes to reflect. If you think
              this is a mistake, reply to this email or{' '}
              <Link href={`${appUrl}/contact`} style={link}>contact us</Link> and we&apos;ll sort it out.
            </Text>
          </Section>

          <Section style={footerBar}>
            <Text style={{ ...footer, margin: '0 0 6px' }}>
              <Link href={`${appUrl}/settings/billing`} style={link}>Billing</Link>
              {'  ·  '}
              <Link href={`${appUrl}/contact`} style={link}>Contact</Link>
            </Text>
            <Text style={{ ...footer, margin: '0' }}>
              © {new Date().getFullYear()} VerifiedBizLink. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default PaymentFailedEmail;
