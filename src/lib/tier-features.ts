export type TierName = 'free' | 'verified' | 'standard' | 'premium' | 'enterprise';

export interface TierFeatures {
  name: TierName;
  displayName: string;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  features: {
    listings: number | 'unlimited';
    ads: number | 'unlimited';
    adImpressionsPerMonth: number | 'unlimited';
    storageGB: number;
    analytics: 'basic' | 'advanced' | 'enterprise';
    supportLevel: 'none' | 'email' | 'phone' | 'dedicated';
    customDomain: boolean;
    apiAccess: boolean;
    geofencing: boolean;
    advancedTargeting: boolean;
    fraudDetection: boolean;
    whitelabelOption: boolean;
  };
  adExposureMultiplier: number;
  benefits: string[];
  highlighted: boolean;
}

export const TIER_FEATURES: Record<TierName, TierFeatures> = {
  free: {
    name: 'free',
    displayName: 'Free Profile',
    monthlyPrice: 0,
    annualPrice: 0,
    description: 'Basic business listing (Get verified for R49 once-off)',
    features: {
      listings: 1,
      ads: 0,
      adImpressionsPerMonth: 0,
      storageGB: 1,
      analytics: 'basic',
      supportLevel: 'email',
      customDomain: false,
      apiAccess: false,
      geofencing: false,
      advancedTargeting: false,
      fraudDetection: false,
      whitelabelOption: false,
    },
    adExposureMultiplier: 0.5,
    benefits: [
      'Basic business profile',
      'Eligible for R49 once-off verified badge',
      '1 post per day',
      'Direct customer inquiries',
    ],
    highlighted: false,
  },

  verified: {
    name: 'verified',
    displayName: 'Verified Business',
    monthlyPrice: 9900, // R99.00 in cents
    annualPrice: 99000, // R990.00 in cents
    description: 'Essential verification & monthly tools',
    features: {
      listings: 2,
      ads: 0,
      adImpressionsPerMonth: 2000,
      storageGB: 5,
      analytics: 'basic',
      supportLevel: 'email',
      customDomain: false,
      apiAccess: false,
      geofencing: false,
      advancedTargeting: false,
      fraudDetection: false,
      whitelabelOption: false,
    },
    adExposureMultiplier: 0.8,
    benefits: [
      'CIPC & ID document verification',
      'Official Gold Verified Trust Badge',
      'Customer reviews & Trust Score',
      'Priority discovery in search',
      'Up to 2 business listings',
      'Email priority support',
    ],
    highlighted: false,
  },

  standard: {
    name: 'standard',
    displayName: 'Standard',
    monthlyPrice: 29900, // R299.00 in cents
    annualPrice: 299000, // R2990.00 in cents (discount)
    description: 'For growing businesses',
    features: {
      listings: 5,
      ads: 1,
      adImpressionsPerMonth: 10000,
      storageGB: 10,
      analytics: 'advanced',
      supportLevel: 'email',
      customDomain: false,
      apiAccess: false,
      geofencing: true,
      advancedTargeting: true,
      fraudDetection: true,
      whitelabelOption: false,
    },
    adExposureMultiplier: 1.0,
    benefits: [
      'Everything in Free / Verified',
      '1 active ad per month (14 days boost)',
      'Priority discovery listing',
      'Unlimited connections & posts',
      'Basic analytics dashboard',
      '10GB file storage',
      'Email priority support',
    ],
    highlighted: true,
  },

  premium: {
    name: 'premium',
    displayName: 'Premium',
    monthlyPrice: 69900, // R699.00 in cents
    annualPrice: 699000, // R6990.00 in cents (discount)
    description: 'For serious enterprises',
    features: {
      listings: 20,
      ads: 5,
      adImpressionsPerMonth: 'unlimited',
      storageGB: 100,
      analytics: 'advanced',
      supportLevel: 'phone',
      customDomain: true,
      apiAccess: true,
      geofencing: true,
      advancedTargeting: true,
      fraudDetection: true,
      whitelabelOption: false,
    },
    adExposureMultiplier: 1.5,
    benefits: [
      'Everything in Standard',
      'Gold Verified badge (fast-tracked 24h)',
      'Boosted ad placement (5 active ads)',
      'Full analytics dashboard & lead reports',
      'AI content assistant (unlimited)',
      '100GB file storage',
      'Phone & email priority support',
      'Dedicated account manager',
    ],
    highlighted: false,
  },

  enterprise: {
    name: 'enterprise',
    displayName: 'Enterprise',
    monthlyPrice: 0, // Custom pricing
    annualPrice: 0, // Custom pricing
    description: 'Custom solutions for large organizations',
    features: {
      listings: 'unlimited',
      ads: 'unlimited',
      adImpressionsPerMonth: 'unlimited',
      storageGB: 1000,
      analytics: 'enterprise',
      supportLevel: 'dedicated',
      customDomain: true,
      apiAccess: true,
      geofencing: true,
      advancedTargeting: true,
      fraudDetection: true,
      whitelabelOption: true,
    },
    adExposureMultiplier: 2.0,
    benefits: [
      'Everything in Premium',
      'White-label solution',
      'Unlimited storage',
      'Dedicated account manager',
      '24/7 priority support',
      'Custom integrations',
      'Advanced security features',
      'SLA guarantee',
      'Custom reporting',
      'Staff training included',
      'Co-marketing opportunities',
    ],
    highlighted: false,
  },
};

/**
 * Get tier by name
 */
export function getTierByName(name: TierName): TierFeatures {
  return TIER_FEATURES[name];
}

/**
 * Get all tiers
 */
export function getAllTiers(): TierFeatures[] {
  return Object.values(TIER_FEATURES);
}

/**
 * Check if business has feature (as boolean)
 */
export function hasTierFeature<K extends keyof TierFeatures['features']>(
  tierName: TierName,
  feature: K
): TierFeatures['features'][K] {
  return getTierByName(tierName).features[feature];
}

/**
 * Format price for display
 */
export function formatPrice(priceInCents: number, currency: string = 'ZAR'): string {
  const priceInRands = priceInCents / 100;
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(priceInRands);
}

/**
 * Calculate annual savings for yearly subscription
 */
export function getAnnualSavings(monthlyPrice: number, annualPrice: number): number {
  const monthlyTotal = monthlyPrice * 12;
  return monthlyTotal - annualPrice;
}
