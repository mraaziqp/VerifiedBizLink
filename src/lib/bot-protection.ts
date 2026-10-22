import { createHmac } from 'crypto';
import { NextRequest } from 'next/server';
import { isAiScraper } from './ai-scraper-detector';

export { isAiScraper };

/**
 * VerifiedBizLink Anti-Bot & AI Scraper Protection Engine
 *
 * Provides multi-layer defense against automated bots, form spammers,
 * credential stuffers, and unauthorized AI scrapers.
 */

const BOT_SECRET = process.env.BOT_PROTECTION_SECRET || process.env.JWT_SECRET || 'vbl_secure_bot_shield_token_2026';
const MIN_SUBMISSION_TIME_MS = 1200; // Faster than 1.2s is almost certainly a bot
const MAX_CHALLENGE_AGE_MS = 30 * 60 * 1000; // 30 minutes expiration

export interface BotChallengeTokenData {
  timestamp: number;
  nonce: string;
  hash: string;
}

/**
 * Generate a cryptographically signed challenge token for a client session.
 */
export function generateBotChallenge(): { token: string; timestamp: number } {
  const timestamp = Date.now();
  const nonce = Math.random().toString(36).slice(2, 10);
  const hash = createHmac('sha256', BOT_SECRET)
    .update(`${timestamp}:${nonce}`)
    .digest('hex');

  const token = Buffer.from(JSON.stringify({ timestamp, nonce, hash })).toString('base64');
  return { token, timestamp };
}

/**
 * Verify a submitted bot challenge token and validate submission speed.
 */
export function verifyBotChallenge(tokenString?: string | null): {
  valid: boolean;
  reason?: 'missing' | 'malformed' | 'expired' | 'too_fast' | 'invalid_signature';
  durationMs?: number;
} {
  if (!tokenString) {
    return { valid: false, reason: 'missing' };
  }

  try {
    const raw = Buffer.from(tokenString, 'base64').toString('utf-8');
    const data = JSON.parse(raw) as BotChallengeTokenData;

    if (!data.timestamp || !data.nonce || !data.hash) {
      return { valid: false, reason: 'malformed' };
    }

    const expectedHash = createHmac('sha256', BOT_SECRET)
      .update(`${data.timestamp}:${data.nonce}`)
      .digest('hex');

    if (expectedHash !== data.hash) {
      return { valid: false, reason: 'invalid_signature' };
    }

    const elapsed = Date.now() - data.timestamp;

    if (elapsed < MIN_SUBMISSION_TIME_MS) {
      return { valid: false, reason: 'too_fast', durationMs: elapsed };
    }

    if (elapsed > MAX_CHALLENGE_AGE_MS) {
      return { valid: false, reason: 'expired', durationMs: elapsed };
    }

    return { valid: true, durationMs: elapsed };
  } catch {
    return { valid: false, reason: 'malformed' };
  }
}

/**
 * Honeypot check: Bots fill hidden inputs that humans cannot see.
 */
export function verifyHoneypot(body: Record<string, unknown>): boolean {
  // If honeypot fields contain any value, it was filled by an automated bot
  if (body.vbl_hp_check || body._bot_trap || body.fax_number_hp) {
    return false; // Failed honeypot (it is a bot)
  }
  return true; // Passed
}


/**
 * Check request for bot signatures (honeypot + challenge + headers).
 */
export function inspectRequestForBots(
  request: NextRequest,
  body?: Record<string, unknown>
): { isBot: boolean; reason?: string } {
  const ua = request.headers.get('user-agent') || '';

  if (isAiScraper(ua)) {
    return { isBot: true, reason: 'ai_crawler' };
  }

  if (body) {
    if (!verifyHoneypot(body)) {
      return { isBot: true, reason: 'honeypot_triggered' };
    }

    const challengeToken = (body.vbl_bot_token || body._bot_token) as string | undefined;
    if (challengeToken) {
      const challenge = verifyBotChallenge(challengeToken);
      if (!challenge.valid) {
        return { isBot: true, reason: `challenge_${challenge.reason}` };
      }
    }
  }

  return { isBot: false };
}
