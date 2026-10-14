import type {PomodoroConfig} from '../types/index.ts';
export const POMODORO_PRESETS: PomodoroConfig[] = [
 {focusMinutes:25,shortBreakMinutes:5,longBreakMinutes:15,sessionsBeforeLongBreak:4},
 {focusMinutes:50,shortBreakMinutes:10,longBreakMinutes:30,sessionsBeforeLongBreak:4},
 {focusMinutes:90,shortBreakMinutes:20,longBreakMinutes:40,sessionsBeforeLongBreak:4},
];
export function normalizePomodoroConfig(value?:Partial<PomodoroConfig>|null):PomodoroConfig {
 const defaults=POMODORO_PRESETS[0];
 const integer=(key:keyof PomodoroConfig,max:number)=>Number.isInteger(value?.[key])&&value![key]!>=1&&value![key]!<=max?value![key]!:defaults[key];
 return {focusMinutes:integer('focusMinutes',240),shortBreakMinutes:integer('shortBreakMinutes',120),longBreakMinutes:integer('longBreakMinutes',240),sessionsBeforeLongBreak:integer('sessionsBeforeLongBreak',12)};
}
export function isPomodoroMode(mode:string):boolean {return ['pomodoro-25','pomodoro-50','pomodoro-90','pomodoro-custom'].includes(mode);}
export function pomodoroBreakSeconds(config:PomodoroConfig,completedSessions:number):number {
 return (completedSessions>0&&completedSessions%config.sessionsBeforeLongBreak===0?config.longBreakMinutes:config.shortBreakMinutes)*60;
}
