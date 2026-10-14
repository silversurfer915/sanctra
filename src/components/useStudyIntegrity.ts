import { useEffect, useRef, useState, useCallback } from 'react';
import type { AuthUser, TimerStatus } from '../types/index.ts';
import { initFirebase } from '../utils/firebase.ts';
import { getDeviceId } from '../utils/activeSessionService.ts';
import { TimerSyncError, timerSyncMessage, createTimerSyncRetry } from '../utils/timerSyncError.ts';

export function useStudyIntegrity(
  user: AuthUser | null,
  status: TimerStatus,
  _focusSeconds: number,
  sessionStart: number
) {
  const latest = useRef({ status, sessionStart });
  latest.current = { status, sessionStart };
  const [capped, setCapped] = useState(false);
  const [error, setError] = useState('');
  const enqueueRef = useRef<(targetStatus?: TimerStatus) => Promise<void>>(() => Promise.resolve());

  useEffect(() => {
    setCapped(false);
    setError('');
    const { auth } = initFirebase();
    if (!auth || !user || user.uid.startsWith('guest-')) return;
    let closed = false;
    let queue: Promise<void> = Promise.resolve();
    const deviceId = getDeviceId();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const enqueue = (targetStatus?: TimerStatus): Promise<void> => {
      // Capture the session identity together with the action. A queued stop must
      // never be applied to a newer timer after this request waits for the network.
      const state = { ...latest.current, status: targetStatus ?? latest.current.status };
      queue = queue.then(async () => {
        if (closed || auth.currentUser?.uid !== user.uid) return;
        try {
          const endpoint = import.meta.env.VITE_AI_GATEWAY_URL?.replace(/\/$/, '');
          if (!endpoint) throw new TimerSyncError(503, 'Ranking sync is not configured.');
          const token = await auth.currentUser.getIdToken();
          const response = await fetch(`${endpoint}/timer`, {
            method: 'POST',
            headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
            body: JSON.stringify({ ...state, deviceId, timezone }),
            signal: AbortSignal.timeout(20000),
          });
          const result = await response.json();
          if (!response.ok) throw new TimerSyncError(response.status, result.message || 'Ranking server is temporarily unavailable.');
          if (!closed) { retry.succeeded(); setError(''); if (!result.ignored) setCapped(result.capped === true); }
        } catch (e) {
          if (!closed) { setError(timerSyncMessage(e)); retry.failed(e); }
        }
      });
      return queue;
    };

    const retry = createTimerSyncRetry(() => { void enqueue(); });
    enqueueRef.current = enqueue;
    void enqueue();
    const interval = setInterval(() => {
      if (latest.current.status === 'running') void enqueue();
    }, 60000);
    const visible = () => { if (document.visibilityState === 'visible') void enqueue(); };
    const online = () => { void enqueue(); };
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('online', online);

    return () => {
      closed = true;
      retry.dispose();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('online', online);
      enqueueRef.current = () => Promise.resolve();
    };
  }, [user?.uid]);

  useEffect(() => { void enqueueRef.current(status); }, [status, sessionStart]);
  const flushIntegrity = useCallback(async (targetStatus?: TimerStatus) => enqueueRef.current(targetStatus), []);
  return { error, flushIntegrity, capped };
}
