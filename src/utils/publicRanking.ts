import type {IntegrityClock} from './studyIntegrity.ts';
/** Public competitive totals. Device, timer and anomaly diagnostics stay private. */
export type PublicRanking=Pick<IntegrityClock,'uid'|'registered'|'dayStart'|'weekStart'|'monthStart'|'daySeconds'|'weekSeconds'|'monthSeconds'|'integrityStatus'>;
export function publicRanking(clock:PublicRanking):PublicRanking {
 const {uid,registered,dayStart,weekStart,monthStart,daySeconds,weekSeconds,monthSeconds,integrityStatus}=clock;
 return {uid,registered,dayStart,weekStart,monthStart,daySeconds,weekSeconds,monthSeconds,integrityStatus};
}
