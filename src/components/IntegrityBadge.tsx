import {ShieldAlert} from 'lucide-react';
import type {IntegrityStatus} from '../utils/studyIntegrity.ts';
export function IntegrityBadge({status}:{status?:IntegrityStatus}) {
 return status&&status!=='clear'?<span className={`integrity-badge ${status}`} title={status==='confirmed'?'An administrator confirmed time manipulation. This account is unranked.':'A timer claim exceeded server elapsed time. Awaiting review; this is not a confirmed cheating finding.'}><ShieldAlert size={12}/>{status==='confirmed'?'Cheating confirmed':'Under review'}</span>:null;
}
