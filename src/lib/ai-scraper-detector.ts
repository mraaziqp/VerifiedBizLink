/**
 * AI Scrapers & Bot User-Agents Detector (Edge Runtime Safe)
 *
 * This module has ZERO Node.js dependencies and can safely execute
 * in the Next.js Edge Middleware runtime.
 */

const KNOWN_AI_SCRAPERS = [
  'gptbot',
  'chatgpt-user',
  'ccbot',
  'anthropic-ai',
  'claude-web',
  'bytespider',
  'cohere-ai',
  'diffbot',
  'facebookbot',
  'perplexitybot',
  'omgilibot',
  'imagesiftbot',
];

export function isAiScraper(userAgent: string | null): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return KNOWN_AI_SCRAPERS.some((bot) => ua.includes(bot));
}
