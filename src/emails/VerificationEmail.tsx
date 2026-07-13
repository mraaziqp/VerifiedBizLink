import { Html, Head, Body, Container, Section, Text, Button } from '@react-email/components';
import * as React from 'react';
import { main, container, h1, text, button, footer } from './styles';

interface VerificationEmailProps {
  userFirstName: string;
  verificationLink: string;
}

export const VerificationEmail = ({ userFirstName, verificationLink }: VerificationEmailProps) => (
  <Html>
    <Head />
    <Body style={main}>
      <Container style={container}>
        <Section>
          <Text style={h1}>Welcome to VerifiedBizLink</Text>
          <Text style={text}>Hi {userFirstName || 'there'},</Text>
          <Text style={text}>
            Thank you for joining the trusted network for verified businesses. To secure your account and start connecting, please verify your email address.
          </Text>
          <Button href={verificationLink} style={button}>
            Verify Email Address
          </Button>
          <Text style={{ ...text, marginTop: '24px' }}>
            If you did not create an account with VerifiedBizLink, you can safely ignore this email.
          </Text>
          <Text style={footer}>
            © {new Date().getFullYear()} VerifiedBizLink. All rights reserved.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default VerificationEmail;
