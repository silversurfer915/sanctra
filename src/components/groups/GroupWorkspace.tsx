import {useEffect,useState,type ReactNode} from 'react';

/** One conversation stays mounted while the companion panel changes. */
export function GroupWorkspace({memberCount,chat,members,ranking,rankingActions}:{memberCount:number;chat:(active:boolean)=>ReactNode;members:ReactNode;ranking:ReactNode;rankingActions?:ReactNode}){
 const [wide,setWide]=useState(()=>window.matchMedia('(min-width:1100px)').matches);
 const [tab,setTab]=useState<'chat'|'members'|'ranking'>('chat');
 useEffect(()=>{const query=window.matchMedia('(min-width:1100px)');const change=()=>setWide(query.matches);query.addEventListener('change',change);return()=>query.removeEventListener('change',change);},[]);
 const selected=wide&&tab==='chat'?'ranking':tab;
 const tabs:readonly ('chat'|'members'|'ranking')[]=wide?(['ranking','members'] as const):(['chat','ranking','members'] as const);
 return <div className={`group-room-workspace ${wide?'is-split':''}`}>
  <div className="group-companion-toolbar"><div className="group-room-tabs" role="tablist" aria-label={wide?'Alongside chat':'Group sections'} onKeyDown={e=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();
   const current=tabs.indexOf(selected),next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(current+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
   setTab(tabs[next]);requestAnimationFrame(()=>document.getElementById(`group-${tabs[next]}-tab`)?.focus());
  }}>
   {tabs.map(value=><button key={value} type="button" className="analytics-button" role="tab" id={`group-${value}-tab`} tabIndex={selected===value?0:-1} aria-controls={`group-${value}-panel`} aria-selected={selected===value} onClick={()=>setTab(value)}>{value==='chat'?'Chat':value==='ranking'?'Ranking':`Members (${memberCount})`}</button>)}
  </div>{selected==='ranking'&&rankingActions&&<div className="group-ranking-periods" role="group" aria-label="Ranking period">{rankingActions}</div>}</div>
  <div className="group-workspace group-workspace-tabbed">
   <div id="group-ranking-panel" className="group-companion-panel" role="tabpanel" aria-labelledby="group-ranking-tab" hidden={selected!=='ranking'}>{ranking}</div>
   <div id="group-members-panel" className="group-companion-panel" role="tabpanel" aria-labelledby="group-members-tab" hidden={selected!=='members'}>{members}</div>
   <div id="group-chat-panel" role={wide?'region':'tabpanel'} aria-label={wide?'Group chat':undefined} aria-labelledby={wide?undefined:'group-chat-tab'} hidden={!wide&&selected!=='chat'}>{chat(wide||selected==='chat')}</div>
  </div>
 </div>;
}
