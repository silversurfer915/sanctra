import type {Ticket} from './adminService.ts';
import {supportCategories,supportStatusLabel} from './supportForms.ts';
export function supportInboxNotice(ticket:Ticket) {
 const timestamp=ticket.updatedAt?.toMillis()||0;
 return {id:`support-${ticket.id}-${timestamp}`,type:'support' as const,pinned:false,ticketId:ticket.id,title:ticket.title,text:`${supportCategories.find(c=>c.id===ticket.category)?.label||ticket.category} · ${supportStatusLabel(ticket.status)} · Open to read the conversation`,timestamp};
}
