import type { SubscriptionTier, UserSubscription } from '../types/subscription.ts';

const DAY = 86_400_000;
/** Manual renewal extends paid time; revoked or expired memberships start today. */
export function buildManualMembership(uid: string, tier: SubscriptionTier, existing: UserSubscription | null, now = Date.now()): UserSubscription {
  if (!uid || uid.startsWith('guest-')) throw new Error('Choose a connected member account.');
  if (!['monthly', 'yearly', 'early_yearly'].includes(tier)) throw new Error('Choose a supported membership plan.');
  const active = !!existing?.isPlus && ['active', 'cancelled'].includes(existing.status) && existing.currentPeriodEnd > now;
  const start = active ? existing!.currentPeriodEnd : now;
  return { uid, tier, status: 'active', isPlus: true, isTrial:false,
    currentPeriodStart: active ? existing!.currentPeriodStart : now,
    currentPeriodEnd: start + (tier === 'monthly' ? 30 : 365) * DAY,
    cancelAtPeriodEnd: true, createdAt: existing?.createdAt || now, updatedAt: now, activationMethod: 'manual' };
}
export function buildTrialMembership(uid:string,value:number,unit:'minutes'|'hours'|'days',existing:UserSubscription|null,now=Date.now()):UserSubscription {
 const duration=value*({minutes:60000,hours:3600000,days:86400000}[unit]);
 if(!uid||!Number.isFinite(duration)||duration<60000||duration>365*86400000)throw new Error('Choose a duration from 1 minute to 365 days.');
 if(existing?.isPlus&&existing.currentPeriodEnd>now&&['active','cancelled'].includes(existing.status)&&!existing.isTrial)throw new Error('This account has paid time remaining. Renew its plan instead of replacing it with a trial.');
 return {uid,tier:'monthly',status:'active',isPlus:true,isTrial:true,currentPeriodStart:now,currentPeriodEnd:now+duration,cancelAtPeriodEnd:true,createdAt:existing?.createdAt||now,updatedAt:now,activationMethod:'manual'};
}
