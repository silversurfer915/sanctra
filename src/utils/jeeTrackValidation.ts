import type { JeeTrackState, JeeStudyHour, JeeSubject } from '../types/jeetrack.ts';
import { getDefaultJeeTrackState, localJeeDate } from './jeetrackData.ts';
const subjects = ['physics','chemistry','maths'];
const object = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown, max = 2000) => typeof v === 'string' && v.length <= max;
const number = (v: unknown, min=0, max=100000) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
export function validJeeDate(v: unknown): v is string {
  if(typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T12:00:00Z`); return !Number.isNaN(d.getTime()) && d.toISOString().slice(0,10) === v;
}
function fail(message: string): never { throw new Error(message); }
const optionalText = (v: unknown) => v === undefined || text(v);
const allowed = (value: Record<string,any>, keys: string[]) => Object.keys(value).every(key=>keys.includes(key));
const recordKeys: Record<string,string[]> = {tests:['durationMinutes','attempted','unattempted','chapterMistakes','id','exam','session','paper','type','date','total','max','physics','chemistry','maths','notes','source'],upcoming:['id','exam','session','type','date','venue','notes'],hours:['id','date','subject','lecture','practice','revision','mockAnalysis','total','notes','chapterId','source','sourceSessionId','sessionId'],backlogs:['id','title','subject','priority','due','details','done','addedDate','doneDate'],practiceLogs:['id','subject','chapterId','chapterName','questions','date','loggedAt','notes']};
const id = (v: unknown) => text(v,160) && /^[a-zA-Z0-9_.:-]+$/.test(v as string);
export function validateJeeTrackState(input: unknown): JeeTrackState {
  if(!object(input)) fail('Backup must contain a preparation record.');
  if(new TextEncoder().encode(JSON.stringify(input)).byteLength>2_000_000)fail('Preparation data exceeds the 2 MB backup limit.');
  const base = getDefaultJeeTrackState();
  for(const key of ['tests','upcoming','hours','backlogs','practiceLogs'] as const) {
    if(!Array.isArray(input[key]) || input[key].length > 2000) fail(`Invalid or oversized ${key}.`);
    const seen = new Set<string>();
    for(const r of input[key]) {
      if(!object(r) || !id(r.id) || seen.has(r.id) || !allowed(r,recordKeys[key])) fail(`Invalid or duplicate ${key} record.`);
      seen.add(r.id);
      if(!optionalText(r.notes) || !optionalText(r.details)) fail('Notes are too long.');
      if(key === 'tests') {
        if(!['mains','advanced'].includes(r.exam) || !['full','partial'].includes(r.type) || !validJeeDate(r.date) || !number(r.max,1,2000) || !number(r.total,-r.max,r.max) || ![r.physics,r.chemistry,r.maths].every(v=>number(v,-r.max,r.max)) || Math.abs(r.total-r.physics-r.chemistry-r.maths)>0.01 || (r.paper !== undefined && !['p1','p2','combined'].includes(r.paper)) || !optionalText(r.session) || !optionalText(r.source)) fail('Invalid mock score, total, paper or date.');
        if(r.durationMinutes!==undefined&&!number(r.durationMinutes,1,600)||r.attempted!==undefined&&(!Number.isInteger(r.attempted)||!number(r.attempted,0,300))||r.unattempted!==undefined&&(!Number.isInteger(r.unattempted)||!number(r.unattempted,0,300)))fail('Invalid mock duration or question counts.');
        if(r.chapterMistakes!==undefined&&(!Array.isArray(r.chapterMistakes)||r.chapterMistakes.length>8||r.chapterMistakes.some((m:any)=>!object(m)||!allowed(m,['subject','chapterId','mistakes','reason'])||!subjects.includes(m.subject)||!Number.isInteger(m.chapterId)||m.chapterId<1||!Number.isInteger(m.mistakes)||!number(m.mistakes,1,300)||!optionalText(m.reason))))fail('Invalid chapter mistakes.');
        if(r.chapterMistakes&&new Set(r.chapterMistakes.map((m:any)=>`${m.subject}:${m.chapterId}`)).size!==r.chapterMistakes.length)fail('Combine mistakes for the same chapter into one entry.');
      } else if(key === 'upcoming') {
        if(!['mains','advanced'].includes(r.exam) || !['full','partial'].includes(r.type) || !validJeeDate(r.date) || !text(r.session,200) || !optionalText(r.venue)) fail('Invalid scheduled mock.');
      } else if(key === 'hours') {
        if(!validJeeDate(r.date) || ![...subjects,'all'].includes(r.subject) || ![r.lecture,r.practice,r.revision,r.mockAnalysis].every(v=>number(v,0,24)) || !number(r.total,0,24) || Math.abs(r.total-r.lecture-r.practice-r.revision-r.mockAnalysis)>0.00001 || (r.chapterId !== undefined && (!Number.isInteger(r.chapterId)||r.chapterId<1)) || (r.sourceSessionId!==undefined&&!id(r.sourceSessionId)) || (r.sessionId!==undefined&&!id(r.sessionId)) || (r.source !== undefined && !['timer','manual'].includes(r.source))) fail('Invalid study hours. Each entry must be at most 24 hours.');
      } else if(key === 'practiceLogs') {
        if(!validJeeDate(r.date) || !subjects.includes(r.subject) || !Number.isInteger(r.chapterId) || !text(r.chapterName,200) || !Number.isInteger(r.questions) || !number(r.questions,1,10000) || !number(r.loggedAt,0,1e15)) fail('Invalid practice entry.');
      } else if(!subjects.includes(r.subject) || !text(r.title,200) || !r.title.trim() || !['high','med','low'].includes(r.priority) || typeof r.done !== 'boolean' || !validJeeDate(r.addedDate) || (r.due !== undefined && !validJeeDate(r.due)) || (r.doneDate !== undefined && !validJeeDate(r.doneDate))) fail('Invalid backlog.');
    }
  }
  if(!object(input.syllabus)) fail('Missing syllabus.');
  for(const subject of subjects) {
    const list = input.syllabus[subject];
    if(!Array.isArray(list) || list.length > 250) fail('Invalid chapter list.');
    const seen = new Set<number>();
    for(const c of list) {
      if(!object(c) || !allowed(c,['id','name','theory','practice','class','unit','section','revisions','adv']) || !Number.isInteger(c.id) || c.id<1 || seen.has(c.id) || !text(c.name,200) || !c.name.trim() || !['11','12'].includes(c.class) || !text(c.unit,200) || typeof c.theory !== 'boolean' || typeof c.practice !== 'boolean' || (c.revisions !== undefined && (!Number.isInteger(c.revisions)||!number(c.revisions,0,10000))) || (c.section !== undefined && !['physical','inorganic','organic'].includes(c.section)) || (c.adv !== undefined && typeof c.adv !== 'boolean')) fail('Invalid chapter.');
      seen.add(c.id);
    }
  }
  if(!text(input.targetYear,4) || !/^20\d{2}$/.test(input.targetYear) || !Number.isInteger(input.weeklyPracticeGoal) || !number(input.weeklyPracticeGoal,0,10000) || (input.targetPercentile !== undefined && !number(input.targetPercentile,0,100))) fail('Invalid preparation target.');
  if(input.profile !== undefined) {
    const p = input.profile;
    if(!object(p) || !allowed(p,['classLevel','studyMode','coaching','targetMainsMarks','targetAdvancedMarks']) || !['11','12','dropper'].includes(p.classLevel) || !['self','coaching','both'].includes(p.studyMode) || !text(p.coaching,200) || (p.targetMainsMarks !== undefined && !number(p.targetMainsMarks,0,300)) || (p.targetAdvancedMarks !== undefined && !number(p.targetAdvancedMarks,0,2000))) fail('Invalid preparation profile.');
  }
  if(input.examDates !== undefined && (!object(input.examDates) || !allowed(input.examDates,['mainsJan','mainsApr','advanced']) || Object.values(input.examDates).some(d=>d!==undefined && !validJeeDate(d)))) fail('Invalid personal exam target date.');
  // Strip unknown object keys and cached AI claims by serializing only the supported state.
  const result: JeeTrackState = {...base, tests:structuredClone(input.tests), upcoming:structuredClone(input.upcoming), hours:structuredClone(input.hours), backlogs:structuredClone(input.backlogs), practiceLogs:structuredClone(input.practiceLogs), syllabus:structuredClone(input.syllabus) as JeeTrackState['syllabus'], weeklyPracticeGoal:input.weeklyPracticeGoal, targetYear:input.targetYear, ...(input.profile?{profile:structuredClone(input.profile)}:{}), ...(input.examDates?{examDates:structuredClone(input.examDates)}:{}), ...(input.targetPercentile!==undefined?{targetPercentile:input.targetPercentile}:{})};
  // Extend older backups with newly verified preparation topics without replacing saved progress.
  for(const subject of subjects as JeeSubject[]) {
    const existing=new Set(result.syllabus[subject].map(c=>c.id));
    for(const chapter of base.syllabus[subject])if(!existing.has(chapter.id))result.syllabus[subject].push(chapter);
    if(result.syllabus[subject].length>250)fail('Chapter list exceeds the supported limit.');
  }
  return deriveJeeStreaks(result);
}
export function deriveJeeStreaks(state: JeeTrackState, today = localJeeDate()): JeeTrackState {
  const days = [...new Set(state.backlogs.filter(b=>b.done && validJeeDate(b.doneDate)).map(b=>b.doneDate!))].sort();
  let run=0,best=0,last:string|null=null;
  for(const date of days) { run=last && (Date.parse(`${date}T12:00:00Z`)-Date.parse(`${last}T12:00:00Z`))===86400000?run+1:1; best=Math.max(best,run);last=date; }
  const difference=last ? (Date.parse(`${today}T12:00:00Z`)-Date.parse(`${last}T12:00:00Z`))/86400000 : Infinity;
  return {...state,backlogStreak:difference>=0 && difference<=1?run:0,backlogBestStreak:best,lastBLClear:last};
}
export function importJeeTrackData(json: string): JeeTrackState | null {
  try { if(json.length > 2_000_000 || new TextEncoder().encode(json).byteLength > 2_000_000) return null; const p=JSON.parse(json); return validateJeeTrackState(p.state ?? p); } catch { return null; }
}
export function exportJeeTrackData(state: JeeTrackState): string { return JSON.stringify({format:'sanctra-jeetrack',version:2,exportedAt:new Date().toISOString(),state:validateJeeTrackState(state)},null,2); }
// Only exact original demo records are removed; edited or user-created records survive.
const seedNames: Record<string,string> = {'demo-m-1':'Allen Major Test 1','demo-m-2':'FIITJEE AITS 1','demo-m-3':'NTA Full Mock 1','demo-adv-1':'Allen Score Advance #1','up-1':'Allen Major Test 2','up-2':'Catalyzer Adv Paper 1 & 2','bl-1':'Rotational Dynamics — HC Verma Ch 10 Solved Examples','bl-2':'Coordination Compounds — NCERT Line by Line & Isomerism','bl-3':'Definite Integration — Properties 4, 5 & King Rule DPP','bl-4':'Thermodynamics — Carnot Engine & Entropy formulas','pl-1':'Laws of Motion','pl-2':'Quadratic Equation','pl-3':'Chemical Equilibrium','h-1':'Morning Mechanics revision and numerical solving','h-2':'Calculus problem sets and speed drill'};
function isOriginalSeed(r: Record<string, any>): boolean {
  if(!seedNames[r.id] || seedNames[r.id] !== (r.session ?? r.title ?? r.chapterName ?? r.notes))return false;
  const expected: Record<string, Record<string,unknown>> = {
    'demo-m-1':{total:168,physics:62,chemistry:64,maths:42,date:'2026-09-15',max:300,notes:'Maths length took extra time in Calculus'},
    'demo-m-2':{total:184,physics:70,chemistry:68,maths:46,date:'2026-09-28',max:300,notes:'Physics Mechanics felt comfortable; revised rotational motion'},
    'demo-m-3':{total:204,physics:76,chemistry:72,maths:56,date:'2026-10-06',max:300,notes:'Crossed 200 threshold! Strong accuracy in Physical Chem'},
    'demo-adv-1':{total:152,physics:58,chemistry:52,maths:42,date:'2026-10-02',max:360,notes:'Multi-correct choices had partial markings'},
    'up-1':{venue:'Allen Center / CBT',notes:'Full 11th + 12th syllabus revision test',exam:'mains',type:'full'},
    'up-2':{venue:'Home CBT',notes:'Targeting 180+ combined score',exam:'advanced',type:'full'},
    'pl-1':{questions:45,chapterId:105,notes:'Solved HC Verma Level 1 & 2'},
    'pl-2':{questions:35,chapterId:301,notes:'Location of roots & Common root conditions'},
    'pl-3':{questions:50,chapterId:204,notes:'Le Chatelier principle & Kp/Kc conversion'},
    'h-1':{total:5.5,lecture:2,practice:2.5,revision:1,mockAnalysis:0},
    'h-2':{total:5,lecture:1.5,practice:3,revision:0.5,mockAnalysis:0},
    'bl-1':{done:false,addedDate:'2026-10-01',details:'Focus on angular momentum conservation and rolling without slipping'},
    'bl-2':{done:false,addedDate:'2026-10-03',details:'CFT crystal field splitting energy calculations'},
    'bl-3':{done:false,addedDate:'2026-10-05',details:'Complete 30 PYQs from 2021-2024'},
    'bl-4':{done:true,addedDate:'2026-09-25',doneDate:'2026-09-29',details:'Short notes revision completed'},
  };
  return Object.entries(expected[r.id]??{}).every(([key,value])=>r[key]===value);
}
export function sanitizeLegacyJeeState(state: JeeTrackState): JeeTrackState {
  const next=structuredClone(state);
  for(const key of ['tests','upcoming','hours','backlogs','practiceLogs'] as const) (next[key] as unknown[])=(state[key] as any[]).filter(r=>!isOriginalSeed(r));
  // Seeded completion flags cannot safely be distinguished from subsequent real work. Keep them for user review.
  return deriveJeeStreaks({...next,insights:null});
}
export function upsertTimerJeeHour(state: JeeTrackState, hour: JeeStudyHour): JeeTrackState {
  const source = hour.sourceSessionId ?? hour.sessionId;
  if(!source) throw new Error('Timer entry requires a source session.');
  const next = {...hour,id:`timer:${source}`,source:'timer' as const,sourceSessionId:source};
  return {...state,hours:[...state.hours.filter(h=>(h.sourceSessionId ?? h.sessionId)!==source),next]};
}
export type JeeCloudRecord = {kind:string; value:any};
export function flattenJeeState(state: JeeTrackState): Map<string,JeeCloudRecord> {
  const records=new Map<string,JeeCloudRecord>();
  for(const key of ['tests','upcoming','hours','backlogs','practiceLogs'] as const) for(const r of state[key]) records.set(`${key}_${r.id}`,{kind:key,value:r});
  for(const subject of subjects as JeeSubject[]) for(const chapter of state.syllabus[subject]) records.set(`chapter_${subject}_${chapter.id}`,{kind:'chapter',value:{subject,...chapter}});
  for(const key of ['weeklyPracticeGoal','targetYear','targetPercentile','profile','examDates'] as const) if(state[key]!==undefined) records.set(`preference_${key}`,{kind:'preference',value:{key,value:state[key]}});
  return records;
}
export function inflateJeeRecords(records: Map<string,JeeCloudRecord>): JeeTrackState {
  const state=getDefaultJeeTrackState();
  for(const r of records.values()) {
    if(['tests','upcoming','hours','backlogs','practiceLogs'].includes(r.kind)) (state as any)[r.kind].push(r.value);
    else if(r.kind==='chapter' && subjects.includes(r.value.subject)) {
      const {subject,...chapter}=r.value; const list=state.syllabus[subject as JeeSubject];const index=list.findIndex(c=>c.id===chapter.id); if(index>=0) list[index]=chapter;else list.push(chapter);
    } else if(r.kind==='preference' && ['weeklyPracticeGoal','targetYear','targetPercentile','profile','examDates'].includes(r.value.key)) (state as any)[r.value.key]=r.value.value;
  }
  return validateJeeTrackState(state);
}
