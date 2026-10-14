import type {PopupMode,AnnouncementAudience} from './announcementDelivery.ts';
import { collection, doc, getDoc, onSnapshot, query, orderBy, limit, setDoc, updateDoc } from 'firebase/firestore';
import { getCloudDatabase } from './firebase.ts';
export interface Announcement { id:string; title:string; text:string; authorUid:string; timestamp:number; deleted?:boolean; category?:string; pinned?:boolean; coverUrl?:string;popupMode?:PopupMode;expiresAt?:number;autoCloseSeconds?:number;startsAt?:number;status?:'draft'|'published';audience?:AnnouncementAudience;actionLabel?:string;actionUrl?:string; }
export async function isInboxAdmin(uid:string):Promise<boolean> { const db=getCloudDatabase();return !!db && (await getDoc(doc(db,'admins',uid))).exists(); }
export function subscribeAnnouncements(callback:(items:Announcement[])=>void,onError:(message:string)=>void,includeArchived=false):()=>void {
 const db=getCloudDatabase();if(!db){callback([]);return()=>{};}
 return onSnapshot(query(collection(db,'announcements'),orderBy('timestamp','desc'),limit(100)),snapshot=>callback(snapshot.docs.map(d=>({id:d.id,...d.data()} as Announcement)).filter(a=>includeArchived||!a.deleted)),()=>onError('Announcements could not be loaded. Check your connection.'));
}
export async function publishAnnouncement(uid:string,title:string,text:string,options:AnnouncementOptions={}):Promise<void> {
 const db=getCloudDatabase();if(!db)throw new Error('Sign in to publish an announcement.');
 await setDoc(doc(db,'announcements',crypto.randomUUID()),{title:title.trim(),text:text.trim(),authorUid:uid,timestamp:Date.now(),...options});
}

export async function editAnnouncement(id:string,title:string,text:string,options:AnnouncementOptions={}){const db=getCloudDatabase();if(!db)throw new Error("Reconnect to edit announcements.");await updateDoc(doc(db,"announcements",id),{title:title.trim(),text:text.trim(),...options});}
export async function archiveAnnouncement(id:string,deleted=true){const db=getCloudDatabase();if(!db)throw new Error("Reconnect to manage announcements.");await updateDoc(doc(db,"announcements",id),{deleted});}

export interface AnnouncementOptions {category?:string;pinned?:boolean;coverUrl?:string;popupMode?:PopupMode;expiresAt?:number;autoCloseSeconds?:number;startsAt?:number;status?:'draft'|'published';audience?:AnnouncementAudience;actionLabel?:string;actionUrl?:string;}
