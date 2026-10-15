/** A bounded timer finishes at its deadline, even if the browser wakes much later. */
export function focusSnapshot(mode:string,target:number,accumulated:number,runningSince:number|null,now:number,lastFocusEnd:number|null=null){
 const runningSeconds=runningSince===null?0:Math.max(0,Math.floor((now-runningSince)/1000));
 const raw=Math.max(0,accumulated)+runningSeconds;
 const bounded=mode!=='countup'&&target>0;
 const seconds=bounded?Math.min(target,raw):raw;
 const completed=bounded&&raw>=target;
 const endTime=runningSince===null?(lastFocusEnd??now):completed?runningSince+Math.max(0,target-accumulated)*1000:now;
 return {seconds,completed,endTime,capped:seconds>10800&&Math.min(runningSeconds,seconds)>10800};
}
