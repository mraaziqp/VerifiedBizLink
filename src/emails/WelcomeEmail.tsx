import { Html, Head, Preview, Body, Container, Section, Text, Button, Hr, Link } from '@react-email/components';
import * as React from 'react';
import {
  main, shell, body, brandBar, brandWordmark, brandWordmarkAccent, brandTagline,
  h1, text, button, stepCard, stepTitle, stepBody, hr, muted, link, footerBar, footer,
} from './styles';

interface WelcomeEmailProps {
  userFirstName: string;
  /** 'business' gets the seller onboarding path; anything else gets the buyer path. */
  role: string;
  appUrl: string;
}

/**
 * Sent once, the moment a user verifies their email. This is the first thing
 * they see after clicking through, so it doubles as the onboarding checklist —
 * the steps mirror the in-app flow exactly, and each one deep-links to the
 * page that completes it.
 */
export const WelcomeEmail = ({ userFirstName, role, appUrl }: WelcomeEmailProps) => {
  const isBusiness = role === 'business';

  const steps = isBusiness
    ? [
        {
          title: 'Complete your business profile',
          copy: 'Add your logo, description, contact details and service area. Profiles with a logo and description get noticeably more views.',
        },
        {
          title: 'Submit your documents for verification',
          copy: 'Upload your registration documents so our vetting desk can award your Verified badge. Verified businesses appear above unverified ones in Explore.',
        },
        {
          title: 'Get discovered',
          copy: 'Pick your category, add photos to your gallery, and start receiving Connects from customers looking for exactly what you offer.',
        },
      ]
    : [
        {
          title: 'Explore verified businesses',
          copy: 'Browse by category or search for what you need. Every business carrying the gold tick has had its documents checked by our vetting desk.',
        },
        {
          title: 'Connect directly',
          copy: 'Message any business straight from its profile — no call centres, no middlemen, no lead-selling.',
        },
        {
          title: 'Build your network',
          copy: 'Save the businesses you trust so they are one tap away the next time you need them.',
        },
      ];

  const ctaHref = isBusiness ? `${appUrl}/business/dashboard` : `${appUrl}/explore`;
  const ctaLabel = isBusiness ? 'Go to your Business Hub' : 'Start exploring';

  return (
    <Html>
      <Head />
      <Preview>
        {isBusiness
          ? 'Your VerifiedBizLink account is live — here is how to get discovered.'
          : 'Your VerifiedBizLink account is live — here is how to find verified businesses.'}
      </Preview>
      <Body style={main}>
        <Container style={shell}>
          <Section style={brandBar}>
            <Text style={brandWordmark}>
              Verified<span style={brandWordmarkAccent}>Biz</span>Link
            </Text>
            <Text style={brandTagline}>South Africa&apos;s trusted business network</Text>
          </Section>

          <Section style={body}>
            <Text style={h1}>You&apos;re in, {userFirstName || 'there'}.</Text>
            <Text style={text}>
              Your email is confirmed and your account is active. {isBusiness
                ? 'Here are the three things that get a new business found fastest:'
                : 'Here are three things worth doing first:'}
            </Text>

            {steps.map((step, i) => (
              <Section key={step.title} style={stepCard}>
                <Text style={stepTitle}>{i + 1}. {step.title}</Text>
                <Text style={stepBody}>{step.copy}</Text>
              </Section>
            ))}

            <Section style={{ marginTop: '28px' }}>
              <Button href={ctaHref} style={button}>{ctaLabel}</Button>
            </Section>

            <Hr style={hr} />

            <Text style={muted}>
              Questions? Just reply to this email, or use the chat assistant in the bottom-right
              corner of the app — it can answer account and verification questions directly.
            </Text>
          </Section>

          <Section style={footerBar}>
            <Text style={{ ...footer, margin: '0 0 6px' }}>
              <Link href={`${appUrl}/explore`} style={link}>Explore</Link>
              {'  ·  '}
              <Link href={`${appUrl}/pricing`} style={link}>Pricing</Link>
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

export default WelcomeEmail;
