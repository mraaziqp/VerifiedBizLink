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
}

function mapRow(row: Record<string, any>): Tier {
  return {
    key: row.key,
    name: row.name,
    price: row.price,
    adLimit: row.ad_limit,
    monthlyAdCredits: row.monthly_ad_credits,
    features: Array.isArray(row.features)
      ? row.features
      : JSON.parse(row.features || '[]'),
    note: row.note ?? null,
    sortOrder: row.sort_order,
    isActive: row.is_active,
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

// PayFast purchaseType -> the tier key it grants once the ITN confirms payment.
export const PURCHASE_TYPE_TO_PACKAGE: Record<string, string> = {
  subscription_standard: 'standard',
  subscription_premium: 'premium',
};

// Price (in Rand) per extra ad-day of credit when a business tops up beyond
// their tier's monthly allowance.
export const AD_CREDIT_PRICE_PER_DAY = 10;

// A business on an active premium_half trial should get the trial's ad
// allowance even though package_type itself stays 'free' (the trial doesn't
// mutate package_type — it just temporarily elevates what's effective, and
// naturally lapses once trial_ends_at passes without needing a cron job).
export function getEffectivePackage(biz: Record<string, any>): string {
  if (biz.trial_package && biz.trial_ends_at && new Date(biz.trial_ends_at) > new Date()) {
    return biz.trial_package;
  }
  return biz.package_type;
}

// Tops up a business's ad-credit balance once per calendar month, up to
// (additively) the effective tier's monthly allowance. Atomic single
// UPDATE — safe under concurrent requests since Postgres serializes
// concurrent UPDATEs on the same row, and the WHERE guard only matches
// once per month per business.
export async function ensureMonthlyAdCredits(businessId: string): Promise<void> {
  await db`
    UPDATE businesses b
    SET ad_credits = b.ad_credits + COALESCE((
          SELECT monthly_ad_credits FROM tiers
          WHERE key = CASE
            WHEN b.trial_package IS NOT NULL AND b.trial_ends_at IS NOT NULL AND b.trial_ends_at > NOW()
            THEN b.trial_package
            ELSE b.package_type
          END
        ), 0),
        credits_last_topped_up_at = NOW()
    WHERE b.id = ${businessId}
      AND (
        b.credits_last_topped_up_at IS NULL
        OR date_trunc('month', b.credits_last_topped_up_at) < date_trunc('month', NOW())
      )
  `;
}
