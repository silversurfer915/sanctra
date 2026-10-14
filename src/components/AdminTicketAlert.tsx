import{useEffect,useState}from'react';import{Bell,X}from'lucide-react';import{subscribeAdmin,subscribeTickets,type Ticket}from'../utils/adminService.ts';import type{AuthUser}from'../types/index.ts';
export function AdminTicketAlert({user,onOpen}:{user:AuthUser;onOpen:()=>void}){
 const[admin,setAdmin]=useState(false),[tickets,setTickets]=useState<Ticket[]>([]),[dismissed,setDismissed]=useState(''),[error,setError]=useState('');
 useEffect(()=>{setTickets([]);setDismissed('');return subscribeAdmin(user.uid,setAdmin);},[user.uid]);
 useEffect(()=>{if(!admin)return;return subscribeTickets(user.uid,true,setTickets,setError);},[admin,user.uid]);
 const open=tickets.filter(t=>t.status==='open'),fingerprint=open.map(t=>t.id).sort().join(',');
 if(!admin||(!open.length&&!error))return null;
 const navigate=()=>{sessionStorage.setItem('sanctra-admin-open-support','true');setDismissed(fingerprint);onOpen();window.dispatchEvent(new Event('sanctra-open-support-queue'));};
 return <div className="admin-ticket-alert" aria-live="polite"><button type="button" className="admin-ticket-bell" aria-label={`${open.length} open support tickets`} onClick={navigate}><Bell size={18}/><span>{open.length}</span></button>{fingerprint&&dismissed!==fingerprint&&<div className="admin-ticket-toast"><div><strong>{open.length} open {open.length===1?'ticket':'tickets'}</strong><p>{open[0]?.title}</p><button type="button" onClick={navigate}>View support queue</button></div><button type="button" aria-label="Dismiss ticket notification" onClick={()=>setDismissed(fingerprint)}><X size={16}/></button></div>}{error&&<small role="alert">Ticket notifications couldn’t connect.</small>}</div>;
}
