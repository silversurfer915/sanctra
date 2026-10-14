import type { StudySession } from '../types/index.ts';

export type RankingPeriod = 'day' | 'week' | 'month';

/**
 * Period key formatted as YYYY-MM-DD using the user's local timezone.
 * Resolves Bug 23 (UTC period rollover at 5:30am IST).
 */
export function localPeriodKey(now: Date, period: RankingPeriod): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'week') {
    const dayOfWeek = (d.getDay() + 6) % 7; // Monday = 0
    d.setDate(d.getDate() - dayOfWeek);
  } else if (period === 'month') {
    d.setDate(1);
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const utcPeriodKey = localPeriodKey; // Backward compatibility alias

function bounds(now: Date, period: RankingPeriod, previous = false) {
  const key = localPeriodKey(now, period);
  const [y, m, d] = key.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  const end = new Date(start);
  if (previous) {
    if (period === 'month') start.setMonth(start.getMonth() - 1);
    else start.setDate(start.getDate() - (period === 'week' ? 7 : 1));
  } else {
    if (period === 'month') end.setMonth(end.getMonth() + 1);
    else end.setDate(end.getDate() + (period === 'week' ? 7 : 1));
  }
  return { start: +start, end: +end };
}

const MAX_SINGLE_SESSION_SECONDS = 16 * 3600; // 16 hours

export function recordedFocus(records: StudySession[], now: Date, period: RankingPeriod, previous = false) {
  const { start, end } = bounds(now, period, previous);
  let seconds = 0;
  const seen = new Set<string>();
  const nowMs = +now + 60000; // 1 minute clock drift margin

  for (const s of records) {
    if (
      seen.has(s.id) ||
      !Number.isFinite(s.durationSeconds) ||
      s.durationSeconds <= 0 ||
      !Number.isFinite(s.startTime) ||
      !Number.isFinite(s.endTime) ||
      s.endTime <= s.startTime ||
      s.startTime > nowMs ||
      s.endTime > nowMs ||
      s.durationSeconds > MAX_SINGLE_SESSION_SECONDS
    ) {
      continue;
    }
    seen.add(s.id);
    const wallClock = (s.endTime - s.startTime) / 1000;
    const cappedDuration = Math.min(s.durationSeconds, wallClock);
    const overlap = Math.max(0, Math.min(end, s.endTime) - Math.max(start, s.startTime));
    seconds += (cappedDuration * overlap) / (s.endTime - s.startTime);
  }
  const maxPeriodSeconds = period === 'day' ? 86400 : period === 'week' ? 604800 : Math.floor((end - start) / 1000);
  return Math.min(Math.floor(seconds), maxPeriodSeconds);
}

export interface Competitor {
  uid: string;
  displayName: string;
  avatarUrl: string;
  streakDays: number;
  status: string;
  currentSubject: string;
  statusMessage: string;
  updatedAt: number;
  dayKey: string;
  weekKey: string;
  monthKey: string;
  daySeconds: number;
  weekSeconds: number;
  monthSeconds: number;
  previousDaySeconds: number;
  previousWeekSeconds: number;
  previousMonthSeconds: number;
}

export function competitiveRows(members: Competitor[], period: RankingPeriod, now = new Date()) {
  const key = localPeriodKey(now, period);
  const score = (m: Competitor) => m[`${period}Key`] === key ? m[`${period}Seconds`] : 0;
  const previous = (m: Competitor) => {
    const [y, mn, d] = key.split('-').map(Number);
    const before = new Date(y, mn - 1, d);
    before.setDate(before.getDate() - 1);
    const priorKey = localPeriodKey(before, period);
    return m[`${period}Key`] === key
      ? m[`previous${period[0].toUpperCase() + period.slice(1)}Seconds` as 'previousDaySeconds']
      : m[`${period}Key`] === priorKey
        ? m[`${period}Seconds`]
        : 0;
  };
  const sorted = [...members].sort((a, b) => score(b) - score(a) || a.uid.localeCompare(b.uid));
  return sorted.map(m => {
    const seconds = score(m);
    const rank = 1 + members.filter(v => score(v) > seconds).length;
    const prior = previous(m);
    const previousRank = 1 + members.filter(v => previous(v) > prior).length;
    return { ...m, seconds, rank, movement: prior > 0 ? previousRank - rank : null };
  });
}
