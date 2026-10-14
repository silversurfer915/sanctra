import type {StudySession} from '../types/index.ts';
import type {IntegrityClock} from './studyIntegrity.ts';
import {integrityPeriods} from './studyIntegrity.ts';
import {recordedFocus} from './competitiveRankings.ts';

export const HISTORICAL_RANKING_CUTOFF = Date.parse('2026-10-03T09:24:50.857Z');

/**
 * Deduct only verified duration that was actually counted towards the integrity clock.
 * Manual records added after the cutoff never earned rank.
 * Resolves Bug 17 (deleting a session deducts its full saved duration instead of verified duration).
 */
export function rankingAfterDeletion(clock:IntegrityClock, session:StudySession, now=Date.now()) {
 const periods = integrityPeriods(now);
 const excluded = session.id.startsWith('sess-manual-') && session.endTime > HISTORICAL_RANKING_CUTOFF;
 const verifiedSeconds = Math.max(0, session.rankingDurationSeconds ?? session.durationSeconds);
 const original = { ...session, durationSeconds: verifiedSeconds };
 return Object.fromEntries((['day','week','month'] as const).map(period => {
  const key = `${period}Seconds` as const;
  const rawDeduction = !excluded && clock[`${period}Start`] === periods[`${period}Start`]
    ? recordedFocus([original], new Date(now), period)
    : 0;
  // Cap deduction at what is actually present in the clock score so uncredited time is not deducted
  const deduction = Math.min(clock[key], rawDeduction);
  return [key, Math.max(0, clock[key] - deduction)];
 })) as Pick<IntegrityClock, 'daySeconds'|'weekSeconds'|'monthSeconds'>;
}

/** Subtract only the server receipt's actual period credits, even after personal edits. */
export function rankingAfterManualDeletion(clock:IntegrityClock,proof:Record<string,unknown>) {
 return Object.fromEntries((['day','week','month'] as const).map(period=>{
  const key=`${period}Seconds` as const;
  const credited=proof[`${period}Start`]===clock[`${period}Start`]?Math.max(0,Number(proof[`credited${period[0].toUpperCase()+period.slice(1)}Seconds`])||0):0;
  return [key,Math.max(0,clock[key]-credited)];
 })) as Pick<IntegrityClock,'daySeconds'|'weekSeconds'|'monthSeconds'>;
}
