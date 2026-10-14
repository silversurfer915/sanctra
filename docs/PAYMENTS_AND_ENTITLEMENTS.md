# Sanctra Plus — Payments, Pricing & Entitlements Specification

Superseded by [the manual membership flow](VIP_MANUAL_RELEASE.md). The gateway, automatic billing and policy assumptions below are legacy proposals, not launch terms.

Date: 2 October 2026
Status: Specification & Server-Verified Architecture

---

## 1. Pricing Structure & Plan Tiers

Sanctra Plus offers two primary commitment models and one limited promotional offer:

| Plan Tier | Display Name | Introductory Price | Renewal Price | Billing Period | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `monthly` | Monthly Sanctuary | **₹59** / month | **₹59** / month | 30 days (recurring) | Flexible monthly focus upgrade |
| `yearly` | Annual Sanctuary | **₹159** / year | **₹159** / year | 365 days (recurring) | Standard annual sanctuary pass (~₹13.25/mo) |
| `early_yearly` | Early-User Annual Offer | **₹150** / year | **₹159** / year | 365 days (recurring) | Limited introductory rate for early believers |

### Key Policy Decisions (Mandatory per Product Requirements):

1. **Early-Offer Eligibility & Expiry:**
   - **End Date:** 31 December 2026 at 23:59:59 UTC (`2026-12-31T23:59:59Z`).
   - After this date, the ₹150 offer is automatically retired, and all new annual subscriptions default to the standard ₹159/year rate.
2. **Renewal Treatment for ₹150 Early-User Offer:**
   - The ₹150 rate is an **introductory Year 1 rate**.
   - Upon completion of the first year (Day 365), the subscription automatically renews at the standard annual rate of **₹159/year**.
   - This term is clearly disclosed in the checkout interface, confirmation modal, and billing receipt prior to payment authorization.
3. **Currency & Payment Gateway:**
   - All transactions are processed in Indian Rupees (INR) using Razorpay (supporting UPI, RuPay, Visa, Mastercard, NetBanking).
   - Amounts are handled internally in smallest currency units (paise: ₹59 = 5,900 paise, ₹150 = 15,000 paise, ₹159 = 15,900 paise).

---

## 2. Security & Server-Managed Entitlement Rules

### Fundamental Invariant:
> **The client browser CANNOT grant itself Sanctra Plus.**
> Only the authenticated backend / server-side verification pipeline (using Razorpay HMAC verification) has write access to subscription records.

### Firestore Security Architecture:

```rules
match /subscriptions/{uid} {
  // Only the account owner or verified platform admin may read subscription status
  allow read: if signedIn() && (owner(uid) || admin());
  // Client write is completely FORBIDDEN (false)
  allow write: false;

  match /invoices/{invoiceId} {
    // Only the account owner or verified platform admin may view receipts
    allow read: if signedIn() && (owner(uid) || admin());
    allow write: false;
  }
}

match /payment_webhooks/{eventId} {
  // Webhook event idempotency logs are internal server-only
  allow read, write: false;
}
```

---

## 3. Entitlement State Machine & Webhook Lifecycle

### Subscription Statuses:
- `active`: Valid paid entitlement. `currentPeriodEnd > Date.now()`.
- `cancelled`: User cancelled auto-renewal. Entitlement remains active until `currentPeriodEnd`.
- `past_due`: Renewal attempt failed. 3-day grace period before downgrade.
- `expired`: Billing period elapsed with no successful renewal. Entitlement revoked.
- `none`: Free account.

### Handled Webhook Events:
1. `payment.captured` / `subscription.activated`:
   - Verify HMAC-SHA256 signature against `RAZORPAY_WEBHOOK_SECRET`.
   - Check `payment_webhooks/{eventId}` for deduplication (idempotency).
   - Set status to `active`, record `currentPeriodStart` and `currentPeriodEnd`.
   - Create record in `/subscriptions/{uid}/invoices/{invoiceId}`.
2. `subscription.charged`:
   - Advance `currentPeriodEnd` by 30 days (monthly) or 365 days (annual).
   - Record renewal invoice in subcollection.
3. `subscription.halted` / `payment.failed`:
   - Set status to `past_due`. Notify user in billing management.
4. `subscription.cancelled`:
   - Set `cancelAtPeriodEnd = true`, retain `isPlus = true` until `currentPeriodEnd`.
5. `refund.processed`:
   - If full refund, set status to `expired`, set `isPlus = false`.
   - Mark invoice as `refunded`.

---

## 4. Cancellation & Refund Policy

- **Cancellation:** Users can cancel anytime from Profile -> Manage Subscription. Cancellation stops automatic future rebilling while preserving all Plus benefits until the active period expires.
- **Refunds:** Full refund available within 7 days of purchase upon request via Sanctra Support for accidental purchases or technical service interruptions.
