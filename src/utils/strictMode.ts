import type {TimerStatus} from '../types/index.ts';
export function strictFocusAction(enabled: boolean, status: TimerStatus, foreground: boolean, autoPaused: boolean): 'pause' | 'resume' | null {
  if (!enabled) return null;
  if (!foreground && status === 'running') return 'pause';
  if (foreground && status === 'paused' && autoPaused) return 'resume';
  return null;
}
