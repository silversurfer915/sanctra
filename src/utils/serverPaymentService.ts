import crypto from 'node:crypto';
import type {
  SubscriptionTier,
  UserSubscription,
  SubscriptionInvoice,
} from '../types/subscription.ts';
import {
  EARLY_OFFER_END_DATE,
  PLUS_PRICING_PLANS,
  isEarlyOfferValid,
  getPlanForTier,
  isEntitlementActive,
} from './subscriptionPlans.ts';

export {
  EARLY_OFFER_END_DATE,
  PLUS_PRICING_PLANS,
  isEarlyOfferValid,
  getPlanForTier,
  isEntitlementActive,
};

/**
 * Verify Razorpay payment signature after client checkout completion.
 */
export function verifyPaymentSignature(
  params: {
    orderId: string;
    paymentId: string;
    signature: string;
  },
  secret: string
): boolean {
  if (!params.orderId || !params.paymentId || !params.signature || !secret) {
    return false;
  }
  const text = `${params.orderId}|${params.paymentId}`;
  const generatedSignature = crypto.createHmac('sha256', secret).update(text).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(generatedSignature, 'utf8'),
    Buffer.from(params.signature, 'utf8')
  );
}

/**
 * Verify Razorpay webhook signature from raw request body.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  webhookSecret: string
): boolean {
  if (!rawBody || !signature || !webhookSecret) {
    return false;
  }
  const generatedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');
  const sigBuffer = Buffer.from(signature, 'utf8');
  const genBuffer = Buffer.from(generatedSignature, 'utf8');
  if (sigBuffer.length !== genBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(sigBuffer, genBuffer);
}

export interface PaymentWebhookEvent {
  id: string; // Razorpay event ID (x-razorpay-event-id or payload.entity.id)
  event:
    | 'payment.captured'
    | 'subscription.activated'
    | 'subscription.charged'
    | 'subscription.halted'
    | 'subscription.cancelled'
    | 'payment.failed'
    | 'refund.processed';
  payload: {
    payment?: {
      entity: {
        id: string;
        order_id?: string;
        amount: number;
        currency: string;
        status: string;
        method?: string;
        notes?: Record<string, string>;
      };
    };
    subscription?: {
      entity: {
        id: string;
        customer_id?: string;
        plan_id?: string;
        status: string;
        current_start?: number;
        current_end?: number;
        notes?: Record<string, string>;
      };
    };
    refund?: {
      entity: {
        id: string;
        payment_id: string;
        amount: number;
        currency: string;
        status: string;
        notes?: Record<string, string>;
      };
    };
  };
  createdAt?: number;
}

export interface SubscriptionStore {
  hasProcessedWebhook(eventId: string): Promise<boolean>;
  recordWebhookEvent(eventId: string, details: { event: string; processedAt: number }): Promise<void>;
  getSubscription(uid: string): Promise<UserSubscription | null>;
  setSubscription(uid: string, subscription: UserSubscription): Promise<void>;
  saveInvoice(uid: string, invoice: SubscriptionInvoice): Promise<void>;
  getInvoices(uid: string): Promise<SubscriptionInvoice[]>;
}

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export function calculatePeriodDuration(tier: SubscriptionTier): number {
  return tier === 'monthly' ? MONTH_MS : YEAR_MS;
}

/**
 * Idempotent webhook processor for server-side subscription management.
 */
