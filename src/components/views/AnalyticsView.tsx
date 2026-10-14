import {JeeAnalyticsSummary} from '../jeetrack/JeeAnalyticsSummary.tsx';
import type {JeeSyllabus,JeeTest,JeeChapter} from '../../types/jeetrack.ts';
import {DateControl} from '../ui/DateControl.tsx';
import {SelectControl} from '../ui/SelectControl.tsx';
import { FocusChart, GoalRing } from '../analytics/FocusChart.tsx';
import { useMemo, useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Plus, Pencil, Trash2 } from 'lucide-react';
import type { StudySession, Subject, UserSettings } from '../../types/index.ts';
import { buildPeriodAnalytics, shiftPeriod, type AnalyticsPeriod } from '../../utils/analytics.ts';
import { formatDurationHuman, getLocalDateString } from '../../utils/time.ts';
import { SessionDetails } from '../analytics/SessionDetails.tsx';
interface AnalyticsViewProps {
  jeeSyllabus?:JeeSyllabus;jeeTests?:JeeTest[];onOpenJeeHours?:()=>void;
  sessions: StudySession[]; subjects: Subject[]; settings: UserSettings;
  onOpenGoalModal: () => void; onOpenManualModal: (session?: StudySession) => void; onDeleteSession: (id: string) => void;
}
const duration = (seconds: number) => formatDurationHuman(Math.round(seconds));
export function AnalyticsView({ jeeSyllabus,jeeTests=[],onOpenJeeHours, sessions, subjects, settings, onOpenGoalModal, onOpenManualModal, onDeleteSession }: AnalyticsViewProps) {
  const [kind, setKind] = useState<AnalyticsPeriod>('week');
  const [anchor, setAnchor] = useState(new Date());
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [chapterFilter,setChapterFilter]=useState('all');
  const [activityFilter,setActivityFilter]=useState('all');
  const chapterName=(s:StudySession)=>s.jee?jeeSyllabus?.[s.jee.subject].find(c=>c.id===s.jee?.chapterId)?.name:undefined;
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(10);
  const [deleteCandidate, setDeleteCandidate] = useState<StudySession | null>(null);

  useEffect(() => {
    if (!deleteCandidate) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDeleteCandidate(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteCandidate]);
  const filtered = useMemo(()=>sessions.filter(s=>(subjectFilter==='all'||(s.subjectId||'untagged')===subjectFilter)&&(chapterFilter==='all'||`${s.jee?.subject}:${s.jee?.chapterId}`===chapterFilter)&&(activityFilter==='all'||s.jee?.kind===activityFilter)),[sessions,subjectFilter,chapterFilter,activityFilter]);
  const stats = useMemo(()=>buildPeriodAnalytics(filtered,subjects,anchor,kind),[filtered,subjects,anchor,kind]);
  const previous = useMemo(()=>buildPeriodAnalytics(filtered,subjects,shiftPeriod(anchor,kind,-1),kind),[filtered,subjects,anchor,kind]);
  const change = previous.totalSeconds ? Math.round((stats.totalSeconds/previous.totalSeconds-1)*100) : null;
  const goal = settings.dailyGoalHours*3600;
  const goalDays = stats.days.filter(d=>goal>0&&d.seconds>=goal).length;
  const elapsedDays=stats.days.filter(d=>+d.date<=Date.now());
  const goalPercent=goal>0&&stats.daysElapsed ? Math.round(goalDays/stats.daysElapsed*100) : 0;
  const todayStats=buildPeriodAnalytics(sessions,subjects,new Date(),'day');
  const todayPercent=goal>0 ? todayStats.totalSeconds/goal*100 : 0;
  const cumulative=stats.hours.map((_,index)=>stats.hours.slice(0,index+1).reduce((a,b)=>a+b,0));
  const history = stats.sessions.filter(s=>`${s.subjectName||''} ${s.notes||''} ${s.mode} ${chapterName(s)||''} ${s.jee?.kind||''}`.toLowerCase().includes(query.toLowerCase()));
  const names = [...new Map([...subjects,...sessions.filter(s=>s.subjectId).map(s=>({id:s.subjectId!,name:s.subjectName||'Earlier subject'}))].map(s=>[s.id,s.name])).entries()];
  const label = kind==='day' ? stats.start.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'}) : kind==='month' ? stats.start.toLocaleDateString(undefined,{month:'long',year:'numeric'}) : `${stats.start.toLocaleDateString(undefined,{month:'short',day:'numeric'})} – ${new Date(+stats.end-1).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}`;
  const navigate = (date: Date, nextKind=kind) => {setAnchor(date);setKind(nextKind);setVisibleCount(10);};
  return <section className="analytics-view w-full max-w-6xl mx-auto py-6 space-y-5">
    <header className="flex flex-wrap justify-between items-center gap-4"><div><p className="text-xs tracking-[.2em] uppercase mb-2" style={{color:'var(--sanctra-sage)'}}>Your focus, understood</p><h1 className="font-display text-3xl sm:text-4xl">Find your rhythm.</h1><p className="text-sm text-slate-300 mt-2">Explore your days, compare your weeks, and see the bigger picture.</p></div><button className="analytics-button" onClick={()=>onOpenManualModal()}><Plus size={16}/>Add session</button></header>
    <div className="analytics-toolbar">
      <div className="analytics-toolbar-inner">
        {/* Left: Capitalized Segmented Period Switcher (Day, Week, Month) */}
        <div className="analytics-toolbar-section analytics-toolbar-left">
          <div className="analytics-period-segment" role="tablist" aria-label="Analytics period">
            {(['day', 'week', 'month'] as const).map(p => {
              const isActive = kind === p;
              const formattedLabel = p.charAt(0).toUpperCase() + p.slice(1);
              return (
                <button
                  key={p}
                  role="tab"
                  type="button"
                  aria-selected={isActive}
                  aria-pressed={isActive}
                  className={`analytics-period-tab ${isActive ? 'active' : ''}`}
                  onClick={() => navigate(anchor, p)}
                >
                  {formattedLabel}
                </button>
              );
            })}
          </div>
        </div>

        {/* Center: Mathematically Centered Date Navigation Capsule & Capitalized Current Period Button */}
        <div className="analytics-toolbar-section analytics-toolbar-center">
          <div className="analytics-date-capsule">
            <button
              type="button"
              className="analytics-capsule-arrow"
              aria-label={`Previous ${kind}`}
              onClick={() => navigate(shiftPeriod(anchor, kind, -1))}
            >
              <ArrowLeft size={15} />
            </button>
            <DateControl
              label="Analytics date"
              value={getLocalDateString(anchor)}
              onChange={value => navigate(new Date(`${value}T12:00:00`))}
            />
            <button
              type="button"
              className="analytics-capsule-arrow"
              aria-label={`Next ${kind}`}
              onClick={() => navigate(shiftPeriod(anchor, kind, 1))}
            >
              <ArrowRight size={15} />
            </button>
          </div>
          <button
            type="button"
            className="analytics-current-btn"
            onClick={() => navigate(new Date())}
          >
            Current {kind.charAt(0).toUpperCase() + kind.slice(1)}
          </button>
        </div>

        {/* Right: Subject Filter Dropdown */}
        <div className="analytics-toolbar-section analytics-toolbar-right">
          <SelectControl
            label="Filter analytics by subject"
            value={subjectFilter}
            onChange={value => {
              setSubjectFilter(value);
              setVisibleCount(10);
            }}
            options={[
              { value: 'all', label: 'All subjects' },
              { value: 'untagged', label: 'Untagged' },
              ...names.map(([id, name]) => ({ value: id, label: name })),
            ]}
          />
        </div>
      </div>
    </div>
    {jeeSyllabus&&<div className="analytics-card p-4 flex flex-wrap gap-3"><SelectControl label="JEE chapter" value={chapterFilter} onChange={setChapterFilter} options={[{value:'all',label:'All chapters'},...Object.entries(jeeSyllabus).flatMap(([subject,chapters])=>chapters.map((c:JeeChapter)=>({value:`${subject}:${c.id}`,label:c.name})))]}/><SelectControl label="JEE activity" value={activityFilter} onChange={setActivityFilter} options={[{value:'all',label:'All activities'},{value:'lecture',label:'Lecture'},{value:'practice',label:'Practice'},{value:'revision',label:'Revision'},{value:'mockAnalysis',label:'Mock analysis'}]}/></div>}
    {jeeSyllabus&&<JeeAnalyticsSummary tests={jeeTests} start={stats.start} end={stats.end}/>}
    <div><h2 className="text-xl font-display">{label}</h2><p className="text-xs text-slate-300 mt-1">Local time · {subjectFilter==='all'?'All saved subjects':'Filtered subject'} · {stats.daysElapsed} elapsed {stats.daysElapsed===1?'day':'days'}</p></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[
      ['Focused time',duration(stats.totalSeconds),change===null?'No focus recorded in previous period':`${change>=0?'+':''}${change}% vs previous ${kind}`],
      ['Sessions',String(stats.sessionCount),`${duration(stats.averageSession)} average session`],
      ['Active days',String(stats.activeDays),`Days with saved focus out of ${stats.daysElapsed} elapsed days`],
      ['Daily average',duration(stats.dailyAverage),`${duration(stats.activeDayAverage)} per active day`]
    ].map(([title,value,detail])=><div key={title} className="analytics-card p-5"><p className="text-xs text-slate-300 uppercase tracking-wider">{title}</p><p className="text-2xl font-medium tabular-nums mt-3">{value}</p><p className="text-xs text-slate-300 mt-2">{detail}</p></div>)}</div>
    <div className="analytics-card p-5"><h2 className="font-display text-xl mb-4">What your record says</h2>{stats.sessionCount?<div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">{[
      ['Strongest day',`${stats.bestDay.date.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})} · ${duration(stats.bestDay.seconds)}`],
      ['Longest session',duration(stats.longestSession)],['Typical session',`${duration(stats.medianSession)} median`],
      ['Most focused hour',stats.peakHour===null?'—':`${String(stats.peakHour).padStart(2,'0')}:00 – ${String(stats.peakHour+1).padStart(2,'0')}:00`]
    ].map(([title,value])=><div key={title}><p className="text-xs text-slate-300 mb-2">{title}</p><p className="text-sm font-medium">{value}</p></div>)}</div>:<p className="text-sm text-slate-300">No saved focus in this period. Choose an earlier date or save your next session.</p>}</div>
    <div className="grid md:grid-cols-2 gap-4">
      <div className="analytics-card p-5 flex items-center gap-5"><GoalRing percent={todayPercent} label="goal"/><div className="flex-1"><h2 className="font-display text-xl">Today’s goal progress</h2><p className="text-sm mt-2">{duration(todayStats.totalSeconds)} <span className="text-slate-300">of {duration(goal)}</span></p><p className="text-xs text-slate-300 mt-2">All subjects · saved focus today</p><button className="text-xs mt-3" style={{color:'var(--sanctra-sage)'}} onClick={onOpenGoalModal}>Adjust daily goal</button></div></div>
      <div className="analytics-card p-5 flex items-center gap-5"><GoalRing percent={goalPercent} label="goal days"/><div><h2 className="font-display text-xl">Daily goals reached</h2><p className="text-sm mt-2">{goalDays} of {stats.daysElapsed} elapsed days</p><p className="text-xs text-slate-300 mt-2">A day counts when saved focus reaches {duration(goal)}. Future dates are excluded.{subjectFilter!=='all'?' Uses the selected subject only.':''}</p></div></div>
    </div>
    <div className="grid lg:grid-cols-[1.5fr_1fr] gap-4">
      <div className="analytics-card p-5 min-w-0"><h2 className="font-display text-xl">{kind==='day'?'Your day, hour by hour':kind==='week'?'Weekly focus trend':'Monthly focus trend'}</h2><p className="text-xs text-slate-300 mt-2">{kind==='day'?'Cumulative focused time across the day.':'Saved focus for each elapsed date. Choose a day in the calendar for its sessions.'}</p>
      <FocusChart title={kind==='day'?'Cumulative focus by local hour':'Daily focus trend'} values={kind==='day'?cumulative:(elapsedDays.length?elapsedDays.map(d=>d.seconds):[0])} labels={kind==='day'?stats.hours.map((_,h)=>`${String(h).padStart(2,'0')}:00`):(elapsedDays.length?elapsedDays.map(d=>kind==='week'?d.date.toLocaleDateString(undefined,{weekday:'short'}):String(d.day)):['Future'])}/>
      {kind!=='day'&&<div className="mt-5 pt-4 border-t border-white/10"><div className="grid grid-cols-7 gap-2 mb-2">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day=><span key={day} className="text-[10px] text-slate-300 text-center">{day}</span>)}</div><div className="grid grid-cols-7 gap-2">{Array.from({length:(stats.start.getDay()+6)%7},(_,i)=><div key={`blank-${i}`}/>)}{stats.days.map(d=>{const future=+d.date>Date.now();return <button key={+d.date} aria-label={`${d.date.toLocaleDateString()}: ${duration(d.seconds)}, view day`} onClick={()=>navigate(d.date,'day')} className="focus-calendar-day rounded-xl p-2 text-center border border-white/10 hover:border-white/40" style={{background:d.seconds?`color-mix(in srgb,var(--sanctra-sage) ${Math.round(10+30*Math.min(1,d.seconds/(goal||3600)))}%,transparent)`:'transparent',opacity:future?.35:1}}><span className="block text-xs font-medium">{d.day}</span><span className="block text-[9px] mt-1 text-slate-300">{future?'—':d.seconds?duration(d.seconds):'No focus'}</span>{goal>0&&d.seconds>=goal&&<span className="text-[9px]">Goal ✓</span>}</button>;})}</div><p className="text-[10px] text-slate-300 mt-3">Brighter cells = more focus · Goal ✓ = daily target reached · — = future date</p></div>}
      </div>
      <div className="analytics-card p-5"><h2 className="font-display text-xl mb-5">Where your focus went</h2>{stats.subjects.length?stats.subjects.map(s=><div key={s.id} className="mb-5"><div className="flex justify-between text-sm gap-3 mb-2"><span>{s.name}</span><span className="text-slate-300">{duration(s.seconds)} · {Math.round(s.seconds/stats.totalSeconds*100)}%</span></div><div className="h-2 bg-white/10 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${s.seconds/stats.totalSeconds*100}%`,background:`color-mix(in srgb, ${s.color} 65%, var(--sanctra-sage))`}}/></div></div>):<p className="text-sm text-slate-300">Subject insights appear after you save focus time.</p>}<h3 className="text-sm font-medium mt-6 mb-3">Timer modes</h3>{!stats.modes.length&&<p className="analytics-empty-note">Save a session to see which timer modes support your focus.</p>}{stats.modes.map(m=><p key={m.mode} className="flex justify-between text-xs text-slate-300 py-2"><span>{m.mode.replaceAll('-',' ')}</span><span>{duration(m.seconds)}</span></p>)}</div>
    </div>
    <p className="text-xs text-slate-300">Insights use saved focused time. Sessions crossing midnight are apportioned between dates; hourly and daily distribution is estimated because individual pauses aren’t timestamped. Full session durations remain visible below. Previous-period comparisons use the complete previous {kind}.</p>
    <div className="analytics-card p-5"><div className="flex flex-wrap justify-between gap-4 mb-4"><div><h2 className="font-display text-xl">Session history</h2><p className="text-xs text-slate-300 mt-1">{history.length} sessions overlapping this {kind} · Times shown in your local timezone</p></div><input aria-label="Search session notes or subjects" placeholder="Search subjects or notes" className="analytics-select max-w-full" value={query} onChange={e=>{setQuery(e.target.value);setVisibleCount(10);}}/></div>{history.length?history.slice(0,visibleCount).map(s=><article key={s.id} className="border-t border-white/10 py-5 flex items-start gap-3"><div className="flex-1 min-w-0">{s.jee&&<p className="text-xs text-sky-100 mb-2">{chapterName(s)||'Chapter removed'} · {s.jee.kind}{s.jee.questions!==undefined?` · ${s.jee.questions} questions`:''}</p>}<SessionDetails session={{...s,subjectName:subjects.find(x=>x.id===s.subjectId)?.name||s.subjectName}}/></div>{s.id.startsWith('jee.hours.')?<button className="analytics-button" onClick={onOpenJeeHours}>Edit JEE hours</button>:<><button className="analytics-icon" aria-label={`Edit session from ${new Date(s.startTime).toLocaleDateString()}`} onClick={()=>onOpenManualModal(s)}><Pencil size={15}/></button><button className="analytics-icon" aria-label={`Delete session from ${new Date(s.startTime).toLocaleDateString()}`} onClick={()=>setDeleteCandidate(s)}><Trash2 size={15}/></button></>}</article>):<p className="text-sm text-slate-300 py-8 text-center">No sessions match this date range or search.</p>}{history.length>visibleCount&&<button className="analytics-button mt-4" onClick={()=>setVisibleCount(v=>v+20)}>Show more sessions</button>}</div>
    {deleteCandidate&&<div onClick={(e)=>{if(e.target===e.currentTarget)setDeleteCandidate(null);}} className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"><div className="glass-modal rounded-2xl p-6 max-w-sm" role="dialog" aria-modal="true" aria-labelledby="delete-session-title"><h2 id="delete-session-title" className="text-lg">Delete this session?</h2><p className="text-sm text-slate-300 mt-2">This removes {duration(deleteCandidate.durationSeconds)} from your record.</p><div className="flex gap-3 mt-5"><button className="analytics-button" onClick={()=>setDeleteCandidate(null)}>Keep session</button><button className="analytics-button" onClick={()=>{onDeleteSession(deleteCandidate.id);setDeleteCandidate(null);}}>Delete session</button></div></div></div>}
  </section>;
}
