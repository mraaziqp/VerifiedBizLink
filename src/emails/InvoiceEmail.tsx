import { Html, Head, Preview, Body, Container, Section, Text, Hr, Link, Row, Column } from '@react-email/components';
import * as React from 'react';
import {
  main, shell, body, brandBar, brandWordmark, brandWordmarkAccent, brandTagline,
  h1, text, stepCard, stepTitle, hr, muted, link, footerBar, footer,
} from './styles';

export interface InvoiceEmailProps {
  userFirstName: string;
  invoiceNumber: string;
  tierName: string;
  description: string;
  /** Formatted for display, e.g. "R99.00" — the caller owns cents conversion. */
  amount: string;
  purchasedOn: string;
  renewalPrice: string;
  nextBillingAt: string;
  intervalLabel: string;
  /** The exact cancellation wording, from lib/billing subscriptionTerms(). */
  terms: string;
  appUrl: string;
}

/**
 * The transactional invoice, modelled on the Twitch subscription receipt the
 * team wanted: what you bought, what it cost, when it renews, what it will
 * cost then, and how to stop it — all visible without opening an attachment.
 */
export const InvoiceEmail = ({
  userFirstName, invoiceNumber, tierName, description, amount, purchasedOn,
  renewalPrice, nextBillingAt, intervalLabel, terms, appUrl,
}: InvoiceEmailProps) => (
  <Html>
    <Head />
    <Preview>{`Invoice ${invoiceNumber} — ${tierName} — ${amount}`}</Preview>
    <Body style={main}>
      <Container style={shell}>
        <Section style={brandBar}>
          <Text style={brandWordmark}>
            Verified<span style={brandWordmarkAccent}>Biz</span>Link
          </Text>
          <Text style={brandTagline}>Tax invoice &amp; subscription receipt</Text>
        </Section>

        <Section style={body}>
          <Text style={h1}>Thanks, {userFirstName || 'there'}.</Text>
          <Text style={text}>
            Here is your invoice for <strong>{tierName}</strong>. Keep it for your records —
            you can also download it any time from Settings &gt; Billing.
          </Text>

          <Section style={stepCard}>
            <Text style={stepTitle}>Invoice {invoiceNumber}</Text>
            {[
              ['Subscription tier', tierName],
              ['Content provided', description],
              ['Billing term', intervalLabel],
              ['Date of purchase', purchasedOn],
              ['Amount paid', amount],
              ['Renewal price', renewalPrice],
              ['Next billing date', nextBillingAt],
            ].map(([label, value]) => (
              <Row key={label} style={{ marginBottom: '6px' }}>
                <Column style={{ color: '#64748b', fontSize: '14px', width: '46%' }}>{label}</Column>
                <Column style={{ color: '#0B0F19', fontSize: '14px', fontWeight: '600' }}>{value}</Column>
              </Row>
            ))}
          </Section>

          <Hr style={hr} />

          <Text style={muted}>{terms}</Text>
          <Text style={muted}>
            To review or cancel your subscription, open{' '}
            <Link href={`${appUrl}/settings`} style={link}>Settings &gt; Billing</Link> in the app.
            Cancelling keeps your business listed on the free tier — your profile, gallery and
            documents are not deleted.
          </Text>
        </Section>

        <Section style={footerBar}>
          <Text style={{ ...footer, margin: '0 0 6px' }}>
            <Link href={`${appUrl}/settings`} style={link}>Billing</Link>
            {'  ·  '}
            <Link href={`${appUrl}/terms`} style={link}>Terms</Link>
            {'  ·  '}
            <Link href={`${appUrl}/refund-policy`} style={link}>Refund policy</Link>
          </Text>
          <Text style={{ ...footer, margin: '0' }}>
            © {new Date().getFullYear()} VerifiedBizLink. All rights reserved.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default InvoiceEmail;
