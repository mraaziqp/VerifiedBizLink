import { Html, Head, Preview, Body, Container, Section, Text, Button, Hr, Link } from '@react-email/components';
import * as React from 'react';
import {
  main, shell, body, brandBar, brandWordmark, brandWordmarkAccent, brandTagline,
  h1, text, button, stepCard, stepTitle, stepBody, hr, muted, link, footerBar, footer,
} from './styles';

interface AbandonedSignupEmailProps {
  userFirstName: string;
  /** What the user still has outstanding — drives the copy and the CTA. */
  reason: 'unverified' | 'incomplete_profile';
  /** Only present for the 'unverified' case: a fresh verification link. */
  verificationLink?: string;
  appUrl: string;
}

/**
 * The 48-hour nudge. Sent once per account by the abandoned-signups cron when
 * someone registers but never finishes — either they never clicked the
 * verification link, or they verified but never filled in their business
 * profile. One email, no drip sequence: if they ignore this, we leave them be.
 */
export const AbandonedSignupEmail = ({
  userFirstName,
  reason,
  verificationLink,
  appUrl,
}: AbandonedSignupEmailProps) => {
  const unverified = reason === 'unverified';

  const heading = unverified
    ? 'Your account is one click from being live'
    : 'Your profile is almost ready';

  const intro = unverified
    ? 'You signed up a couple of days ago but never confirmed your email address, so your account is still on hold. Confirming takes one click and unlocks everything.'
    : 'Your email is confirmed, but your business profile is still empty — which means customers browsing Explore cannot find you yet.';

  const ctaHref = unverified ? (verificationLink || `${appUrl}/verify-email`) : `${appUrl}/onboarding`;
  const ctaLabel = unverified ? 'Confirm my email address' : 'Finish my profile';

  return (
    <Html>
      <Head />
      <Preview>{heading}</Preview>
      <Body style={main}>
        <Container style={shell}>
          <Section style={brandBar}>
            <Text style={brandWordmark}>
              Verified<span style={brandWordmarkAccent}>Biz</span>Link
            </Text>
            <Text style={brandTagline}>South Africa&apos;s trusted business network</Text>
          </Section>

          <Section style={body}>
            <Text style={h1}>{heading}</Text>
            <Text style={text}>Hi {userFirstName || 'there'},</Text>
            <Text style={text}>{intro}</Text>

            <Section style={stepCard}>
              <Text style={stepTitle}>What you unlock</Text>
              <Text style={stepBody}>
                A public business profile, direct Connects from customers, your listing in category
                search, and the ability to submit documents for the Verified badge.
              </Text>
            </Section>

            <Section style={{ marginTop: '24px' }}>
              <Button href={ctaHref} style={button}>{ctaLabel}</Button>
            </Section>

            <Hr style={hr} />

            <Text style={muted}>
              {unverified
                ? 'If the button does not work, the link may have expired — you can request a fresh one from the sign-in page at any time.'
                : 'It takes about three minutes, and you can change any of it later.'}
            </Text>
            <Text style={muted}>
              Not interested after all? No action needed — this is the only reminder we&apos;ll send.
            </Text>
          </Section>

          <Section style={footerBar}>
            <Text style={{ ...footer, margin: '0 0 6px' }}>
              <Link href={`${appUrl}/explore`} style={link}>Explore</Link>
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

export default AbandonedSignupEmail;
