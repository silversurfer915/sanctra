import {announcementVisible} from '../../utils/announcementDelivery.ts';
import { useEffect, useState } from 'react';
import { Inbox, AtSign, Megaphone, VolumeX, ArrowLeft, ArrowRight, CheckCheck, MessageSquare, Search } from 'lucide-react';
import { RichAnnouncement } from '../RichAnnouncement.tsx';
import type { AuthUser } from '../../types/index.ts';
import type { GroupChatMessage } from '../../types/groups.ts';
import { getStudyGroupById, subscribeGroupMentions, subscribeGroupMessages } from '../../utils/groupsService.ts';
import { loadCommunity, saveCommunity, type CommunityPreferences } from '../../utils/community.ts';
import { subscribeAnnouncements, type Announcement } from '../../utils/inboxService.ts';
import { mentionsUser, mentionNoticeId } from '../../utils/inboxUnread.ts';
import { doc, onSnapshot } from 'firebase/firestore';
import { getCloudDatabase } from '../../utils/firebase.ts';
import { normalizeCommunity } from '../../utils/communityState.ts';
import { announcementPreview } from '../../utils/presentation.ts';

import { subscribeTickets, type Ticket } from '../../utils/adminService.ts';
import { SupportTickets } from '../SupportTickets.tsx';
import { supportInboxNotice } from '../../utils/supportInbox.ts';

interface Notice {id:string;type:'announcement'|'mention'|'support'|'jee';title:string;text:string;timestamp:number;jeeSection?:'tests'|'backlog';ticketId?:string;groupId?:string;category?:string;pinned?:boolean;coverUrl?:string;}

