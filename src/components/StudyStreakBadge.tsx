import {Flame} from 'lucide-react';
export function StudyStreakBadge({days}:{days:number}) {
 return <span className="group-streak" title="At least one hour of saved study per day. Personal history streak; does not affect ranked time." aria-label={`${days} day study streak`}><Flame size={12} aria-hidden="true"/>{days} day{days===1?'':'s'} streak</span>;
}
