export type SubscriptionTier = 'monthly' | 'yearly' | 'early_yearly';

export type SubscriptionStatus = 'none' | 'active' | 'past_due' | 'cancelled' | 'expired';

export interface UserSubscription {
  uid: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  isPlus: boolean;
  currentPeriodStart: number; // Unix ms
  currentPeriodEnd: number;   // Unix ms
  cancelAtPeriodEnd: boolean;
  cancelledAt?: number;
  razorpaySubscriptionId?: string;
  razorpayCustomerId?: string;
  createdAt: number;
  updatedAt: number;
  isTrial?: boolean;
  adminAccess?: boolean;
  activationMethod?: 'manual';
}

export interface SubscriptionInvoice {
  id: string;
  uid: string;
  amount: number;         // In Rupees (e.g., 59, 150, 159)
  amountInPaise: number;  // In paise (e.g., 5900, 15000, 15900)
  currency: 'INR';
  status: 'paid' | 'failed' | 'refunded';
  tier: SubscriptionTier;
  periodStart: number;
  periodEnd: number;
  paidAt: number;
  razorpayPaymentId: string;
  razorpayOrderId?: string;
  receiptNumber: string;
}

export interface PlusPricingPlan {
  tier: SubscriptionTier;
  name: string;
  priceInINR: number;
  amountInPaise: number;
  periodLabel: string;
  billingInterval: 'month' | 'year';
  renewalPriceInINR: number;
  isEarlyOffer?: boolean;
  earlyOfferEndsAt?: string;
  description: string;
  features: string[];
}