export function InboxView({user,onOpenGroup,plus=false,jeeReminders=[],onOpenJee}:{jeeReminders?:{id:string;section:'tests'|'backlog';title:string;text:string;timestamp:number}[];onOpenJee?:(section:'tests'|'backlog')=>void;user:AuthUser;plus?:boolean;onOpenGroup:(id:string)=>void}) {
 const [tab,setTab]=useState<'all'|'mention'|'announcement'|'support'>('all'),[community,setCommunity]=useState<CommunityPreferences|null>(null);
 const [announcements,setAnnouncements]=useState<Announcement[]>([]),[mentions,setMentions]=useState<Record<string,Notice[]>>({});
 const [tickets,setTickets]=useState<Ticket[]>([]);
 const [search,setSearch]=useState('');
 const [error,setError]=useState(''),[selected,setSelected]=useState<Notice|null>(null);
 useEffect(()=>{if(!getCloudDatabase())return;return subscribeTickets(user.uid,false,setTickets,setError);},[user.uid]);
 useEffect(()=>{let cancelled=false;loadCommunity(user.uid).then(value=>{if(!cancelled)setCommunity(value);}).catch(()=>setError('Your inbox preferences could not be loaded. Refresh to retry.'));const off=subscribeAnnouncements(setAnnouncements,setError);return()=>{cancelled=true;off();};},[user.uid]);
 useEffect(()=>{
  const db=getCloudDatabase();if(!db)return;
  return onSnapshot(doc(db,'users',user.uid,'community','preferences'),snapshot=>{
   if(snapshot.exists())setCommunity(normalizeCommunity(snapshot.data()));
  },()=>setError('Inbox preferences could not be refreshed.'));
 },[user.uid]);
 useEffect(()=>{if(!community)return;let cancelled=false;const off: (()=>void)[]=[];
  setMentions({});
  for(const id of community.joinedIds){getStudyGroupById(id).then(room=>{
   if(cancelled||!room)return;
   let indexed:GroupChatMessage[]=[],recent:GroupChatMessage[]=[];
   const publish=()=>{if(cancelled)return;const messages=[...new Map([...recent,...indexed].map(m=>[m.id,m])).values()];setMentions(prev=>({...prev,[id]:messages.filter(m=>mentionsUser(m,user)).map(m=>({id:mentionNoticeId(id,m.id),type:'mention',title:`${m.senderName} mentioned you in ${room.name}`,text:m.text,timestamp:m.timestamp,groupId:id}))}));};
   off.push(subscribeGroupMentions(id,user.uid,messages=>{indexed=messages;publish();},()=>setError('Group mentions could not be loaded. Check your connection.')));
   off.push(subscribeGroupMessages(id,messages=>{recent=messages;publish();}));
  }).catch(()=>{if(!cancelled)setError('Some group mentions could not be loaded.');});}
  return()=>{cancelled=true;off.forEach(fn=>fn());};
 },[community?.joinedIds.join(','),user.uid,user.displayName]);
 const [deliveryNow,setDeliveryNow]=useState(Date.now());useEffect(()=>{const tick=setInterval(()=>setDeliveryNow(Date.now()),15000);return()=>clearInterval(tick);},[]);
 const notices:Notice[]=[...jeeReminders.map(r=>({...r,type:'jee' as const,pinned:false,jeeSection:r.section})),...tickets.map(supportInboxNotice),...announcements.filter(a=>announcementVisible(a,plus,deliveryNow)).map(a=>({...a,type:'announcement' as const,id:`announcement-${a.id}`})),...Object.values(mentions).flat().filter(n=>!community?.mutedIds.includes(n.groupId!))].sort((a,b)=>Number(!!b.pinned)-Number(!!a.pinned)||b.timestamp-a.timestamp);
 const filtered=notices.filter(n=>(tab==='all'||n.type===tab)&&`${n.title} ${n.text}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
 const updatePreferences=async(update:(value:CommunityPreferences)=>CommunityPreferences)=>{try{const value=await loadCommunity(user.uid);const next=update(value);await saveCommunity(user.uid,next);setCommunity(next);}catch{setError('Could not save inbox preferences. Please retry.');}};
 const open=(notice:Notice)=>{if(notice.type==='jee'){void updatePreferences(v=>({...v,readIds:[...new Set([...v.readIds,notice.id])].slice(-100)}));onOpenJee?.(notice.jeeSection!);return;}setSelected(notice);void updatePreferences(value=>({...value,readIds:[...new Set([...value.readIds,notice.id])].slice(-100)}));};
 return <section className="inbox-view w-full max-w-5xl space-y-6 text-slate-100">
  <header className="flex flex-wrap gap-4 items-center justify-between"><div><h1 className="font-display text-3xl">Your inbox</h1><p className="text-sm text-slate-300 mt-2">A quiet home for updates and conversations that include you.</p></div></header>
  {error&&<p role="alert" className="text-rose-300 text-sm">{error}</p>}
  <label className="conversation-search inbox-search"><Search size={16}/><input aria-label="Search inbox" placeholder="Search your inbox…" value={search} onChange={e=>setSearch(e.target.value)}/></label>
  <div className="inbox-summary grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">{([{id:'all',label:'All',Icon:Inbox},{id:'mention',label:'Mentions',Icon:AtSign},{id:'announcement',label:'News',Icon:Megaphone},{id:'support',label:'Support',Icon:MessageSquare}] as const).map(({id,label,Icon})=><button key={id} aria-pressed={tab===id} onClick={()=>{setTab(id);setSelected(null);}} className={`analytics-card p-3 sm:p-5 text-left flex flex-wrap gap-2 items-center ${tab===id?'ring-1 ring-emerald-200/50':''}`}><Icon size={20} className="text-emerald-200"/><span className="text-xs sm:text-sm flex-1">{label}</span><span className="text-lg">{notices.filter(n=>id==='all'||n.type===id).length}</span></button>)}</div>
  {selected?.type==='support' ? <div className="space-y-4"><button className="analytics-button" onClick={()=>setSelected(null)}><ArrowLeft size={16}/>Back to inbox</button><SupportTickets key={selected.ticketId} user={user} admin={false} allowCreate={false} inbox initialTicketId={selected.ticketId}/></div> : selected ? <article className="analytics-card p-5 sm:p-7 space-y-5"><button className="analytics-button" onClick={()=>setSelected(null)}><ArrowLeft size={16}/>Back to inbox</button><p className="text-xs text-slate-400">{new Date(selected.timestamp).toLocaleString()}</p>{selected.type==='mention'&&<h2 className="text-xl font-semibold">{selected.title}</h2>}{selected.type==='announcement'?<RichAnnouncement item={selected}/>:<p className="text-slate-200 whitespace-pre-wrap break-words leading-relaxed">{selected.text}</p>}{selected.groupId&&<button className="analytics-button" onClick={()=>onOpenGroup(selected.groupId!)}>Open group chat<ArrowRight size={16}/></button>}</article> : <div className="space-y-3">
   <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">{tab==='all'?'All messages':tab==='mention'?'Group mentions':tab==='support'?'Support tickets':'Announcements'}</h2><button className="analytics-button" disabled={!community||!filtered.length} onClick={()=>void updatePreferences(v=>({...v,readIds:[...new Set([...v.readIds,...filtered.map(n=>n.id)])].slice(-100)}))}><CheckCheck size={16}/>Mark read</button></div>
   {filtered.length ? filtered.map(notice=><button key={notice.id} onClick={()=>open(notice)} className="analytics-card inbox-notice-card w-full p-5 text-left flex gap-4 hover:border-emerald-200/30"><span className="p-3 rounded-xl bg-emerald-200/10 h-fit text-emerald-200">{notice.type==='mention'?<AtSign size={20}/>:notice.type==='support'?<MessageSquare size={20}/>:<Megaphone size={20}/>}</span><span className="flex-1 min-w-0"><span className="flex justify-between gap-3 items-center"><span className="text-xs text-slate-400">{notice.type==='mention'?'Group mention':notice.type==='support'?'Support ticket':notice.type==='jee'?'JEE reminder':'Sanctra announcement'}</span>{!community?.readIds.includes(notice.id)&&<span className="text-xs text-emerald-200">Unread</span>}</span><span className="block font-semibold mt-2">{notice.title}</span><span className="inbox-message-preview block text-sm text-slate-300 break-words mt-2">{notice.type==='announcement'?announcementPreview(notice.text):notice.text}</span></span></button>) : <div className="analytics-card p-12 text-center"><Inbox size={30} className="mx-auto text-slate-400 mb-4"/><h3 className="text-lg">{search.trim()?'No matching messages':'All caught up'}</h3><p className="text-sm text-slate-300 mt-2">{search.trim()?'Try another name or phrase.':'Updates, support replies and group mentions will appear here.'}</p></div>}
  </div>}
  {!!community?.joinedIds.length&&<details className="analytics-card p-5"><summary className="cursor-pointer flex items-center gap-2 text-sm"><VolumeX size={17}/>Muted groups ({community.mutedIds.length})</summary><div className="mt-4 space-y-2">{community.joinedIds.map(id=><MutedGroup key={id} id={id} muted={community.mutedIds.includes(id)} onToggle={()=>void updatePreferences(v=>({...v,mutedIds:v.mutedIds.includes(id)?v.mutedIds.filter(g=>g!==id):[...v.mutedIds,id]}))}/>)}</div></details>}
 </section>;
}

function MutedGroup({id,muted,onToggle}:{id:string;muted:boolean;onToggle:()=>void}){const [name,setName]=useState(id);useEffect(()=>{let live=true;getStudyGroupById(id).then(r=>{if(live&&r)setName(r.name);}).catch(()=>{});return()=>{live=false;};},[id]);return <div className="flex items-center justify-between gap-4 p-3 bg-white/5 rounded-xl text-sm"><span>{name}</span><button className="analytics-button" onClick={onToggle}>{muted?'Unmute':'Mute'}</button></div>;}
