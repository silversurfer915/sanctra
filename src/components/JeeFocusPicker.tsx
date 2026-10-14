import type {JeeSessionTag} from '../types/index.ts';
import type {JeeSyllabus} from '../types/jeetrack.ts';
import './jee-focus-picker.css';

export function JeeFocusPicker({syllabus,value,disabled,onChange}:{syllabus:JeeSyllabus;value?:JeeSessionTag;disabled:boolean;onChange:(tag:JeeSessionTag|undefined)=>void}) {
  return <fieldset className="jee-focus-picker" disabled={disabled}>
    <legend>JEE focus</legend>
    <label>Chapter<select aria-label="JEE focus chapter" value={value?`${value.subject}:${value.chapterId}`:''} onChange={event=>{
      if(!event.target.value){onChange(undefined);return;}
      const [subject,id]=event.target.value.split(':') as [JeeSessionTag['subject'],string];
      if(syllabus[subject]?.some(chapter=>chapter.id===Number(id)))onChange({subject,chapterId:Number(id),kind:value?.kind||'practice'});
    }}><option value="">Regular focus · no JEE chapter</option>{(['physics','chemistry','maths'] as const).map(subject=><optgroup key={subject} label={{physics:'Physics',chemistry:'Chemistry',maths:'Mathematics'}[subject]}>{syllabus[subject].map(chapter=><option key={chapter.id} value={`${subject}:${chapter.id}`}>{chapter.name}</option>)}</optgroup>)}</select></label>
    <label>Activity<select aria-label="JEE focus activity" value={value?.kind||'practice'} disabled={!value||disabled} onChange={event=>value&&onChange({...value,kind:event.target.value as JeeSessionTag['kind']})}><option value="lecture">Lecture</option><option value="practice">Practice</option><option value="revision">Revision</option><option value="mockAnalysis">Mock analysis</option></select></label>
    <small>{disabled?'Save or reset before changing the chapter.':value?'Saved focus time counts toward JEE study hours. Enter questions solved when saving a practice session.':'Choose a chapter to connect this session to JEE Track.'}</small>
  </fieldset>;
}
