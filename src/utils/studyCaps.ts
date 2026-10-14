export const LIVE_STRETCH_CAP_SECONDS = 3 * 60 * 60;
export const MANUAL_DAY_CAP_SECONDS = 6 * 60 * 60;
/** Credit the beginning of a stretch, never its already capped tail. */
export function liveStretchCredit(previous: {active: boolean; stretchStart?: number}, tick: number, now: number) {
 const stretchStart = previous.active ? (previous.stretchStart ?? tick) : now;
 const elapsed = Math.max(0, Math.floor((now - tick) / 1000));
 const remaining = Math.max(0, LIVE_STRETCH_CAP_SECONDS - Math.floor((tick - stretchStart) / 1000));
 return {stretchStart, credited: previous.active ? Math.min(elapsed, remaining) : 0};
}
export function periodCredit(tick: number, credited: number, periodStart: number) {
 return Math.max(0, Math.floor((tick + credited * 1000 - Math.max(tick, periodStart)) / 1000));
}
