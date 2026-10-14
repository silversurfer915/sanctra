export interface JeeSessionTag {subject:'physics'|'chemistry'|'maths';chapterId:number;kind:'lecture'|'practice'|'revision'|'mockAnalysis';questions?:number}
export type WorkspaceKind = 'competitive' | 'learning' | 'work' | 'meditation';
export interface FocusWorkspace {
  id: string; name: string; kind: WorkspaceKind; createdAt: number;
  archived?: boolean; activeSubjectId?: string; dailyGoalHours?: number; weeklyTargetHours?: number;
  rankingOptIn?: boolean;
}

export interface Subject {
  workspaceId?: string;
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

export type TimerMode = 
  | 'countup'
  | 'pomodoro-25'
  | 'pomodoro-50'
  | 'pomodoro-90'
  | 'pomodoro-custom'
  | 'countdown-60'
  | 'countdown-120'
  | 'custom';

export type TimerStatus = 
  | 'idle' 
  | 'running' 
  | 'paused' 
  | 'break-ready' 
  | 'break-paused'
  | 'break-running' 
  | 'break-complete';

export type ViewMode = 'landing' | 'timer' | 'analytics' | 'planner' | 'calendar' | 'groups' | 'inbox' | 'profile' | 'support' | 'admin' | 'rankings' | 'spaces' | 'jeetrack';

export interface StudySession {
  timeOfDayUnknown?:boolean;
  jee?:JeeSessionTag;
  source?: 'ai-manual';
  strictMode?: boolean;
  rankingCapped?: boolean;
  workspaceId?: string;
  workspaceName?: string;
  id: string;
  subjectId?: string;
  subjectName?: string;
  subjectColor?: string;
  startTime: number;
  endTime: number;
  durationSeconds: number; // Pure focused time (excluding pauses/breaks)
  rankingDurationSeconds?: number; // Preserve original timer duration across personal-history edits.
  mode: TimerMode;
  notes?: string;
  date: string; // YYYY-MM-DD local date
  syllabusCourseId?: string;
  syllabusTopicId?: string;
  syllabusTopicTitle?: string;
}

export type ThemeId =
  | 'violet-night'
  | 'ocean-teal'
  | 'midnight-blue'
  | 'rose-dusk'
  | 'forest-mist';

export interface WallpaperPreset {
  id: string;
  name: string;
  category: string;
  type?: 'scenic' | 'motion' | 'weather';
  url: string;
  thumbnail: string;
  isPlusOnly?: boolean;
  motionType?: 'nebula' | 'rain' | 'aurora' | 'embers' | 'sakura';
  motionUrl?: string;
  weatherType?: 'rain' | 'mist' | 'lake';
}

export interface AvatarPreset {
  id: string;
  name: string;
  subtitle: string;
  url: string;
  isPlusOnly?: boolean;
  mood?: string;
}


export interface PomodoroConfig {
  focusMinutes:number;
  shortBreakMinutes:number;
  longBreakMinutes:number;
  sessionsBeforeLongBreak:number;
}

export interface UserSettings {
  jeeTrackOptIn?:boolean;
  pomodoroConfig?:PomodoroConfig;
  workspaces?: FocusWorkspace[];
  activeWorkspaceId?: string;
  legacyWorkspaceId?: string;
  dailyGoalHours: number;
  weeklyTargetHours: number;
  subjectTrackingEnabled: boolean;
  activeSubjectId?: string;
  activeWallpaperId: string;
  activeThemeId?: ThemeId;
  themeSceneMode?: 'follow' | 'custom';
  appearanceChosen?: boolean;
  customWallpaperUrl?: string;
  wallpaperFitMode: 'fill' | 'fit';
  uiGlassBlur?: number; // 0–24px, separate from wallpaper dimness
  studyDetails?: {country?:string;city?:string;status?:string;stream?:string};
  backgroundDimness: number; // 0 to 100 percentage
  timezone?: string;
  focusIntent?: 'competitive' | 'learning' | 'work' | 'meditation';
  rankingOptIn?: boolean;
  bio?: string;
  statusMessage?: string;
  avatarUrl?: string;
  customDisplayName?: string;
  plusAvatarEffect?: 'celestial' | 'aurora' | 'lotus' | 'quill' | 'none';
  plusProfileFrame?: 'golden-thread' | 'emerald-halo' | 'celestial-dots' | 'obsidian-glass' | 'none';
  plusProfileScene?: 'cloister' | 'observatory' | 'pavilion' | 'none';
  showPlusBadge?: boolean;
  plusAnimatedAvatarUrl?: string;
  plusProfileCoverUrl?: string;
  plusMotionWallpaperUrl?: string;
  plusMotionWallpaperEnabled?: boolean;
  soundAlertsEnabled?: boolean;
  strictMode?: boolean;
  soundscapePreferences?: {activeSoundscape: string|null;volume:number;playWithTimer:boolean;fadeOnEnd:boolean};
  soundLibrary?: {id:string;title:string;url:string}[];
  syllabusEnabled?: boolean;
  updatedAt?: number;
}

export interface TimerDraft {
  sessionId?: string;
  jee?:JeeSessionTag;
  rankingCapped?: boolean;
  strictMode?: boolean;
  workspaceId?: string;
  version?: 2;
  sessionStartTime?: number;
  mode: TimerMode;
  status: TimerStatus;
  accumulatedSeconds: number;
  runningSince: number | null; // Timestamp if running, null if paused/idle
  targetSeconds: number; // Countdown target or 0 for countup
  breakSeconds: number;
  pomodoroConfig?:PomodoroConfig;
  pomodoroCompletedSessions?:number;
  subjectId?: string;
  lastUpdated: number;
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
}

export interface TaskItem {
  jee?: JeeSessionTag;
  completeJeeChapter?: boolean;
  completedAt?: number;
  workspaceId?: string;
  startTime?: string; // HH:mm local time on dueDate
  endTime?: string;
  id: string;
  text: string;
  completed: boolean;
  dueDate: string; // YYYY-MM-DD
  category: 'today' | 'backlog' | 'unscheduled';
  subjectId?: string;
  syllabusCourseId?: string;
  syllabusTopicId?: string;
  syllabusTopicTitle?: string;
  createdAt: number;
}

export * from './subscription.ts';
export * from './syllabus.ts';
