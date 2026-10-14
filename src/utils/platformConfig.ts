import { doc, onSnapshot, serverTimestamp, runTransaction, collection, query, orderBy, limit } from 'firebase/firestore';
import { getCloudDatabase } from './firebase.ts';
import { cloudErrorMessage } from './cloudErrors.ts';
export interface PlatformConfig {
  maintenanceMode: boolean;
  sitePaused:boolean;
  pauseStartsAt:number;
  pauseEndsAt:number;
  chatEnabled:boolean;
  chatAttachmentsEnabled:boolean;
  groupCreationEnabled:boolean;
  announcementPopupsEnabled:boolean;
  noticeEndsAt:number;
  groupsEnabled: boolean;
  supportEnabled: boolean;
  rankingsEnabled: boolean;
  syllabusEnabled: boolean;
  jeeTrackEnabled: boolean;
  notice: string;
  noticeType: 'info' | 'warning' | 'maintenance';
  maintenanceMessage: string;
  maintenanceEta: string;
}
export const DEFAULT_PLATFORM_CONFIG: PlatformConfig = {
  sitePaused:false,pauseStartsAt:0,pauseEndsAt:0,chatEnabled:true,chatAttachmentsEnabled:true,groupCreationEnabled:true,announcementPopupsEnabled:true,noticeEndsAt:0,maintenanceMode:false, groupsEnabled:true, supportEnabled:true, rankingsEnabled:true,
  syllabusEnabled:false, jeeTrackEnabled:true, notice:'', noticeType:'info', maintenanceMessage:'', maintenanceEta:'',
};
/** Whitelist fields so snapshot metadata never leaks back into a save. */
export function normalizePlatformConfig(raw: Partial<PlatformConfig> = {}): PlatformConfig {
  const boolean = (key: keyof PlatformConfig) => typeof raw[key] === 'boolean' ? raw[key] as boolean : DEFAULT_PLATFORM_CONFIG[key] as boolean;
  const text = (key: 'notice'|'maintenanceMessage'|'maintenanceEta', max: number) => typeof raw[key] === 'string' ? raw[key]!.slice(0,max) : '';
  const time=(key:'pauseStartsAt'|'pauseEndsAt'|'noticeEndsAt')=>typeof raw[key]==='number'&&Number.isFinite(raw[key])?Math.max(0,Math.min(4102444800000,raw[key]!)):0;
  return {sitePaused:boolean('sitePaused'),pauseStartsAt:time('pauseStartsAt'),pauseEndsAt:time('pauseEndsAt'),noticeEndsAt:time('noticeEndsAt'),chatEnabled:boolean('chatEnabled'),chatAttachmentsEnabled:boolean('chatAttachmentsEnabled'),groupCreationEnabled:boolean('groupCreationEnabled'),announcementPopupsEnabled:boolean('announcementPopupsEnabled'),maintenanceMode:boolean('maintenanceMode'),groupsEnabled:boolean('groupsEnabled'),supportEnabled:boolean('supportEnabled'),rankingsEnabled:boolean('rankingsEnabled'),syllabusEnabled:boolean('syllabusEnabled'),jeeTrackEnabled:boolean('jeeTrackEnabled'),notice:text('notice',300),maintenanceMessage:text('maintenanceMessage',2000),maintenanceEta:text('maintenanceEta',150),noticeType:['info','warning','maintenance'].includes(raw.noticeType || '') ? raw.noticeType! : 'info'};
}
export function watchPlatformConfig(callback:(value:PlatformConfig)=>void,onError?:(message:string)=>void) {
  const db=getCloudDatabase();
  if(!db){callback(DEFAULT_PLATFORM_CONFIG);return()=>{};}
  return onSnapshot(doc(db,'platform','controls'),snapshot=>callback(normalizePlatformConfig(snapshot.data())),error=>onError?.(cloudErrorMessage(error,'load platform controls')));
}
export async function savePlatformConfig(actorUid:string,value:PlatformConfig) {
  const db=getCloudDatabase();if(!db)throw new Error('Reconnect to manage your platform.');
  try {await runTransaction(db,async transaction=>{
    const ref=doc(db,'platform','controls'),snapshot=await transaction.get(ref),before=normalizePlatformConfig(snapshot.data()),after=normalizePlatformConfig(value);
    const changed=Object.keys(after).filter(key=>before[key as keyof PlatformConfig]!==after[key as keyof PlatformConfig]);
    transaction.set(ref,{...after,actorUid,updatedAt:serverTimestamp()});
    transaction.set(doc(collection(db,'platform_operations_audit')),{actorUid,createdAt:serverTimestamp(),changed,sitePaused:after.sitePaused,notice:after.notice});
  });}
  catch(error){throw new Error(cloudErrorMessage(error,'save platform controls'));}
}

export function isSitePaused(value:PlatformConfig,now=Date.now()){return value.sitePaused&&(!value.pauseStartsAt||value.pauseStartsAt<=now)&&(!value.pauseEndsAt||value.pauseEndsAt>now);}

export interface PlatformAudit {id:string;changed:string[];sitePaused:boolean;createdAt?:{toMillis:()=>number};}
export function watchPlatformAudit(callback:(items:PlatformAudit[])=>void,onError:(message:string)=>void){const db=getCloudDatabase();if(!db)return()=>{};return onSnapshot(query(collection(db,'platform_operations_audit'),orderBy('createdAt','desc'),limit(20)),s=>callback(s.docs.map(d=>({id:d.id,...d.data()} as PlatformAudit))),()=>onError('Operation history could not be loaded.'));}

/** Shared routing guard. Paused JEE views must never mount sample-data components. */
export function resolveFeaturePause(config:PlatformConfig,view:string){
 if(config.maintenanceMode&&view!=='admin'&&view!=='timer')return {isMaintenance:true,title:'Sanctra Sanctuary'};
 if(view==='jeetrack'&&!config.jeeTrackEnabled)return {isMaintenance:true,title:'JEE Track'};
 if(view==='groups'&&!config.groupsEnabled)return {isMaintenance:true,title:'Live Study Groups'};
 if(view==='rankings'&&!config.rankingsEnabled)return {isMaintenance:true,title:'Community Leaderboard & Rankings'};
 return {isMaintenance:false,title:''};
}
