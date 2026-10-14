import {currentPublicStreak,type StreakProjection} from './studyStreak.ts';
import type {AuthUser,UserSettings,UserSubscription} from '../types/index.ts';
import {isEntitlementActive} from './subscriptionPlans.ts';
export interface PublicStyle {plusUntil:number;cover:string;scene:string;frame:string;aura:string;trial:boolean;admin:boolean}
export function publicStyle(settings:UserSettings,subscription:UserSubscription|null):PublicStyle {
 const active=isEntitlementActive(subscription),admin=subscription?.adminAccess===true;
 return {plusUntil:active?subscription!.currentPeriodEnd:(admin?4102444800000:0),cover:(active||admin)?settings.plusProfileCoverUrl||'':'',scene:(active||admin)?settings.plusProfileScene||'none':'none',frame:(active||admin)?settings.plusProfileFrame||'none':'none',aura:(active||admin)?settings.plusAvatarEffect||'none':'none',trial:active&&subscription?.isTrial===true,admin};
}
export const publicPlusActive=(style?:PublicStyle)=>!!style&&(style.admin||style.plusUntil>Date.now());

export interface PublicIdentityProjection extends StreakProjection {uid:string;displayName:string;avatarUrl:string;publicStyle?:PublicStyle}
/** Reuse current public identity without copying totals or private account fields. */
export function withPublicIdentity<T extends PublicIdentityProjection>(member:T,profile?:PublicIdentityProjection):T {
 if(!profile||profile.uid!==member.uid)return member;
 return {...member,displayName:profile.displayName||member.displayName,avatarUrl:profile.avatarUrl,publicStyle:profile.publicStyle,streakDays:currentPublicStreak(profile),streakDate:profile.streakDate,streakUtcOffset:profile.streakUtcOffset};
}

/** Match the profile editor: custom animated identity takes precedence while entitled. */
export function publicAvatar(settings:UserSettings,user:Pick<AuthUser,'photoURL'>,subscription:UserSubscription|null):string {
 const entitled=isEntitlementActive(subscription)||subscription?.adminAccess===true;
 return (entitled&&settings.plusAnimatedAvatarUrl)||settings.avatarUrl||user.photoURL||'';
}
