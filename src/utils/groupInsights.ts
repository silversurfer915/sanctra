import type {StreakProjection} from './studyStreak.ts';
import {integrityPeriods} from './studyIntegrity.ts';
import type {PublicRanking} from './publicRanking.ts';
import type {PublicStyle} from './publicIdentity.ts';
import type { StudySession } from '../types/index.ts';
import { periodBounds, shiftPeriod, buildPeriodAnalytics } from './analytics.ts';
import { getLocalDateString } from './time.ts';
export type GroupPeriod = 'day' | 'week' | 'month';
export interface LiveGroupMember extends StreakProjection {
  publicStyle?:PublicStyle;
  integrity?:PublicRanking|null;
  uid:string; displayName:string; avatarUrl:string; joined:boolean; joinedAt:number;
  status:string; currentSubject:string; statusMessage:string; streakDays:number;
  dailySeconds:Record<string,number>; liveSeconds:number; liveDate:string;
  lastHeartbeat:number; focusStartedAt:number;
}
export function groupDailyTotals(sessions:StudySession[], now=new Date()) {
  const result:Record<string,number>={};
  // Current and previous month cover all three comparison periods.
  for(const offset of [-1,0]) {
    const anchor=new Date(now.getFullYear(),now.getMonth()+offset,1);
    for(const day of buildPeriodAnalytics(sessions,[],anchor,'month',now).days)
      if(day.seconds>0)result[getLocalDateString(day.date)]=Math.min(86400,Math.round(day.seconds));
  }
  return result;
}
export function memberFocusSeconds(member:LiveGroupMember, period:GroupPeriod, now:Date, previous=false) {
  const clock=member.integrity;
  const isOnline = liveMemberStatus(member, +now) !== 'offline';
  // Match global rankings exactly. The server has already credited active time;
  // adding the presence session age would count it again (including pauses).
  if('integrity' in member){
    if(!clock||previous||clock.integrityStatus==='confirmed')return 0;
    return clock[`${period}Start`]===integrityPeriods(+now)[`${period}Start`]
      ? Math.max(0,clock[`${period}Seconds`]) : 0;
  }
  const bounds=periodBounds(previous?shiftPeriod(now,period,-1):now,period);
  let total=Object.entries(member.dailySeconds||{}).reduce((sum,[date,value])=>{
    const time=+new Date(`${date}T00:00:00`);
    return time>=+bounds.start&&time<+bounds.end?sum+Math.max(0,value):sum;
  },0);
  const liveDay=+new Date(`${member.liveDate}T00:00:00`);
  if(liveDay>=+bounds.start&&liveDay<+bounds.end) {
    const ticking=member.status==='focusing' && isOnline;
    total+=Math.max(0,member.liveSeconds||0)+(ticking&&member.focusStartedAt>0?Math.max(0,Math.floor((+now-member.focusStartedAt)/1000)):0);
  }
  return Math.round(total);
}
export function groupRankings(members:LiveGroupMember[],period:GroupPeriod,now=new Date()) {
  const joined=members.filter(m=>m.joined);
  const order=(previous:boolean)=>joined.map(member=>({member,seconds:memberFocusSeconds(member,period,now,previous)})).sort((a,b)=>b.seconds-a.seconds||a.member.joinedAt-b.member.joinedAt||a.member.uid.localeCompare(b.member.uid));
  const previous=order(true), previousRanks=new Map<string,number>();
  previous.forEach((entry,i)=>{if(entry.seconds>0)previousRanks.set(entry.member.uid,i>0&&entry.seconds===previous[i-1].seconds?previousRanks.get(previous[i-1].member.uid)!:i+1);});
  const current=order(false),ranks=new Map<string,number>();
  return current.map((entry,i)=>{
    if(entry.seconds<=0)return {...entry,rank:null,movement:null};
    const previousActive=current.slice(0,i).filter(item=>item.seconds>0);
    const prior=previousActive.at(-1);
    const rank=prior&&entry.seconds===prior.seconds?ranks.get(prior.member.uid)!:previousActive.length+1;
    ranks.set(entry.member.uid,rank);
    return {...entry,rank,movement:previousRanks.has(entry.member.uid)?previousRanks.get(entry.member.uid)!-rank:null};
  });
}
export function liveMemberStatus(member:LiveGroupMember,now:number) {
  const heartbeat = (member.lastHeartbeat && typeof (member.lastHeartbeat as any).toMillis === 'function')
    ? (member.lastHeartbeat as any).toMillis()
    : (member.lastHeartbeat && typeof (member.lastHeartbeat as any).seconds === 'number')
      ? (member.lastHeartbeat as any).seconds * 1000
      : Number(member.lastHeartbeat) || 0;
  return (now - heartbeat >= 45000) ? 'offline' : member.status;
}
