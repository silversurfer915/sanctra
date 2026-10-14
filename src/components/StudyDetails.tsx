import {useEffect,useState,useId} from 'react';
import {MapPin,Globe,GraduationCap,Compass,Check} from 'lucide-react';
import type {UserSettings} from '../types/index.ts';
import {STUDY_STATUSES,STUDY_STREAMS,STUDY_COUNTRIES,studyDetailChoice,cleanStudyDetails,type StudyDetailsData} from '../utils/studyDetailsOptions.ts';
const fields=[{key:'country',label:'Country',icon:Globe},{key:'city',label:'City',icon:MapPin},{key:'status',label:'Current status',icon:GraduationCap,choices:STUDY_STATUSES},{key:'stream',label:'Stream / field',icon:Compass,choices:STUDY_STREAMS}] as const;
export function StudyDetails({settings,onUpdate}:{settings:UserSettings;onUpdate:(patch:Partial<UserSettings>)=>void}){
 const [editing,setEditing]=useState(false),[draft,setDraft]=useState<StudyDetailsData>(settings.studyDetails||{}),[saved,setSaved]=useState(false);
 const [customFields,setCustomFields]=useState<Set<string>>(new Set());
 const countriesId=useId();
 useEffect(()=>{if(!editing)setDraft(settings.studyDetails||{});},[settings.studyDetails,editing]);
 const save=()=>{onUpdate({studyDetails:cleanStudyDetails(draft)});setEditing(false);setSaved(true);};
 return <section className={`workspace-panel study-details ${editing?'is-editing':''}`}><header><div><h2>Your study details</h2><p>Optional and private. Choose what fits, or add your own.</p></div><button type="button" className="analytics-button" onClick={()=>{setDraft(settings.studyDetails||{});setCustomFields(new Set());setEditing(!editing);setSaved(false);}}>{editing?'Cancel':'Edit details'}</button></header><form onSubmit={e=>{e.preventDefault();save();}}><div className="study-details-grid">{fields.map(field=>{
 const Icon=field.icon,value=draft[field.key]||'',choices='choices' in field?field.choices:null;
 const selected=choices?studyDetailChoice(value,choices):'';
 const custom=!!choices&&(selected==='__custom__'||customFields.has(field.key));
 const update=(value:string)=>setDraft(current=>({...current,[field.key]:value}));
 return <div key={field.key} className="study-detail"><Icon size={19}/><div>{editing?<>
 <label htmlFor={`study-detail-${field.key}`}>{field.label}</label>
 {choices?<><select id={`study-detail-${field.key}`} className="inbox-input" value={custom?'__custom__':selected} onChange={e=>{const next=e.target.value;setCustomFields(current=>{const result=new Set(current);if(next==='__custom__')result.add(field.key);else result.delete(field.key);return result;});if(next!=='__custom__')update(next);}}><option value="">Prefer not to say</option>{choices.map(choice=><option key={choice}>{choice}</option>)}<option value="__custom__">Other / enter your own</option></select>{custom&&<label className="study-custom-value">Your {field.label.toLowerCase()}<input className="inbox-input" maxLength={80} value={value} onChange={e=>update(e.target.value)} placeholder="Enter your own"/></label>}</>:<input id={`study-detail-${field.key}`} className="inbox-input" maxLength={80} list={field.key==='country'?countriesId:undefined} autoComplete={field.key==='country'?'country-name':'address-level2'} value={value} onChange={e=>update(e.target.value)} placeholder={field.key==='country'?'Search or enter a country':'Your city'}/>}
 </>:<><small>{field.label}</small><strong>{settings.studyDetails?.[field.key]||'Not set'}</strong></>}</div></div>;
 })}</div><datalist id={countriesId}>{STUDY_COUNTRIES.map(country=><option key={country} value={country}/>)}</datalist>{editing&&<div className="study-details-actions"><span>Update these whenever your plans change.</span><button className="workspace-primary" type="submit">Save study details</button></div>}{saved&&<p role="status"><Check size={15}/>Study details saved.</p>}</form></section>;
}
