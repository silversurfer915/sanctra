import type {PomodoroConfig} from '../types/index.ts';
export function PomodoroFields({value,onChange,idPrefix='pomodoro'}:{value:PomodoroConfig;onChange:(value:PomodoroConfig)=>void;idPrefix?:string}){
 return <div className="pomodoro-fields">{([
 ['focusMinutes','Focus length',240],['shortBreakMinutes','Short break',120],['longBreakMinutes','Long break',240],['sessionsBeforeLongBreak','Sessions before a long break',12]
 ] as const).map(([key,label,max])=><label key={key} htmlFor={`${idPrefix}-${key}`}>{label}<input id={`${idPrefix}-${key}`} type="number" min={1} max={max} step={1} required value={value[key]} onChange={e=>onChange({...value,[key]:Number(e.target.value)})}/></label>)}</div>;
}
