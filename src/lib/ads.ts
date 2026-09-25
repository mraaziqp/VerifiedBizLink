import db from '@/lib/db';

/**
 * Ad placement rules, priced and capped from ad_settings.
 *
 * The rates were hardcoded in the route that charges for an ad while the admin
 * screen edited ad_settings, so changing a price in the admin UI changed the
 * displayed cost and charged the old one. Same class of bug as the
 * verification fee written as a literal in three places: one number, read from
 * one place, or the price shown and the price taken drift apart.
 */

export type AdSlot = 'feed_inline' | 'top_banner' | 'sidebar_spotlight';

export const AD_SLOTS: AdSlot[] = ['feed_inline', 'top_banner', 'sidebar_spotlight'];

/** Used when a setting is missing, so a wiped settings table cannot make ads free. */
const FALLBACK_RATES: Record<AdSlot, number> = {
  feed_inline: 5,
  top_banner: 10,
  sidebar_spotlight: 15,
};

const FALLBACK_CAPS: Record<AdSlot, number> = {
  feed_inline: 5,
  top_banner: 3,
  sidebar_spotlight: 2,
};

/** ad_settings key holding the per-day credit cost of each slot. */
const RATE_KEY: Record<AdSlot, string> = {
  feed_inline: 'credit_cost_feed_day',
  top_banner: 'credit_cost_banner_day',
  sidebar_spotlight: 'credit_cost_spotlight_day',
};

/** ad_settings key holding how many of each slot may show at once. */
const CAP_KEY: Record<AdSlot, string> = {
  feed_inline: 'feed_ad_frequency',
  top_banner: 'top_banner_max',
  sidebar_spotlight: 'sidebar_spotlight_max',
};

export interface AdSettings {
  enabled: boolean;
  rates: Record<AdSlot, number>;
  caps: Record<AdSlot, number>;
}

export function isAdSlot(value: unknown): value is AdSlot {
  return typeof value === 'string' && (AD_SLOTS as string[]).includes(value);
}

export async function getAdSettings(): Promise<AdSettings> {
  const rows = (await db`SELECT key, value FROM ad_settings`.catch(() => [])) as unknown as
    { key: string; value: string }[];
  const map = new Map(rows.map((r) => [r.key, r.value]));

  const num = (key: string, fallback: number) => {
    const raw = map.get(key);
    const n = Number(raw);
    // A blank or unparseable setting must not become a zero-credit ad slot.
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };

  return {
    // Anything other than an explicit 'false' leaves ads on, so a missing row
    // does not silently switch off every advertiser's paid placement.
    enabled: map.get('ads_enabled') !== 'false',
    rates: {
      feed_inline: num(RATE_KEY.feed_inline, FALLBACK_RATES.feed_inline),
      top_banner: num(RATE_KEY.top_banner, FALLBACK_RATES.top_banner),
      sidebar_spotlight: num(RATE_KEY.sidebar_spotlight, FALLBACK_RATES.sidebar_spotlight),
    },
    caps: {
      feed_inline: num(CAP_KEY.feed_inline, FALLBACK_CAPS.feed_inline),
      top_banner: num(CAP_KEY.top_banner, FALLBACK_CAPS.top_banner),
      sidebar_spotlight: num(CAP_KEY.sidebar_spotlight, FALLBACK_CAPS.sidebar_spotlight),
    },
  };
}

/** What a placement costs per day, in credits. */
export async function getSlotRate(slot: AdSlot): Promise<number> {
  const settings = await getAdSettings();
  return settings.rates[slot];
}

export const AD_SLOT_LABELS: Record<AdSlot, string> = {
  feed_inline: 'In the feed',
  top_banner: 'Top banner',
  sidebar_spotlight: 'Sidebar spotlight',
};

export const AD_TEXT_LIMITS = { title: 80, description: 300, ctaText: 30, badge: 24 } as const;

/**
 * Where an ad's button may send people: our own pages ("/explore") or an
 * http(s) site. Anything else — javascript:, data:, protocol-relative "//"
 * — is refused. Ads are shown to every visitor, so an unchecked link here is
 * a link we are vouching for.
 */
export function cleanAdLink(raw: unknown): string | null {
  const value = String(raw ?? '').trim();
  if (!value) return '';
  if (value.startsWith('/') && !value.startsWith('//')) return value.slice(0, 500);
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (!url.hostname.includes('.')) return null;
    return url.toString().slice(0, 500);
  } catch {
    return null;
  }
}

/** Ad images: an uploaded file URL, one of our paths, or an inline image. */
export function cleanAdImage(raw: unknown): string | null {
  const value = String(raw ?? '').trim();
  if (!value) return '';
  if (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(value)) return value;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? value : null;
  } catch {
    return null;
  }
}
