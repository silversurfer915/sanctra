export class TimerSyncError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'TimerSyncError';
    this.status = status;
  }
}
export function timerSyncMessage(error: unknown): string {
  if (error instanceof TimerSyncError) return error.message;
  return 'Ranking connection interrupted. Retrying automatically.';
}

/** Retry transient failures even while idle/paused, without replaying an old timer action. */
export function createTimerSyncRetry(retryLatest: () => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let attempts = 0;
  let disposed = false;
  const clear = () => { clearTimeout(timer); timer = undefined; };
  return {
    failed(error: unknown) {
      clear();
      if (disposed || (error instanceof TimerSyncError && error.status < 500)) return;
      const delay = Math.min(30000, 5000 * 2 ** Math.min(attempts++, 3));
      timer = setTimeout(() => { timer = undefined; if (!disposed) retryLatest(); }, delay);
    },
    succeeded() { clear(); attempts = 0; },
    dispose() { disposed = true; clear(); },
  };
}
