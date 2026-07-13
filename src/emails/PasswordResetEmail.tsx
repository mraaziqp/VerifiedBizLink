import { Html, Head, Body, Container, Section, Text, Button } from '@react-email/components';
import * as React from 'react';
import { main, container, h1, text, button, footer } from './styles';

interface PasswordResetEmailProps {
  resetLink: string;
}

export const PasswordResetEmail = ({ resetLink }: PasswordResetEmailProps) => (
  <Html>
    <Head />
    <Body style={main}>
      <Container style={container}>
        <Section>
          <Text style={h1}>Reset Your Password</Text>
          <Text style={text}>
            We received a request to reset the password for your VerifiedBizLink account. This link is only valid for the next 15 minutes.
          </Text>
          <Button href={resetLink} style={button}>
            Reset Password
          </Button>
          <Text style={{ ...text, marginTop: '24px' }}>
            If you did not request a password reset, please ignore this email or contact support if you have concerns.
          </Text>
          <Text style={footer}>
            © {new Date().getFullYear()} VerifiedBizLink. All rights reserved.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default PasswordResetEmail;
