import { Html, Head, Preview, Body, Container, Section, Text, Button, Hr, Link } from '@react-email/components';
import * as React from 'react';
import {
  main, shell, body, brandBar, brandWordmark, brandWordmarkAccent, brandTagline,
  h1, text, button, stepCard, stepTitle, stepBody, hr, muted, link, footerBar, footer,
} from './styles';

interface VerificationEmailProps {
  userFirstName: string;
  verificationLink: string;
}

export const VerificationEmail = ({ userFirstName, verificationLink }: VerificationEmailProps) => {
  const firstName = (userFirstName || 'there').trim();

  return (
    <Html>
      <Head />
      <Preview>Verify your VerifiedBizLink account to unlock full features & verified trust.</Preview>
      <Body style={main}>
        <Container style={shell}>
          {/* Brand Header */}
          <Section style={brandBar}>
            <Text style={brandWordmark}>
              Verified<span style={brandWordmarkAccent}>Biz</span>Link
            </Text>
            <Text style={brandTagline}>
              South Africa&apos;s Trusted Business &amp; Member Network
            </Text>
          </Section>

          {/* Email Body */}
          <Section style={body}>
            <Text style={h1}>Welcome to the Network! 🎉</Text>
            <Text style={text}>
              Hi <strong>{firstName}</strong>,
            </Text>
            <Text style={text}>
              Thank you for registering with <strong>VerifiedBizLink</strong>. You are one quick step away from activating your account and joining thousands of trusted South African businesses and professionals.
            </Text>

            {/* Core Benefits Card */}
            <div style={{ margin: '24px 0', border: '1px solid #fef08a', backgroundColor: '#fefce8', borderRadius: '8px', padding: '16px 20px' }}>
              <Text style={{ ...stepTitle, color: '#854d0e', marginBottom: '8px' }}>
                🌟 What you unlock once verified:
              </Text>
              <Text style={{ ...stepBody, color: '#713f12', marginBottom: '6px' }}>
                • <strong>Verified Credibility:</strong> Display verified trust indicators and build immediate confidence.
              </Text>
              <Text style={{ ...stepBody, color: '#713f12', marginBottom: '6px' }}>
                • <strong>Direct Messaging &amp; Connects:</strong> Chat and network directly with registered businesses.
              </Text>
              <Text style={{ ...stepBody, color: '#713f12', margin: '0' }}>
                • <strong>Full Directory &amp; Reviews:</strong> Discover vetted partners across the Western Cape and South Africa.
              </Text>
            </div>

            {/* Primary CTA Button */}
            <div style={{ textAlign: 'center', margin: '32px 0 24px' }}>
              <Button href={verificationLink} style={{ ...button, maxWidth: '340px', margin: '0 auto', fontSize: '17px', fontWeight: 'bold' }}>
                Verify Email Address &rarr;
              </Button>
            </div>

            {/* Fallback Text Link */}
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px 16px', margin: '20px 0' }}>
              <Text style={{ fontSize: '12px', color: '#64748b', margin: '0 0 4px' }}>
                Button not working? Copy and paste this link into your browser:
              </Text>
              <Text style={{ fontSize: '12px', color: '#0284c7', margin: '0', wordBreak: 'break-all' }}>
                <Link href={verificationLink} style={link}>
                  {verificationLink}
                </Link>
              </Text>
            </div>

            <Hr style={hr} />

            {/* Security note */}
            <Text style={{ ...muted, fontSize: '13px', margin: '0 0 8px' }}>
              🔒 <strong>Security Note:</strong> This one-time verification link will expire in 24 hours. If you did not create an account on VerifiedBizLink, you can safely disregard this email.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footerBar}>
            <Text style={footer}>
              &copy; {new Date().getFullYear()} VerifiedBizLink (Pty) Ltd. Western Cape, South Africa.
            </Text>
            <Text style={{ ...footer, marginTop: '4px' }}>
              Connecting you to trusted, verified businesses. Need help? Contact{' '}
              <Link href="mailto:info@verifiedbizlink.co.za" style={link}>
                info@verifiedbizlink.co.za
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default VerificationEmail;
