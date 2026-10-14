import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import type { AuthUser } from '../../types/index.ts';
import { RichAnnouncement } from '../RichAnnouncement.tsx';
import { subscribeAnnouncements, type Announcement } from '../../utils/inboxService.ts';
import { loadCommunity, saveCommunity } from '../../utils/community.ts';
import {popupEligible,popupReadId,popupSeen} from '../../utils/announcementDelivery.ts';

export function WhatsNewModal({user,plus=false}:{user:AuthUser;plus?:boolean}) {
 const[items,setItems]=useState<Announcement[]>([]),[announcement,setAnnouncement]=useState<Announcement|null>(null),[dismissed,setDismissed]=useState<string[]>([]);
 useEffect(()=>{setAnnouncement(null);setDismissed([]);return subscribeAnnouncements(setItems,()=>{});},[user.uid]);
 const [deliveryNow,setDeliveryNow]=useState(Date.now());useEffect(()=>{const tick=setInterval(()=>setDeliveryNow(Date.now()),15000);return()=>clearInterval(tick);},[]);
 useEffect(()=>{
  let active=true;
  const newest=items.find(item=>popupEligible(item,deliveryNow,plus)&&!dismissed.includes(item.id));
  if(!newest||!popupEligible(newest,deliveryNow,plus)||dismissed.includes(newest.id)){setAnnouncement(null);return;}
  const key=popupReadId(newest);
  try{if(newest.popupMode!=='refresh'&&(localStorage.getItem(`sanctra_seen_${user.uid}_${key}`)==='true'||(!newest.popupMode||newest.popupMode==='once')&&localStorage.getItem(`sanctra_seen_announcement_${user.uid}_${newest.id}`)==='true')){setAnnouncement(null);return;}}catch{/* Account read state is checked below. */}
  void loadCommunity(user.uid).then(p=>{if(active)setAnnouncement(popupSeen(newest,p.readIds)?null:newest);}).catch(()=>{if(active)setAnnouncement(newest);});
  return()=>{active=false;};
 },[items,user.uid,dismissed,deliveryNow,plus]);
 const dismiss=async()=>{
  if(!announcement)return;
  const item=announcement,key=popupReadId(item);
  setAnnouncement(null);setDismissed(v=>[...v,item.id]);
  if(item.popupMode==='refresh')return;
  try{localStorage.setItem(`sanctra_seen_${user.uid}_${key}`,'true');}catch{/* Account state remains available. */}
  try{const p=await loadCommunity(user.uid);if(!p.readIds.includes(key))await saveCommunity(user.uid,{...p,readIds:[...p.readIds,key].slice(-100)});}catch{/* Local read state prevents repeated interruption. */}
 };
 useEffect(()=>{
  if(!announcement)return;
  const keydown=(event:KeyboardEvent)=>{if(event.key==='Escape')void dismiss();};window.addEventListener('keydown',keydown);
  const duration=announcement.autoCloseSeconds?announcement.autoCloseSeconds*1000:Infinity;
  const expiry=announcement.expiresAt?Math.max(0,announcement.expiresAt-Date.now()):Infinity;
  const delay=Math.min(duration,expiry),timer=Number.isFinite(delay)?window.setTimeout(()=>void dismiss(),Math.min(delay,2147483647)):undefined;
  return()=>{window.removeEventListener('keydown',keydown);if(timer!==undefined)clearTimeout(timer);};
 },[announcement,user.uid]);
 if(!announcement)return null;
 return <div className="whats-new-overlay" role="presentation"><section className="whats-new-modal" role="dialog" aria-modal="true" aria-labelledby="whats-new-title"><header><div><p className="workspace-eyebrow">What’s new in Sanctra</p><h1 id="whats-new-title">{announcement.title}</h1></div><button autoFocus aria-label="Close what’s new" onClick={()=>void dismiss()}><X size={20}/></button></header><div className="whats-new-scroll"><RichAnnouncement item={announcement}/></div><footer><button className="workspace-primary" onClick={()=>void dismiss()}><Check size={17}/>Got it</button></footer></section></div>;
}
