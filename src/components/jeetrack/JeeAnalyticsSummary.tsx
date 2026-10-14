import type {JeeTest} from '../../types/jeetrack.ts';
export function JeeAnalyticsSummary({tests,start,end}:{tests:JeeTest[];start:Date;end:Date}) {
 const records=tests.filter(t=>new Date(`${t.date}T12:00:00`)>=start&&new Date(`${t.date}T12:00:00`)<end);
 return <div className="analytics-card p-5"><h2 className="font-display text-xl">Mocks in this period</h2>{records.map(t=><p className="text-sm py-2" key={t.id}>{t.date} · {t.session||'Mock'} · {t.exam==='mains'?'Mains':'Advanced'} · {t.type} · {t.total}/{t.max}{t.durationMinutes?` · ${t.durationMinutes} min`:''}</p>)}{!records.length&&<p className="text-sm mt-2">No mocks logged in this period.</p>}</div>;
}
