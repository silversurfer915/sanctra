/** Public personal-study streak; descriptive only, never a source of ranking credit. */
export interface StreakProjection {streakDays?:number;streakDate?:string;streakUtcOffset?:number}
const DAY=86400000;
const dateAt=(now:number,offset:number)=>new Date(now+offset*60000).toISOString().slice(0,10);
export function streakProjection(sessions:ReadonlyArray<{date:string;durationSeconds:number}>,now=new Date(),offset=-now.getTimezoneOffset()):Required<StreakProjection> {
 const today=dateAt(+now,offset),totals=new Map<string,number>();
 for(const s of sessions)if(/^\d{4}-\d{2}-\d{2}$/.test(s.date)&&s.date<=today&&Number.isFinite(s.durationSeconds)&&s.durationSeconds>0)totals.set(s.date,(totals.get(s.date)||0)+s.durationSeconds);
 let day=Date.parse(`${today}T00:00:00Z`);
 if((totals.get(today)||0)<3600)day-=DAY;
 const end=new Date(day).toISOString().slice(0,10);let count=0;
 while((totals.get(new Date(day).toISOString().slice(0,10))||0)>=3600){count++;day-=DAY;}
 return {streakDays:count,streakDate:count?end:'',streakUtcOffset:offset};
}
export function currentPublicStreak(p:StreakProjection,now=Date.now()):number {
 const count=p.streakDays,offset=p.streakUtcOffset;
 if(!Number.isInteger(count)||count! < 0||count! > 100000||!Number.isInteger(offset)||Math.abs(offset!)>840||!/^\d{4}-\d{2}-\d{2}$/.test(p.streakDate||''))return 0;
 const distance=(Date.parse(`${dateAt(now,offset!)}T00:00:00Z`)-Date.parse(`${p.streakDate}T00:00:00Z`))/DAY;
 return distance===0||distance===1?count!:0;
}
