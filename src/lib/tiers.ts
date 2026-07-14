// Single source of truth for VerifiedBizLink's business tiers. Every price,
// ad allowance, and feature list shown anywhere in the app (pricing page,
// billing tab, onboarding, ad limits) must come from here — previously each
// of those had its own hard-coded copy and they'd drifted out of sync.
export const PACKAGES = {
  free: {
    name: 'Free',
    price: 0,
    adLimit: 0,
    features: [
      'Basic business listing',
      'Up to 10 network connections',
      'Standard trust badge',
      '1 post per day',
    ],
  },
  standard: {
    name: 'Standard',
    price: 299,
    adLimit: 1,
    features: [
      'Enhanced business profile',
      'Unlimited connections',
      'Priority discovery listing',
      'Unlimited posts',
      '1 active ad',
      'Basic analytics',
    ],
  },
  premium: {
    name: 'Premium',
    price: 699,
    adLimit: 5,
    features: [
      'Everything in Standard',
      'Gold Verified badge (fast-tracked)',
      'Boosted ad placement',
      '5 active ads',
      'Full analytics dashboard',
      'AI content assistant (unlimited)',
      'Priority vetting review',
      'Dedicated account manager',
    ],
  },
  premium_half: {
    name: 'Premium Trial',
    price: 0,
    adLimit: 3,
    features: [
      'Gold Verified badge eligibility',
      'Up to 3 active ads',
      'Enhanced analytics',
      'AI content assistant',
      'Priority vetting review',
    ],
    note: '2-week trial — half of Premium features',
  },
} as const;

export type PackageType = keyof typeof PACKAGES;

export const AD_LIMITS: Record<string, number> = Object.fromEntries(
  Object.entries(PACKAGES).map(([key, tier]) => [key, tier.adLimit])
);

// PayFast purchaseType -> the package it grants once the ITN confirms payment.
export const PURCHASE_TYPE_TO_PACKAGE: Record<string, Exclude<PackageType, 'free' | 'premium_half'>> = {
  subscription_standard: 'standard',
  subscription_premium: 'premium',
};

// A business on an active premium_half trial should get the trial's ad
// allowance even though package_type itself stays 'free' (the trial doesn't
// mutate package_type — it just temporarily elevates what's effective, and
// naturally lapses once trial_ends_at passes without needing a cron job).
// Typed loosely (not a strict shape) because callers pass raw db rows
// (Record<string, any>), which TS won't structurally match against an
// object type with named required properties.
export function getEffectivePackage(biz: Record<string, any>): string {
  if (biz.trial_package && biz.trial_ends_at && new Date(biz.trial_ends_at) > new Date()) {
    return biz.trial_package;
  }
  return biz.package_type;
}
