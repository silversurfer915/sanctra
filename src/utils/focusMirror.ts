import type {TimerMode, TimerStatus} from '../types/index.ts';
export interface RemoteFocus {
 sessionId?: string; deviceId?: string; status?: string; mode?: string;
 startTime?: number; runningSince?: number | null; accumulatedSeconds?: number; targetSeconds?: number;
}
export function mirrorFocusSession(remote:RemoteFocus,localId:string|null,deviceId:string,now=Date.now()):{sessionId:string;status:TimerStatus;mode:TimerMode;startTime:number;runningSince:number|null;accumulatedSeconds:number;targetSeconds:number;displaySeconds:number}|null {
 if (!remote.sessionId || !['running','paused'].includes(remote.status || '') || remote.deviceId !== 'mac' && remote.deviceId !== deviceId && remote.sessionId !== localId) return null;
 const allowed=['countup','pomodoro-25','pomodoro-50','pomodoro-90','pomodoro-custom','countdown-60','countdown-120','custom'];
 const mode=allowed.includes(remote.mode || '') ? remote.mode as TimerMode : remote.mode === 'timer' ? 'custom' : 'countup';
 const accumulatedSeconds=Math.max(0,remote.accumulatedSeconds || 0);
 const runningSince=remote.status === 'running' ? remote.runningSince ?? remote.startTime ?? now : null;
 const elapsed=accumulatedSeconds+(runningSince===null?0:Math.max(0,Math.floor((now-runningSince)/1000)));
 const targetSeconds=Math.max(0,remote.targetSeconds || 0);
 return {sessionId:remote.sessionId,status:remote.status as TimerStatus,mode,startTime:remote.startTime || now,runningSince,accumulatedSeconds,targetSeconds,displaySeconds:mode==='countup'?elapsed:Math.max(0,targetSeconds-elapsed)};
}
