import type {
  SubscriptionTier,
  UserSubscription,
  PlusPricingPlan,
} from '../types/subscription.ts';

export const EARLY_OFFER_END_DATE = '2026-12-31T23:59:59Z';

export const PLUS_PRICING_PLANS: Record<SubscriptionTier, PlusPricingPlan> = {
  monthly: {
    tier: 'monthly',
    name: 'Sanctra Plus+ · Monthly',
    priceInINR: 59,
    amountInPaise: 5900,
    periodLabel: 'month',
    billingInterval: 'month',
    renewalPriceInINR: 59,
    description: '30 days of Plus, activated manually after payment confirmation.',
    features: [
      'Tasteful glowing Plus profile identity',
      'Animated avatar with static fallback',
      'Curated animated focus profile scenes',
      'Exclusive motion wallpapers',
      'Custom group invitation codes',
      'Higher group and chat allowances',
      'Priority support placement',
    ],
  },
  yearly: {
    tier: 'yearly',
    name: 'Sanctra Plus+ · Annual',
    priceInINR: 159,
    amountInPaise: 15900,
    periodLabel: 'year',
    billingInterval: 'year',
    renewalPriceInINR: 159,
    description: '365 days of Plus, activated manually after payment confirmation.',
    features: [
      'All monthly Plus features included',
      'Best standard annual value',
      '365 days of continuous focus sanctuary',
      'Animated profile identity',
      'Custom group invitation codes',
      'Priority queue for support',
    ],
  },
  early_yearly: {
    tier: 'early_yearly',
    name: 'Sanctra Plus+ · Early Believer Offer',
    priceInINR: 99,
    amountInPaise: 9900,
    periodLabel: 'first year',
    billingInterval: 'year',
    renewalPriceInINR: 159,
    isEarlyOffer: true,
    earlyOfferEndsAt: EARLY_OFFER_END_DATE,
    description: '₹99 for the first year. Manual renewal through support; no automatic charges.',
    features: [
      'Introductory ₹99 for year one',
      'Manual renewal through support; no automatic charges',
      'Early adopter sanctuary badge',
      'All Plus animated and custom features',
      'Offer valid through December 31, 2026',
    ],
  },
};

export function isEarlyOfferValid(date: Date = new Date()): boolean {
  return date.getTime() <= new Date(EARLY_OFFER_END_DATE).getTime();
}

export function getPlanForTier(tier: SubscriptionTier, date: Date = new Date()): PlusPricingPlan {
  if (tier === 'early_yearly' && !isEarlyOfferValid(date)) {
    return PLUS_PRICING_PLANS.yearly;
  }
  return PLUS_PRICING_PLANS[tier];
}

export function isEntitlementActive(sub: UserSubscription | null, nowMs: number = Date.now()): boolean {
  if (!sub) return false;
  return sub.isPlus && sub.currentPeriodEnd > nowMs && ['active', 'cancelled'].includes(sub.status);
}
