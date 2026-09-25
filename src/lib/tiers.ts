import db from '@/lib/db';

// Single source of truth for VerifiedBizLink's business tiers — backed by
// the `tiers` table so admins can add/edit tiers, prices, ad limits, and
// monthly ad-credit allowances without a code deploy. Every price, ad
// allowance, and feature list shown anywhere in the app must come from
// here, not a hard-coded copy.
export interface Tier {
  key: string;
  name: string;
  price: number;
  adLimit: number;
  monthlyAdCredits: number;
  features: string[];
  note?: string | null;
  sortOrder: number;
  isActive: boolean;
  isPurchasable: boolean;
}

function mapRow(row: Record<string, unknown>): Tier {
  const key = String(row.key);
  const isFree = key === 'free';
  const isVerified = key === 'verified';
  return {
    key,
    name: isVerified ? 'Verified Business' : isFree ? 'Free Profile' : String(row.name),
    price: isVerified ? (Number(row.price) > 0 ? Number(row.price) : 99) : Number(row.price),
    adLimit: Number(row.ad_limit),
    monthlyAdCredits: Number(row.monthly_ad_credits),
    features: Array.isArray(row.features)
      ? (row.features as string[])
      : JSON.parse((row.features as string) || '[]'),
    note: (row.note as string | null) ?? (isVerified ? 'Essential verification & monthly tools' : null),
    sortOrder: isVerified ? 1 : key === 'standard' ? 2 : key === 'premium' ? 3 : Number(row.sort_order),
    isActive: key === 'premium_half' ? false : row.is_active === true,
    isPurchasable: key === 'free' || key === 'premium_half' ? false : true,
  };
}

export async function getAllTiers(includeInactive = false): Promise<Tier[]> {
  const rows = includeInactive
    ? await db`SELECT * FROM tiers ORDER BY sort_order ASC`
    : await db`SELECT * FROM tiers WHERE is_active = true ORDER BY sort_order ASC`;
  return rows.map(mapRow);
}

export async function getTierMap(includeInactive = true): Promise<Record<string, Tier>> {
  const tiers = await getAllTiers(includeInactive);
  return Object.fromEntries(tiers.map((t) => [t.key, t]));
}

export async function getTier(key: string): Promise<Tier | null> {
  const rows = await db`SELECT * FROM tiers WHERE key = ${key} LIMIT 1`;
  return rows.length > 0 ? mapRow(rows[0]) : null;
}

export async function getAdLimit(packageKey: string): Promise<number> {
  const tier = await getTier(packageKey);
  return tier?.adLimit ?? 0;
}

// One-off ad boost: price in Rand and how long the boost lasts once paid.
// Mirrored client-side in src/app/business/ads/page.tsx (BOOST_PRICE) — keep
// both in sync. (Credit packs live in lib/ad-credits.ts.)
export const AD_BOOST_PRICE = 100;
export const AD_BOOST_DURATION_DAYS = 7;

/**
 * The once-off verification fee, in Rand.
 *
 * One number, read by the offer UI, the checkout guard and the webhook that
 * grants the badge. It was written as a literal 49 in each of those places,
 * which is three chances for a price change to grant a badge nobody paid the
 * new price for.
 */
export const VERIFICATION_FEE_RAND = 49;

// A business on an active premium_half trial should get the trial's ad
// allowance even though package_type itself stays 'free' (the trial doesn't
// mutate package_type — it just temporarily elevates what's effective, and
// naturally lapses once trial_ends_at passes without needing a cron job).
export function getEffectivePackage(biz: Record<string, unknown>): string {
  const trialPackage = biz.trial_package as string | null | undefined;
  const trialEndsAt = biz.trial_ends_at as string | Date | null | undefined;
  if (trialPackage && trialEndsAt && new Date(trialEndsAt) > new Date()) {
    return trialPackage;
  }
  return String(biz.package_type ?? 'free');
}

// Moved to lib/ad-credits so the monthly allowance is written to the credit
// ledger like every other credit change. Re-exported for existing imports.
export { ensureMonthlyAdCredits } from '@/lib/ad-credits';
