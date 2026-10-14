import type { StudySession, Subject } from '../types/index.ts';
export type AnalyticsPeriod = 'day' | 'week' | 'month';
export function periodBounds(anchor: Date, kind: AnalyticsPeriod) {
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  if (kind === 'week') start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  if (kind === 'month') start.setDate(1);
  const end = new Date(start);
  if (kind === 'month') end.setMonth(end.getMonth() + 1);
  else end.setDate(end.getDate() + (kind === 'week' ? 7 : 1));
  return { start, end };
}
export function shiftPeriod(anchor: Date, kind: AnalyticsPeriod, amount: number) {
  const { start } = periodBounds(anchor, kind);
  if (kind === 'month') start.setMonth(start.getMonth() + amount);
  else start.setDate(start.getDate() + amount * (kind === 'week' ? 7 : 1));
  return start;
}
export function sessionEnd(session: StudySession) {
  return Number.isFinite(session.endTime) && session.endTime > session.startTime ? session.endTime : session.startTime + session.durationSeconds * 1000;
}
export function buildPeriodAnalytics(records: StudySession[], subjects: Subject[], anchor: Date, kind: AnalyticsPeriod, now = new Date()) {
  const { start, end } = periodBounds(anchor, kind);
  const days: { day: number; date: Date; seconds: number }[] = [];
  for (let date = new Date(start); date < end; date.setDate(date.getDate() + 1)) days.push({ day: date.getDate(), date: new Date(date), seconds: 0 });
  const hours = Array<number>(24).fill(0);
  const groups = new Map<string, { id: string; name: string; color: string; seconds: number }>();
  const modes = new Map<string, number>();
  const seen = new Set<string>();
  const sessions: StudySession[] = [];
  let totalSeconds = 0;
  for (const session of records) {
    if (seen.has(session.id) || !Number.isFinite(session.durationSeconds) || session.durationSeconds <= 0 || !Number.isFinite(session.startTime)) continue;
    seen.add(session.id);
    const wallEnd = sessionEnd(session);
    if (wallEnd <= +start || session.startTime >= +end) continue;
    // Pauses aren't timestamped: distribute recorded focus proportionally across the wall interval.
    const ratio = session.durationSeconds / ((wallEnd - session.startTime) / 1000);
    let cursor = Math.max(+start, session.startTime), contribution = 0;
    while (cursor < Math.min(+end, wallEnd)) {
      const date = new Date(cursor), nextHour = new Date(date);
      nextHour.setHours(date.getHours() + 1, 0, 0, 0);
      const boundary = Math.min(+end, wallEnd, +nextHour);
      if (boundary <= cursor) break;
      const seconds = (boundary - cursor) / 1000 * ratio;
      const day = days.find(d => d.date.getFullYear() === date.getFullYear() && d.date.getMonth() === date.getMonth() && d.day === date.getDate());
      if (day) day.seconds += seconds;
      if(!session.timeOfDayUnknown)hours[date.getHours()] += seconds; contribution += seconds; cursor = boundary;
    }
    totalSeconds += contribution; sessions.push(session);
    const subject = subjects.find(s => s.id === session.subjectId), id = session.subjectId || 'untagged';
    const group = groups.get(id) || { id, name: subject?.name || session.subjectName || 'Untagged', color: subject?.color || session.subjectColor || '#b7cdea', seconds: 0 };
    group.seconds += contribution; groups.set(id, group);
    modes.set(session.mode, (modes.get(session.mode) || 0) + contribution);
  }
  const daysElapsed = days.filter(d => +d.date <= +now).length;
  const durations = sessions.map(s => s.durationSeconds).sort((a,b) => a-b);
  const activeDays = days.filter(d => d.seconds > 0).length;
  return { start, end, totalSeconds, sessionCount: sessions.length, averageSession: sessions.length ? durations.reduce((a,b)=>a+b,0) / sessions.length : 0,
    medianSession: durations.length ? (durations[Math.floor((durations.length - 1) / 2)] + durations[Math.floor(durations.length / 2)]) / 2 : 0,
    longestSession: Math.max(0,...durations), dailyAverage: daysElapsed ? totalSeconds / daysElapsed : 0,
    activeDayAverage: activeDays ? totalSeconds / activeDays : 0, activeDays, daysElapsed, days, hours,
    bestDay: days.reduce((best,d) => d.seconds > best.seconds ? d : best, days[0]),
    peakHour: hours.some(Boolean) ? hours.indexOf(Math.max(...hours)) : null,
    modes: [...modes].map(([mode,seconds])=>({mode,seconds})).sort((a,b)=>b.seconds-a.seconds),
    subjects: [...groups.values()].sort((a,b)=>b.seconds-a.seconds), sessions: sessions.sort((a,b)=>b.startTime-a.startTime) };
}
export function buildAnalytics(records: StudySession[], subjects: Subject[], year: number, month: number, now = new Date()) {
  return buildPeriodAnalytics(records, subjects, new Date(year, month, 1), 'month', now);
}
