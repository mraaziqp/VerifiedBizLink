import QRCode from 'qrcode';

/**
 * Renders the certificate itself.
 *
 * The QR code is generated here and embedded as vector paths, not linked to an
 * image service. A certificate is printed, saved and forwarded — a linked
 * image would be blank on paper and offline, would tell a third party every
 * time somebody looked at one, and could be pointed somewhere else by anyone
 * who edited the file.
 *
 * None of this makes the FILE unforgeable; an SVG is text and always editable.
 * It makes forgery pointless: the serial and check code printed here are
 * verified against the issuing record, so a doctored company name simply fails
 * the check that the QR code invites everyone to run.
 */

export interface CertificateFields {
  companyName: string;
  regNumber: string | null;
  serial: string;
  checkCode: string;
  issuedAt: Date;
  verifiedSince: Date | null;
  verifyUrl: string;
}

/** Escapes text before it goes into SVG markup. */
function esc(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Long company names must shrink rather than run off the edge of the page. */
function fitFontSize(text: string, maxWidth: number, base: number): number {
  const approxCharWidth = 0.58; // for the bold sans stack below
  const needed = text.length * base * approxCharWidth;
  if (needed <= maxWidth) return base;
  return Math.max(18, Math.floor((maxWidth / (text.length * approxCharWidth))));
}

const ZA_DATE: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };

export async function renderCertificateSvg(f: CertificateFields): Promise<string> {
  // Error correction H: a certificate gets printed, folded, stamped and
  // photographed, and the code still has to scan.
  const qrPath = await QRCode.toString(f.verifyUrl, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 0,
    width: 200,
  });

  // Take just the path data out of the generated SVG so it can be placed
  // inside this document rather than nested as a second root element.
  const pathMatch = qrPath.match(/<path[^>]*d="([^"]+)"[^>]*\/?>/g) || [];
  const qrInner = pathMatch
    .map((p) => p.replace(/fill="[^"]*"/g, 'fill="#0f172a"').replace(/shape-rendering="[^"]*"/g, ''))
    .join('');
  const qrViewBox = (qrPath.match(/viewBox="([^"]+)"/) || [])[1] || '0 0 33 33';

  const name = esc(f.companyName);
  const nameSize = fitFontSize(f.companyName, 900, 44);
  const issued = f.issuedAt.toLocaleDateString('en-ZA', ZA_DATE);
  const since = f.verifiedSince ? f.verifiedSince.toLocaleDateString('en-ZA', ZA_DATE) : issued;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 850" width="1200" height="850" role="img" aria-label="Certificate of verification for ${name}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="50%" stop-color="#1a2340"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <pattern id="dots" patternUnits="userSpaceOnUse" width="50" height="50">
      <circle cx="25" cy="25" r="1" fill="#F5A800" opacity="0.10"/>
    </pattern>
    <style>
      .s { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
      .mono { font-family: 'Courier New', Courier, monospace; }
    </style>
  </defs>

  <rect width="1200" height="850" fill="url(#bg)"/>
  <rect width="1200" height="850" fill="url(#dots)"/>
  <rect x="40" y="40" width="1120" height="770" fill="none" stroke="#F5A800" stroke-width="3" opacity="0.5"/>
  <rect x="58" y="58" width="1084" height="734" fill="none" stroke="#F5A800" stroke-width="1" opacity="0.3"/>
  <g fill="#F5A800" opacity="0.7">
    <circle cx="80" cy="80" r="8"/><circle cx="1120" cy="80" r="8"/>
    <circle cx="80" cy="770" r="8"/><circle cx="1120" cy="770" r="8"/>
  </g>

  <circle cx="600" cy="152" r="46" fill="none" stroke="#F5A800" stroke-width="3" opacity="0.85"/>
  <path d="M578 152 l16 16 l30 -32" fill="none" stroke="#F5A800" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>

  <text class="s" x="600" y="252" font-size="42" font-weight="bold" text-anchor="middle" fill="#F5A800">CERTIFICATE OF VERIFICATION</text>
  <text class="s" x="600" y="288" font-size="19" text-anchor="middle" fill="#FFFFFF" opacity="0.75">VerifiedBizLink Trust Badge</text>
  <line x1="220" y1="318" x2="980" y2="318" stroke="#F5A800" stroke-width="2" opacity="0.55"/>

  <text class="s" x="600" y="392" font-size="${nameSize}" font-weight="bold" text-anchor="middle" fill="#FFFFFF">${name}</text>
  ${f.regNumber ? `<text class="s" x="600" y="426" font-size="17" text-anchor="middle" fill="#FFFFFF" opacity="0.7">Registration ${esc(f.regNumber)}</text>` : ''}

  <text class="s" x="600" y="482" font-size="17" text-anchor="middle" fill="#FFFFFF" opacity="0.88">This business has been verified on the VerifiedBizLink platform,</text>
  <text class="s" x="600" y="510" font-size="17" text-anchor="middle" fill="#FFFFFF" opacity="0.88">including CIPC registration and supporting document review.</text>

  <!-- Verification block: the part that makes the document checkable -->
  <rect x="120" y="556" width="620" height="196" rx="14" fill="#FFFFFF" opacity="0.06"/>
  <rect x="120" y="556" width="620" height="196" rx="14" fill="none" stroke="#F5A800" stroke-width="1" opacity="0.45"/>

  <text class="s" x="152" y="592" font-size="13" fill="#F5A800" font-weight="bold" letter-spacing="1.5">CERTIFICATE NUMBER</text>
  <text class="mono" x="152" y="628" font-size="27" font-weight="bold" fill="#FFFFFF">${esc(f.serial)}</text>

  <text class="s" x="152" y="668" font-size="13" fill="#F5A800" font-weight="bold" letter-spacing="1.5">CHECK CODE</text>
  <text class="mono" x="152" y="698" font-size="21" fill="#FFFFFF">${esc(f.checkCode)}</text>

  <text class="s" x="440" y="668" font-size="13" fill="#F5A800" font-weight="bold" letter-spacing="1.5">VERIFIED SINCE</text>
  <text class="s" x="440" y="698" font-size="17" fill="#FFFFFF">${esc(since)}</text>

  <text class="s" x="152" y="732" font-size="13" fill="#FFFFFF" opacity="0.6">Issued ${esc(issued)}</text>

  <!-- QR: embedded, so it works on paper and offline -->
  <rect x="800" y="556" width="280" height="196" rx="14" fill="#FFFFFF"/>
  <g transform="translate(852, 576)">
    <svg viewBox="${qrViewBox}" width="176" height="176">${qrInner}</svg>
  </g>
  <text class="s" x="940" y="770" font-size="13" text-anchor="middle" fill="#F5A800" font-weight="bold">SCAN TO VERIFY</text>

  <text class="s" x="600" y="800" font-size="13" text-anchor="middle" fill="#FFFFFF" opacity="0.55">Check this certificate at ${esc(f.verifyUrl)}</text>
</svg>`;
}
