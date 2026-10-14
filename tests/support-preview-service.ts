// Isolated in-memory preview. No Firebase connection or production writes.
import {Timestamp} from 'firebase/firestore';
export interface Ticket {id:string;ownerUid:string;ownerName:string;title:string;category:string;status:'open'|'in_progress'|'resolved';createdAt:Timestamp;updatedAt:Timestamp;isPriority?:boolean;}
export interface TicketMessage {id:string;senderUid:string;senderName:string;text:string;createdAt:Timestamp;}
let tickets:Ticket[]=[];let messages:Record<string,TicketMessage[]>={};const listeners=new Set<()=>void>();const publish=()=>listeners.forEach(fn=>fn());
export function subscribeTickets(uid:string,admin:boolean,callback:(tickets:Ticket[])=>void){const fn=()=>callback(tickets.filter(t=>admin||t.ownerUid===uid).slice());listeners.add(fn);fn();return()=>{listeners.delete(fn);};}
export function subscribeTicketMessages(id:string,callback:(messages:TicketMessage[])=>void){const fn=()=>callback((messages[id]||[]).slice());listeners.add(fn);fn();return()=>{listeners.delete(fn);};}
export async function createTicket(user:{uid:string;displayName:string},title:string,category:string,text:string){const id=crypto.randomUUID();tickets.push({id,ownerUid:user.uid,ownerName:user.displayName,title,category,status:'open',createdAt:Timestamp.now(),updatedAt:Timestamp.now()});messages[id]=[{id:'initial',senderUid:user.uid,senderName:user.displayName,text,createdAt:Timestamp.now()}];publish();return id;}
export async function replyTicket(id:string,user:{uid:string;displayName:string},text:string){messages[id].push({id:crypto.randomUUID(),senderUid:user.uid,senderName:user.displayName,text,createdAt:Timestamp.now()});tickets.find(t=>t.id===id)!.updatedAt=Timestamp.now();publish();}
export async function setTicketStatus(id:string,status:Ticket['status']){tickets.find(t=>t.id===id)!.status=status;publish();}
export function subscribeSubscriptions(callback:(value:object)=>void){callback({});return()=>{};}
export async function grantUserSubscription(){}export async function revokeUserSubscription(){}
