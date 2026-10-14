import {
  doc,
  collection,
  onSnapshot,
  query,
  orderBy,
  type Unsubscribe,
} from 'firebase/firestore';
import { getCloudDatabase } from './firebase.ts';
import type {
  UserSubscription,
  SubscriptionInvoice,
  SubscriptionTier,
  PlusPricingPlan,
} from '../types/subscription.ts';
import {
  PLUS_PRICING_PLANS,
  getPlanForTier,
  isEarlyOfferValid,
  isEntitlementActive,
} from './subscriptionPlans.ts';

export type {
  UserSubscription,
  SubscriptionInvoice,
  SubscriptionTier,
  PlusPricingPlan,
};
export {
  PLUS_PRICING_PLANS,
  getPlanForTier,
  isEarlyOfferValid,
  isEntitlementActive,
};

/**
 * Watch real-time subscription record for a user in Firestore.
 * Document: /subscriptions/{uid} (read-only for clients)
 */
export function watchSubscription(
  uid: string,
  onUpdate: (sub: UserSubscription | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const db = getCloudDatabase();
  if (!db || !uid || uid.startsWith('guest-')) {
    onUpdate(null);
    return () => {};
  }

  let stored:UserSubscription|null=null,adminAccess=false,subReady=false,adminReady=false,expiryTimer:ReturnType<typeof setTimeout>|undefined;
  const emit=()=>{if(expiryTimer)clearTimeout(expiryTimer);
   if(!subReady||!adminReady)return;
   const data=adminAccess?{uid,tier:'yearly' as const,status:'active' as const,isPlus:true,currentPeriodStart:0,currentPeriodEnd:4102444800000,cancelAtPeriodEnd:true,createdAt:0,updatedAt:Date.now(),adminAccess:true}:stored;
   if(!data){onUpdate(null);return;}const active=isEntitlementActive(data);onUpdate({...data,isPlus:active});
   if(active&&!adminAccess)expiryTimer=setTimeout(emit,Math.min(data.currentPeriodEnd-Date.now()+10,2147483647));
  };
  const offSub=onSnapshot(doc(db,'subscriptions',uid),snapshot=>{subReady=true;stored=snapshot.exists()?snapshot.data() as UserSubscription:null;emit();},err=>{subReady=true;stored=null;emit();onError?.(err);});
  const offAdmin=onSnapshot(doc(db,'admins',uid),snapshot=>{adminReady=true;adminAccess=snapshot.exists();emit();},()=>{adminReady=true;adminAccess=false;emit();});
  return()=>{offSub();offAdmin();if(expiryTimer)clearTimeout(expiryTimer);};
}


/**
 * Watch real-time billing invoice records for a user.
 * Collection: /subscriptions/{uid}/invoices
 */
export function watchInvoices(
  uid: string,
  onUpdate: (invoices: SubscriptionInvoice[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const db = getCloudDatabase();
  if (!db || !uid || uid.startsWith('guest-')) {
    onUpdate([]);
    return () => {};
  }

  const invoicesCol = collection(db, 'subscriptions', uid, 'invoices');
  const invoicesQuery = query(invoicesCol, orderBy('paidAt', 'desc'));

  return onSnapshot(
    invoicesQuery,
    (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        ...d.data(),
        id: d.id,
      })) as SubscriptionInvoice[];
      onUpdate(list);
    },
    (err) => {
      console.warn('Invoices watch note:', err.message);
      if (onError) onError(err);
      onUpdate([]);
    }
  );
}

/**
 * Helper to format epoch timestamp into clean local date
 */
export function formatBillingDate(timestampMs: number): string {
  if (!timestampMs) return '—';
  return new Date(timestampMs).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Helper to calculate days remaining in active billing period
 */
export function getDaysRemainingInPeriod(sub: UserSubscription | null): number {
  if (!sub || !sub.currentPeriodEnd) return 0;
  const diff = sub.currentPeriodEnd - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}