export async function processRazorpayWebhookEvent(
  event: PaymentWebhookEvent,
  store: SubscriptionStore,
  nowMs: number = Date.now()
): Promise<{ status: 'processed' | 'skipped_duplicate' | 'unhandled'; details?: string }> {
  if (await store.hasProcessedWebhook(event.id)) {
    return { status: 'skipped_duplicate', details: `Event ${event.id} already processed` };
  }

  const payment = event.payload.payment?.entity;
  const subscription = event.payload.subscription?.entity;
  const refund = event.payload.refund?.entity;

  // Extract user ID from payment/subscription/refund notes
  const uid =
    payment?.notes?.uid ||
    subscription?.notes?.uid ||
    refund?.notes?.uid ||
    payment?.notes?.userId ||
    subscription?.notes?.userId ||
    refund?.notes?.userId;

  if (!uid) {
    // Cannot associate payment without UID note
    await store.recordWebhookEvent(event.id, { event: event.event, processedAt: nowMs });
    return { status: 'processed', details: 'No user ID in metadata notes' };
  }

  const requestedTier: SubscriptionTier =
    (payment?.notes?.tier as SubscriptionTier) ||
    (subscription?.notes?.tier as SubscriptionTier) ||
    'monthly';

  const currentSub = await store.getSubscription(uid);

  switch (event.event) {
    case 'payment.captured':
    case 'subscription.activated': {
      const duration = calculatePeriodDuration(requestedTier);
      const periodStart = nowMs;
      const periodEnd = periodStart + duration;

      const newSub: UserSubscription = {
        uid,
        tier: requestedTier,
        status: 'active',
        isPlus: true,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        razorpaySubscriptionId: subscription?.id || currentSub?.razorpaySubscriptionId,
        razorpayCustomerId: subscription?.customer_id || currentSub?.razorpayCustomerId,
        createdAt: currentSub?.createdAt || nowMs,
        updatedAt: nowMs,
      };

      await store.setSubscription(uid, newSub);

      const plan = getPlanForTier(requestedTier);
      const invoice: SubscriptionInvoice = {
        id: `inv_${event.id}`,
        uid,
        amount: plan.priceInINR,
        amountInPaise: payment?.amount || plan.amountInPaise,
        currency: 'INR',
        status: 'paid',
        tier: requestedTier,
        periodStart,
        periodEnd,
        paidAt: nowMs,
        razorpayPaymentId: payment?.id || `pay_${event.id}`,
        razorpayOrderId: payment?.order_id,
        receiptNumber: `SANCTRA-${nowMs.toString(36).toUpperCase()}`,
      };

      await store.saveInvoice(uid, invoice);
      break;
    }

    case 'subscription.charged': {
      // Annual or monthly renewal
      const previousEnd = currentSub?.currentPeriodEnd && currentSub.currentPeriodEnd > nowMs
        ? currentSub.currentPeriodEnd
        : nowMs;

      // Note: early_yearly renews at standard yearly price
      const activeTier: SubscriptionTier =
        currentSub?.tier === 'early_yearly' ? 'yearly' : currentSub?.tier || requestedTier;
      const duration = calculatePeriodDuration(activeTier);
      const periodEnd = previousEnd + duration;

      const renewedSub: UserSubscription = {
        uid,
        tier: activeTier,
        status: 'active',
        isPlus: true,
        currentPeriodStart: previousEnd,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        razorpaySubscriptionId: subscription?.id || currentSub?.razorpaySubscriptionId,
        razorpayCustomerId: subscription?.customer_id || currentSub?.razorpayCustomerId,
        createdAt: currentSub?.createdAt || nowMs,
        updatedAt: nowMs,
      };

      await store.setSubscription(uid, renewedSub);

      const plan = getPlanForTier(activeTier);
      const invoice: SubscriptionInvoice = {
        id: `inv_${event.id}`,
        uid,
        amount: plan.renewalPriceInINR,
        amountInPaise: payment?.amount || plan.amountInPaise,
        currency: 'INR',
        status: 'paid',
        tier: activeTier,
        periodStart: previousEnd,
        periodEnd,
        paidAt: nowMs,
        razorpayPaymentId: payment?.id || `pay_${event.id}`,
        razorpayOrderId: payment?.order_id,
        receiptNumber: `SANCTRA-RNW-${nowMs.toString(36).toUpperCase()}`,
      };

      await store.saveInvoice(uid, invoice);
      break;
    }

    case 'subscription.halted':
    case 'payment.failed': {
      if (currentSub) {
        const pastDueSub: UserSubscription = {
          ...currentSub,
          status: 'past_due',
          updatedAt: nowMs,
        };
        await store.setSubscription(uid, pastDueSub);
      }
      break;
    }

    case 'subscription.cancelled': {
      if (currentSub) {
        // Retain Plus until period ends, mark cancelAtPeriodEnd true
        const cancelledSub: UserSubscription = {
          ...currentSub,
          status: 'cancelled',
          cancelAtPeriodEnd: true,
          cancelledAt: nowMs,
          updatedAt: nowMs,
        };
        await store.setSubscription(uid, cancelledSub);
      }
      break;
    }

    case 'refund.processed': {
      if (currentSub && refund) {
        // Full refund revokes entitlement immediately
        const plan = getPlanForTier(currentSub.tier);
        const isFullRefund = refund.amount >= plan.amountInPaise;

        if (isFullRefund) {
          const expiredSub: UserSubscription = {
            ...currentSub,
            status: 'expired',
            isPlus: false,
            updatedAt: nowMs,
          };
          await store.setSubscription(uid, expiredSub);
        }

        // Update matching invoice to refunded status
        const invoices = await store.getInvoices(uid);
        const matchingInvoice = invoices.find(
          (inv) => inv.razorpayPaymentId === refund.payment_id
        );
        if (matchingInvoice) {
          await store.saveInvoice(uid, {
            ...matchingInvoice,
            status: 'refunded',
          });
        }
      }
      break;
    }

    default:
      await store.recordWebhookEvent(event.id, { event: event.event, processedAt: nowMs });
      return { status: 'unhandled', details: `Event ${event.event} not handled` };
  }

  await store.recordWebhookEvent(event.id, { event: event.event, processedAt: nowMs });
  return { status: 'processed' };
}

/**
 * Periodically or on-read evaluation to see if a subscription has expired.
 */
export function evaluateSubscriptionExpiry(
  sub: UserSubscription | null,
  nowMs: number = Date.now()
): UserSubscription | null {
  if (!sub) return null;
  if (sub.currentPeriodEnd <= nowMs && sub.status !== 'expired') {
    return {
      ...sub,
      status: 'expired',
      isPlus: false,
      updatedAt: nowMs,
    };
  }
  return sub;
}
