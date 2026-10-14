import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  PLUS_PRICING_PLANS,
  isEarlyOfferValid,
  getPlanForTier,
  verifyPaymentSignature,
  verifyWebhookSignature,
  processRazorpayWebhookEvent,
  evaluateSubscriptionExpiry,
  isEntitlementActive,
  type SubscriptionStore,
  type PaymentWebhookEvent,
} from '../src/utils/serverPaymentService.ts';
import type { UserSubscription, SubscriptionInvoice } from '../src/types/subscription.ts';

class MockSubscriptionStore implements SubscriptionStore {
  processedEvents = new Set<string>();
  subscriptions = new Map<string, UserSubscription>();
  invoices = new Map<string, SubscriptionInvoice[]>();

  async hasProcessedWebhook(eventId: string): Promise<boolean> {
    return this.processedEvents.has(eventId);
  }

  async recordWebhookEvent(eventId: string): Promise<void> {
    this.processedEvents.add(eventId);
  }

  async getSubscription(uid: string): Promise<UserSubscription | null> {
    return this.subscriptions.get(uid) || null;
  }

  async setSubscription(uid: string, subscription: UserSubscription): Promise<void> {
    this.subscriptions.set(uid, subscription);
  }

  async saveInvoice(uid: string, invoice: SubscriptionInvoice): Promise<void> {
    const list = this.invoices.get(uid) || [];
    const index = list.findIndex((i) => i.id === invoice.id);
    if (index >= 0) {
      list[index] = invoice;
    } else {
      list.push(invoice);
    }
    this.invoices.set(uid, list);
  }

  async getInvoices(uid: string): Promise<SubscriptionInvoice[]> {
    return this.invoices.get(uid) || [];
  }
}

test('Sanctra Plus plans have exact required prices and renewal terms', () => {
  assert.equal(PLUS_PRICING_PLANS.monthly.priceInINR, 59);
  assert.equal(PLUS_PRICING_PLANS.monthly.amountInPaise, 5900);
  assert.equal(PLUS_PRICING_PLANS.monthly.renewalPriceInINR, 59);

  assert.equal(PLUS_PRICING_PLANS.yearly.priceInINR, 159);
  assert.equal(PLUS_PRICING_PLANS.yearly.amountInPaise, 15900);
  assert.equal(PLUS_PRICING_PLANS.yearly.renewalPriceInINR, 159);

  assert.equal(PLUS_PRICING_PLANS.early_yearly.priceInINR, 99);
  assert.equal(PLUS_PRICING_PLANS.early_yearly.amountInPaise, 9900);
  // Requirement: define whether ₹99 renews at ₹99 or changes to ₹159
  assert.equal(PLUS_PRICING_PLANS.early_yearly.renewalPriceInINR, 159);
  assert.equal(PLUS_PRICING_PLANS.early_yearly.isEarlyOffer, true);
});

test('early offer is valid until December 31, 2026 and gracefully falls back to yearly afterward', () => {
  const duringOffer = new Date('2026-10-15T12:00:00Z');
  assert.equal(isEarlyOfferValid(duringOffer), true);
  assert.equal(getPlanForTier('early_yearly', duringOffer).priceInINR, 99);

  const afterOffer = new Date('2027-01-01T00:00:01Z');
  assert.equal(isEarlyOfferValid(afterOffer), false);
  // After offer expires, tier requests automatically receive standard yearly pricing
  assert.equal(getPlanForTier('early_yearly', afterOffer).priceInINR, 159);
});

test('Razorpay payment signature verification succeeds for authentic signatures and rejects tampering', () => {
  const secret = 'rzp_test_secret_12345';
  const orderId = 'order_9A33X5';
  const paymentId = 'pay_001B98';

  const validSignature = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  assert.equal(
    verifyPaymentSignature({ orderId, paymentId, signature: validSignature }, secret),
    true
  );

  // Tampered paymentId
  assert.equal(
    verifyPaymentSignature({ orderId, paymentId: 'pay_tampered', signature: validSignature }, secret),
    false
  );

  // Tampered secret
  assert.equal(
    verifyPaymentSignature({ orderId, paymentId, signature: validSignature }, 'wrong_secret'),
    false
  );
});

test('Razorpay webhook signature verification protects against forged callbacks', () => {
  const webhookSecret = 'whsec_sanctra_super_secret';
  const body = JSON.stringify({ event: 'payment.captured', id: 'evt_1001' });

  const validSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex');

  assert.equal(verifyWebhookSignature(body, validSignature, webhookSecret), true);
  assert.equal(verifyWebhookSignature(body, 'bad_signature', webhookSecret), false);
  assert.equal(verifyWebhookSignature(body + ' ', validSignature, webhookSecret), false);
});

test('webhook processor activates subscription on payment.captured and writes invoice', async () => {
  const store = new MockSubscriptionStore();
  const now = 1790900000000;

  const event: PaymentWebhookEvent = {
    id: 'evt_captured_1',
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_abc123',
          order_id: 'order_123',
          amount: 5900,
          currency: 'INR',
          status: 'captured',
          notes: { uid: 'user_alice', tier: 'monthly' },
        },
      },
    },
  };

  const result = await processRazorpayWebhookEvent(event, store, now);
  assert.equal(result.status, 'processed');

  const sub = await store.getSubscription('user_alice');
  assert.notEqual(sub, null);
  assert.equal(sub?.isPlus, true);
  assert.equal(sub?.tier, 'monthly');
  assert.equal(sub?.status, 'active');
  assert.equal(sub?.currentPeriodStart, now);
  assert.equal(sub?.currentPeriodEnd, now + 30 * 24 * 60 * 60 * 1000);

  const invoices = await store.getInvoices('user_alice');
  assert.equal(invoices.length, 1);
  assert.equal(invoices[0].amount, 59);
  assert.equal(invoices[0].status, 'paid');
  assert.equal(invoices[0].razorpayPaymentId, 'pay_abc123');
});

