import { useEffect,useState } from 'react';
import { doc,onSnapshot } from 'firebase/firestore';
import { getCloudDatabase } from '../utils/firebase.ts';
import { chatDay,FREE_DAILY_MESSAGES,PLUS_DAILY_MESSAGES } from '../utils/chatAllowance.ts';
import type { UserSubscription } from '../types/subscription.ts';
import { isEntitlementActive } from '../utils/subscriptionPlans.ts';
export function ChatAllowance({uid,subscription}:{uid:string;subscription?:UserSubscription|null}) {
 const [day,setDay]=useState(chatDay()),[count,setCount]=useState<number|null>(null);
 useEffect(()=>{const timer=setInterval(()=>setDay(chatDay()),60000);return()=>clearInterval(timer);},[]);
 useEffect(()=>{setCount(null);const db=getCloudDatabase();if(!db)return;return onSnapshot(doc(db,'users',uid,'chat_days',String(day)),s=>{const value=s.data()?.count;setCount(typeof value==='number'&&Number.isFinite(value)&&value>=0?Math.floor(value):0);},()=>setCount(null));},[uid,day]);
 const limit=isEntitlementActive(subscription || null)?PLUS_DAILY_MESSAGES:FREE_DAILY_MESSAGES;
 return <p className="workspace-footnote" aria-live="polite">{count===null?'Checking message allowance…':`${Math.max(0,limit-count)} of ${limit} messages left today`} · shared across groups · resets at midnight UTC</p>;
}
