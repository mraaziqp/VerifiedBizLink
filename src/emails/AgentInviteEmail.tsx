import { Html, Head, Preview, Body, Container, Section, Text, Button, Hr, Link } from '@react-email/components';
import * as React from 'react';
import {
  main, shell, body, brandBar, brandWordmark, brandWordmarkAccent, brandTagline,
  h1, text, button, stepCard, stepTitle, stepBody, hr, muted, link, footerBar, footer,
} from './styles';

interface AgentInviteEmailProps {
  fullName: string;
  inviteUrl: string;
  referralCode: string;
  invitedByName: string;
  commissionPercent: number;
  expiresInDays: number;
  appUrl: string;
}

/**
 * Sent to a newly hired marketer. Carries the one-time activation link and
 * their referral code, so their first day needs no separate briefing on how
 * they get credited.
 */
export const AgentInviteEmail = ({
  fullName, inviteUrl, referralCode, invitedByName,
  commissionPercent, expiresInDays, appUrl,
}: AgentInviteEmailProps) => (
  <Html>
    <Head />
    <Preview>{`Activate your VerifiedBizLink sales account — code ${referralCode}`}</Preview>
    <Body style={main}>
      <Container style={shell}>
        <Section style={brandBar}>
          <Text style={brandWordmark}>
            Verified<span style={brandWordmarkAccent}>Biz</span>Link
          </Text>
          <Text style={brandTagline}>Sales agent programme</Text>
        </Section>

        <Section style={body}>
          <Text style={h1}>Welcome to the team, {fullName?.split(' ')[0] || 'there'}.</Text>
          <Text style={text}>
            {invitedByName} has set up a Sales Agent account for you. Activate it below
            and choose your own password — nobody else ever sees it.
          </Text>

          <Section style={{ ...stepCard, textAlign: 'center' as const }}>
            <Text style={{ ...stepTitle, marginBottom: '4px' }}>Your referral code</Text>
            <Text
              style={{
                fontSize: '30px',
                fontWeight: '700',
                letterSpacing: '5px',
                color: '#0B0F19',
                margin: '4px 0 0',
              }}
            >
              {referralCode}
            </Text>
          </Section>

          <Section style={{ marginTop: '24px' }}>
            <Button href={inviteUrl} style={button}>Activate my account</Button>
          </Section>

          <Text style={{ ...muted, marginTop: '20px' }}>
            This link works once and expires in {expiresInDays} days.
          </Text>

          <Hr style={hr} />

          <Section style={stepCard}>
            <Text style={stepTitle}>How you get paid</Text>
            <Text style={stepBody}>
              You earn {commissionPercent}% of the first payment made by every business you
              sign up. Share your personal link or let them scan your QR code and the
              credit is automatic — there is nothing to fill in and nothing to remember.
              Your portal shows your sign-ups, what you have earned and what has been paid.
            </Text>
          </Section>
        </Section>

        <Section style={footerBar}>
          <Text style={{ ...footer, margin: '0 0 6px' }}>
            <Link href={`${appUrl}/agent`} style={link}>Sales portal</Link>
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

export default AgentInviteEmail;
