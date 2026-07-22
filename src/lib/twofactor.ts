import { generateSecret, generate, verify, generateURI } from 'otplib';
import crypto from 'crypto';

// TOTP secrets must be reversible (unlike a password, we need the raw
// value back to compute valid codes), so they can't be one-way hashed —
// they're encrypted at rest instead. A plaintext DB dump alone is then
// not enough to generate valid codes for a user's authenticator; the
// attacker would also need this app-side key, which never lives in the
// database.
function getEncryptionKey(): Buffer {
  const raw = process.env.TWO_FACTOR_ENCRYPTION_KEY;
  if (!raw || raw.length !== 64) {
    throw new Error('TWO_FACTOR_ENCRYPTION_KEY must be set to a 64-character hex string (32 bytes)');
  }
  return Buffer.from(raw, 'hex');
}

export function encryptTotpSecret(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptTotpSecret(payload: string): string {
  const key = getEncryptionKey();
  const [ivHex, tagHex, dataHex] = payload.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
  return decrypted.toString('utf8');
}

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
