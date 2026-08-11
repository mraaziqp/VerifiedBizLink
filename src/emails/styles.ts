export const main = {
  backgroundColor: '#f8f9fa',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

export const container = {
  margin: '0 auto',
  padding: '40px 20px',
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  border: '1px solid #eaeaea',
  maxWidth: '600px',
};

export const h1 = {
  color: '#0B0F19',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '1.2',
  margin: '0 0 20px',
  textAlign: 'center' as const,
};

export const text = {
  color: '#334155',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 24px',
};

export const button = {
  backgroundColor: '#EAB308', // VerifiedBizLink Gold
  borderRadius: '6px',
  color: '#0B0F19',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '100%',
  padding: '14px 0',
};

export const footer = {
  color: '#94a3b8',
  fontSize: '14px',
  margin: '40px 0 0',
  textAlign: 'center' as const,
};

/* ---------------------------------------------------------------------------
 * Shared pieces for the richer lifecycle emails (welcome, abandoned signup).
 * Everything is inline-styled and table-safe: Outlook and Gmail strip <style>
 * blocks and most modern CSS, so no flexbox, no grid, no CSS variables.
 * ------------------------------------------------------------------------- */

export const brandBar = {
  backgroundColor: '#0B0F19',
  borderRadius: '8px 8px 0 0',
  padding: '28px 20px',
  textAlign: 'center' as const,
};

export const brandWordmark = {
  color: '#ffffff',
  fontSize: '22px',
  fontWeight: '700',
  letterSpacing: '0.5px',
  margin: '0',
};

export const brandWordmarkAccent = {
  color: '#EAB308',
};

export const brandTagline = {
  color: '#94a3b8',
  fontSize: '13px',
  margin: '6px 0 0',
};

/** Container for emails that use the dark brand bar - no top padding. */
export const shell = {
  margin: '0 auto',
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  border: '1px solid #eaeaea',
  maxWidth: '600px',
  overflow: 'hidden',
};

export const body = {
  padding: '32px 32px 8px',
};

export const h2 = {
  color: '#0B0F19',
  fontSize: '18px',
  fontWeight: '600',
  lineHeight: '1.3',
  margin: '0 0 12px',
};

/** A numbered "next step" tile. */
export const stepCard = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '16px 18px',
  margin: '0 0 12px',
};

export const stepTitle = {
  color: '#0B0F19',
  fontSize: '15px',
  fontWeight: '600',
  margin: '0 0 4px',
};

export const stepBody = {
  color: '#475569',
  fontSize: '14px',
  lineHeight: '21px',
  margin: '0',
};

export const hr = {
  borderColor: '#e2e8f0',
  margin: '28px 0 20px',
};

export const muted = {
  color: '#64748b',
  fontSize: '14px',
  lineHeight: '21px',
  margin: '0 0 16px',
};

export const link = {
  color: '#B45309',
  textDecoration: 'underline',
};

export const footerBar = {
  backgroundColor: '#f8fafc',
  borderTop: '1px solid #e2e8f0',
  padding: '20px 32px 24px',
  textAlign: 'center' as const,
};
