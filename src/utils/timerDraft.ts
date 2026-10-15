import {focusSnapshot} from './focusTiming.ts';
import type { TimerDraft } from '../types/index.ts';
export function restoreTimerDraft(draft: TimerDraft, now: number) {
  const running = draft.status === 'running' || draft.status === 'break-running';
  // Old builds saved the current total alongside the original segment start.
  const anchor = draft.version === 2 ? draft.runningSince : draft.lastUpdated;
  const strictRunning = draft.strictMode === true && draft.status === 'running';
  const effectiveNow = strictRunning ? Math.min(now, draft.lastUpdated) : now;
  const rawElapsedSeconds = Math.max(0, draft.accumulatedSeconds + (running && anchor !== null ? Math.max(0, Math.floor((effectiveNow - anchor) / 1000)) : 0));
  const isBreak = ['break-running','break-paused','break-complete'].includes(draft.status);
  const target = isBreak ? draft.breakSeconds : draft.targetSeconds;
  const focus=focusSnapshot(draft.mode,draft.targetSeconds,Math.min(rawElapsedSeconds,draft.accumulatedSeconds),running&&!strictRunning?anchor:null,effectiveNow,draft.focusEndedAt??draft.lastUpdated);
  const finished=!isBreak&&draft.mode!=='countup'&&draft.targetSeconds>0&&rawElapsedSeconds>=draft.targetSeconds;
  const elapsedSeconds=isBreak?Math.min(rawElapsedSeconds,Math.max(0,target)):finished?draft.targetSeconds:rawElapsedSeconds;
  return {
    focusEndedAt: finished?focus.endTime:draft.focusEndedAt??(running?null:draft.lastUpdated),
    sessionId: typeof draft.sessionId === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(draft.sessionId) ? draft.sessionId : null,
    status: finished ? (draft.mode.startsWith('pomodoro')?'break-ready' as const:'paused' as const) : strictRunning ? 'paused' as const : draft.status === 'idle' && elapsedSeconds > 0 ? 'paused' as const : draft.status,
    elapsedSeconds,
    displaySeconds: draft.mode === 'countup' && !isBreak ? elapsedSeconds : Math.max(0, target - elapsedSeconds),
    sessionStartTime: draft.sessionStartTime ?? (now - elapsedSeconds * 1000),
    runningSince: running && !strictRunning && !finished ? now : null,
  };
}
export function hasUnsavedFocus(status: string, elapsedSeconds: number): boolean {
  return elapsedSeconds > 0 && (!status.startsWith('break-') || status === 'break-ready');
}
