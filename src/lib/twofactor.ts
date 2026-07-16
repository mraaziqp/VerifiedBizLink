import { generateSecret, generate, verify, generateURI } from 'otplib';
import crypto from 'crypto';

export function generateTotpSecret(): string {
  return generateSecret();
}

export function getOtpAuthUri(secret: string, email: string): string {
  return generateURI({ issuer: 'VerifiedBizLink', label: email, secret });
}

export async function verifyTotpToken(token: string, secret: string): Promise<boolean> {
  try {
    const result = await verify({ secret, token: token.replace(/\s/g, '') });
    return result.valid;
  } catch {
    return false;
  }
}

// Only used to hand a fresh code to the setup-verification flow for a live smoke test.
export async function generateTotpToken(secret: string): Promise<string> {
  return generate({ secret });
}

export function generateBackupCodes(count = 8): string[] {
  return Array.from({ length: count }, () => {
    const raw = crypto.randomBytes(5).toString('hex').toUpperCase();
    return `${raw.slice(0, 5)}-${raw.slice(5, 10)}`;
  });
}

export function hashBackupCode(code: string): string {
  const normalized = code.replace(/-/g, '').toUpperCase();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}
