export type TierName = 'free' | 'standard' | 'premium' | 'enterprise';

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
    displayName: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    description: 'Perfect for getting started',
    features: {
      listings: 1,
      ads: 0,
      adImpressionsPerMonth: 0,
      storageGB: 1,
      analytics: 'basic',
      supportLevel: 'none',
      customDomain: false,
      apiAccess: false,
      geofencing: false,
      advancedTargeting: false,
      fraudDetection: false,
      whitelabelOption: false,
    },
    adExposureMultiplier: 0.5,
    benefits: [
      'One business listing',
      'Basic profile information',
      'View profile analytics',
      'Email support',
      'Community access',
    ],
    highlighted: false,
  },

  standard: {
    name: 'standard',
    displayName: 'Standard',
    monthlyPrice: 4999, // R49.99 in cents
    annualPrice: 49990, // R499.90 in cents (discount)
    description: 'For growing businesses',
    features: {
      listings: 5,
      ads: 5,
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
      'Up to 5 business listings',
      'Create & manage ads (limit 5)',
      'Geo-targeted promotions',
      'Advanced analytics dashboard',
      ' 10GB file storage',
      'Email priority support',
      'Fraud detection for ads',
      'Basic API access',
    ],
    highlighted: true,
  },

  premium: {
    name: 'premium',
    displayName: 'Premium',
    monthlyPrice: 9999, // R99.99 in cents
    annualPrice: 99990, // R999.90 in cents (discount)
    description: 'For serious enterprises',
    features: {
      listings: 20,
      ads: 'unlimited',
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
      'Unlimited business listings',
      'Unlimited ads & campaigns',
      'Unlimited ad impressions',
      'Advanced geo-targeting',
      'Custom domain support',
      '100GB file storage',
      'Enterprise analytics',
      'Phone & email 24/7 support',
      'Full API access',
      'Advanced fraud detection',
      'Priority ad placement',
      'Marketing consultation',
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