test('webhook processor is strictly idempotent on duplicate event delivery', async () => {
  const store = new MockSubscriptionStore();
  const now = 1790900000000;

  const event: PaymentWebhookEvent = {
    id: 'evt_duplicate_test',
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_xyz999',
          amount: 9900,
          currency: 'INR',
          status: 'captured',
          notes: { uid: 'user_bob', tier: 'early_yearly' },
        },
      },
    },
  };

  const first = await processRazorpayWebhookEvent(event, store, now);
  assert.equal(first.status, 'processed');

  // Second call with same event.id
  const second = await processRazorpayWebhookEvent(event, store, now + 5000);
  assert.equal(second.status, 'skipped_duplicate');

  // Ensure no duplicate invoice was generated
  const invoices = await store.getInvoices('user_bob');
  assert.equal(invoices.length, 1);
});

test('subscription renewal advances period end and applies standard price for early offer renewal', async () => {
  const store = new MockSubscriptionStore();
  const t0 = 1790900000000;

  // Initial purchase: early_yearly (₹99)
  const initialEvent: PaymentWebhookEvent = {
    id: 'evt_early_purchase',
    event: 'subscription.activated',
    payload: {
      subscription: {
        entity: {
          id: 'sub_rzp_1',
          customer_id: 'cust_1',
          status: 'active',
          notes: { uid: 'user_carol', tier: 'early_yearly' },
        },
      },
    },
  };
  await processRazorpayWebhookEvent(initialEvent, store, t0);

  const subYear1 = await store.getSubscription('user_carol');
  assert.equal(subYear1?.tier, 'early_yearly');
  const year1End = subYear1?.currentPeriodEnd!;

  // Renewal 1 year later (subscription.charged)
  const renewEvent: PaymentWebhookEvent = {
    id: 'evt_renewal_year2',
    event: 'subscription.charged',
    payload: {
      payment: {
        entity: {
          id: 'pay_renewal_2',
          amount: 15900,
          currency: 'INR',
          status: 'captured',
          notes: { uid: 'user_carol', tier: 'early_yearly' },
        },
      },
    },
  };
  await processRazorpayWebhookEvent(renewEvent, store, year1End);

  const subYear2 = await store.getSubscription('user_carol');
  assert.equal(subYear2?.tier, 'yearly'); // Upgraded to standard yearly tier
  assert.equal(subYear2?.currentPeriodEnd, year1End + 365 * 24 * 60 * 60 * 1000);

  const invoices = await store.getInvoices('user_carol');
  assert.equal(invoices.length, 2);
  assert.equal(invoices[0].amount, 99); // Year 1 intro price
  assert.equal(invoices[1].amount, 159); // Year 2 standard renewal price
});

test('cancellation retains Plus access until period end without immediate revocation', async () => {
  const store = new MockSubscriptionStore();
  const t0 = 1790900000000;

  await processRazorpayWebhookEvent(
    {
      id: 'evt_init',
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'p1', amount: 5900, currency: 'INR', status: 'captured', notes: { uid: 'user_dave', tier: 'monthly' } } } },
    },
    store,
    t0
  );

  // Cancel subscription midway
  const cancelEvent: PaymentWebhookEvent = {
    id: 'evt_cancel',
    event: 'subscription.cancelled',
    payload: {
      subscription: {
        entity: {
          id: 'sub_dave',
          status: 'cancelled',
          notes: { uid: 'user_dave' },
        },
      },
    },
  };
  await processRazorpayWebhookEvent(cancelEvent, store, t0 + 100000);

  const sub = await store.getSubscription('user_dave');
  assert.equal(sub?.status, 'cancelled');
  assert.equal(sub?.cancelAtPeriodEnd, true);
  assert.equal(sub?.isPlus, true); // Still active for remainder of month!
  assert.equal(isEntitlementActive(sub, t0 + 200000), true);

  // After period ends, evaluateSubscriptionExpiry marks expired
  const expired = evaluateSubscriptionExpiry(sub, sub!.currentPeriodEnd + 1000);
  assert.equal(expired?.status, 'expired');
  assert.equal(expired?.isPlus, false);
});

test('full refund revokes entitlement and updates invoice status', async () => {
  const store = new MockSubscriptionStore();
  const t0 = 1790900000000;

  await processRazorpayWebhookEvent(
    {
      id: 'evt_init_ref',
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_ref_target', amount: 5900, currency: 'INR', status: 'captured', notes: { uid: 'user_eve', tier: 'monthly' } } } },
    },
    store,
    t0
  );

  // Refund processed
  const refundEvent: PaymentWebhookEvent = {
    id: 'evt_refund',
    event: 'refund.processed',
    payload: {
      refund: {
        entity: {
          id: 'rfnd_1',
          payment_id: 'pay_ref_target',
          amount: 5900,
          currency: 'INR',
          status: 'processed',
          notes: { uid: 'user_eve' },
        },
      },
    },
  };
  await processRazorpayWebhookEvent(refundEvent, store, t0 + 50000);

  const sub = await store.getSubscription('user_eve');
  assert.equal(sub?.status, 'expired');
  assert.equal(sub?.isPlus, false);

  const invoices = await store.getInvoices('user_eve');
  assert.equal(invoices[0].status, 'refunded');
});
