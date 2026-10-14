import {liveStretchCredit, periodCredit} from './studyCaps.ts';
export type IntegrityStatus = 'clear' | 'review' | 'confirmed';

export interface IntegrityClock {
  uid: string;
  registered: boolean;
  dayStart: number;
  weekStart: number;
  monthStart: number;
  daySeconds: number;
  weekSeconds: number;
  monthSeconds: number;
  lastTick: { toMillis: () => number };
  deviceId: string;
  timerId: string;
  active: boolean;
  clientSeconds: number;
  credited: number;
  stretchStart?: number;
  integrityStatus: IntegrityStatus;
  reason: string;
}

export function integrityPeriods(now: number) {
  const d = new Date(now);
  const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayOfWeek = (d.getDay() + 6) % 7; // Monday = 0, Sunday = 6
  const weekStart = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dayOfWeek).getTime();
  const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  return { dayStart, weekStart, monthStart };
}

/**
 * Server-authoritative account clock.
 * Time is computed directly from server timestamps (now - previous.lastTick).
 * No per-tick second loss, no 90s heartbeat cap, and no fragile client/server clock comparisons.
 */
export function advanceIntegrity(
  previous: IntegrityClock | null,
  now: number,
  timerId: string,
  active: boolean,
  clientSeconds: number,
  deviceId = timerId
): Omit<IntegrityClock, 'uid' | 'registered' | 'lastTick'> {
  const periods = integrityPeriods(now);
  const prevTickMs = previous ? previous.lastTick.toMillis() : now;
  const elapsed = previous ? Math.max(0, Math.floor((now - prevTickMs) / 1000)) : 0;

  // Stale lease takeover after 90s across devices
  if (previous?.active && previous.deviceId !== deviceId && elapsed < 90) {
    throw new Error('This account already has a verified timer on another device. Pause it there before starting here.');
  }

  // Detect real anomalies: client attempting large unearned jumps (> 1hr jump beyond elapsed) or negative time
  const isBackwards = previous && now < prevTickMs - 5000;
  const isImpossibleElapsed = elapsed > 57600; // > 16 hours continuous in one tick
  const anomaly = isBackwards || isImpossibleElapsed;
  const reason = isBackwards ? 'clock_skew' : isImpossibleElapsed ? 'impossible_elapsed' : '';

  // Credit exact server-authoritative elapsed time without artificial second loss or 90s truncation
  const stretch = liveStretchCredit(previous ?? {active:false}, prevTickMs, now);
  const credited = anomaly ? 0 : stretch.credited;

  const totals = Object.fromEntries((['day', 'week', 'month'] as const).map(period => {
    const start = periods[`${period}Start`];
    const old = previous?.[`${period}Start`] === start ? previous[`${period}Seconds`] : 0;
    const increment = periodCredit(prevTickMs, credited, start);
    return [`${period}Seconds`, old + increment];
  })) as Pick<IntegrityClock, 'daySeconds' | 'weekSeconds' | 'monthSeconds'>;

  return {
    ...periods,
    ...totals,
    deviceId,
    timerId,
    active,
    clientSeconds: Math.floor(clientSeconds),
    credited,
    stretchStart: stretch.stretchStart,
    integrityStatus: previous?.integrityStatus === 'confirmed' ? 'confirmed' : previous?.integrityStatus === 'review' || anomaly ? 'review' : 'clear',
    reason: previous?.reason || (anomaly ? (reason || 'timer_jump') : ''),
  };
}
