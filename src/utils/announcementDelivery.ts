export type PopupMode='once'|'refresh'|'daily'|'off';
export type AnnouncementAudience='all'|'free'|'plus';
export interface PopupDelivery{id:string;category?:string;deleted?:boolean;popupMode?:PopupMode;expiresAt?:number;autoCloseSeconds?:number;startsAt?:number;status?:'draft'|'published';audience?:AnnouncementAudience;}
export function announcementVisible(item:PopupDelivery,plus=false,now=Date.now()):boolean{
 return !item.deleted&&item.status!=='draft'&&(!item.startsAt||item.startsAt<=now)&&(!item.expiresAt||item.expiresAt>now)&&(!item.audience||item.audience==='all'||item.audience===(plus?'plus':'free'));
}
export function announcementState(item:PopupDelivery,now=Date.now()):string{
 if(item.deleted)return 'Archived';if(item.status==='draft')return 'Draft';if(item.expiresAt&&item.expiresAt<=now)return 'Expired';if(item.startsAt&&item.startsAt>now)return 'Scheduled';return 'Live';
}
export function popupReadId(item:PopupDelivery,now=Date.now()):string{const date=new Date(now),day=`${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`;return `announcement-${item.id}${item.popupMode==='daily'?`-${day}`:''}`;}
export function popupEligible(item:PopupDelivery,now=Date.now(),plus=false):boolean{return announcementVisible(item,plus,now)&&(item.category||'Product update')==='Product update'&&item.popupMode!=='off';}
export function popupSeen(item:PopupDelivery,readIds:string[],now=Date.now()):boolean{return item.popupMode!=='refresh'&&readIds.includes(popupReadId(item,now));}
