import type { TimerDraft } from '../types/index.ts';
export function restoreTimerDraft(draft: TimerDraft, now: number) {
  const running = draft.status === 'running' || draft.status === 'break-running';
  // Old builds saved the current total alongside the original segment start.
  const anchor = draft.version === 2 ? draft.runningSince : draft.lastUpdated;
  const strictRunning = draft.strictMode === true && draft.status === 'running';
  const effectiveNow = strictRunning ? Math.min(now, draft.lastUpdated) : now;
  const elapsedSeconds = Math.max(0, draft.accumulatedSeconds + (running && anchor !== null ? Math.max(0, Math.floor((effectiveNow - anchor) / 1000)) : 0));
  const isBreak = draft.status.startsWith('break-');
  const target = isBreak ? draft.breakSeconds : draft.targetSeconds;
  return {
    sessionId: typeof draft.sessionId === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(draft.sessionId) ? draft.sessionId : null,
    status: strictRunning ? 'paused' as const : draft.status === 'idle' && elapsedSeconds > 0 ? 'paused' as const : draft.status,
    elapsedSeconds,
    displaySeconds: draft.mode === 'countup' && !isBreak ? elapsedSeconds : Math.max(0, target - elapsedSeconds),
    sessionStartTime: draft.sessionStartTime ?? (now - elapsedSeconds * 1000),
    runningSince: running && !strictRunning ? now : null,
  };
}
export function hasUnsavedFocus(status: string, elapsedSeconds: number): boolean {
  return elapsedSeconds > 0 && (!status.startsWith('break-') || status === 'break-ready');
}
