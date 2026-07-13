import { Html, Head, Body, Container, Section, Text, Button } from '@react-email/components';
import * as React from 'react';
import { main, container, h1, text, button, footer } from './styles';

interface UsernameRecoveryEmailProps {
  usernames: string[];
  loginLink: string;
}

export const UsernameRecoveryEmail = ({ usernames, loginLink }: UsernameRecoveryEmailProps) => (
  <Html>
    <Head />
    <Body style={main}>
      <Container style={container}>
        <Section>
          <Text style={h1}>Account Recovery</Text>
          <Text style={text}>
            We received a request to recover the username associated with this email address. Below are the usernames linked to your VerifiedBizLink profile:
          </Text>
          
          <div style={{ backgroundColor: '#f1f5f9', padding: '16px', borderRadius: '6px', marginBottom: '24px' }}>
            {usernames.map((username, index) => (
              <Text key={index} style={{ ...text, color: '#0B0F19', fontWeight: 'bold', margin: '0' }}>
                • {username}
              </Text>
            ))}
          </div>

          <Button href={loginLink} style={button}>
            Return to Login
          </Button>
          <Text style={{ ...text, marginTop: '24px' }}>
            If you did not make this request, you can safely ignore this email.
          </Text>
          <Text style={footer}>
            © {new Date().getFullYear()} VerifiedBizLink. All rights reserved.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default UsernameRecoveryEmail;
