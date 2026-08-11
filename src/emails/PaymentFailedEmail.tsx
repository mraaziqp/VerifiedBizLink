import { Html, Head, Preview, Body, Container, Section, Text, Button, Hr, Link } from '@react-email/components';
import * as React from 'react';
import {
  main, shell, body, brandBar, brandWordmark, brandWordmarkAccent, brandTagline,
  h1, text, button, stepCard, stepTitle, stepBody, hr, muted, link, footerBar, footer,
} from './styles';

interface PaymentFailedEmailProps {
  userFirstName: string;
  tierName: string;
  amount: string;
  hoursRemaining: number;
  deadline: string;
  appUrl: string;
}

/**
 * Sent the moment a renewal fails, and again as the 72-hour window closes.
 * Tone is deliberately calm: the account is not gone, nothing is deleted, and
 * the worst case is a downgrade they can reverse.
 */
export const PaymentFailedEmail = ({
  userFirstName, tierName, amount, hoursRemaining, deadline, appUrl,
}: PaymentFailedEmailProps) => (
  <Html>
    <Head />
    <Preview>{`We couldn't process your ${tierName} payment — ${hoursRemaining} hours to update it`}</Preview>
    <Body style={main}>
      <Container style={shell}>
        <Section style={brandBar}>
          <Text style={brandWordmark}>
            Verified<span style={brandWordmarkAccent}>Biz</span>Link
          </Text>
          <Text style={brandTagline}>Payment issue on your subscription</Text>
        </Section>

        <Section style={body}>
          <Text style={h1}>We couldn&apos;t process your payment</Text>
          <Text style={text}>Hi {userFirstName || 'there'},</Text>
          <Text style={text}>
            Your {amount} payment for <strong>{tierName}</strong> didn&apos;t go through. This is
            usually a card limit or an expired card rather than anything wrong with your account.
          </Text>

          <Section style={stepCard}>
            <Text style={stepTitle}>You have until {deadline}</Text>
            <Text style={stepBody}>
              That&apos;s about {hoursRemaining} hours. If we haven&apos;t received payment by then,
              your account moves to the Free tier automatically. Your business stays listed and
              nothing is deleted — your profile, gallery, documents and messages all remain. You
              just lose the premium features until payment resumes.
            </Text>
          </Section>

          <Section style={{ marginTop: '24px' }}>
            <Button href={`${appUrl}/settings`} style={button}>Update payment method</Button>
          </Section>

          <Hr style={hr} />
          <Text style={muted}>
            Already paid? You can ignore this — it can take a few minutes to reflect. If you think
            this is a mistake, reply to this email and we&apos;ll look into it.
          </Text>
        </Section>

        <Section style={footerBar}>
          <Text style={{ ...footer, margin: '0 0 6px' }}>
            <Link href={`${appUrl}/settings`} style={link}>Billing</Link>
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

export default PaymentFailedEmail;
