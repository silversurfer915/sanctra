export type JeeExamType = 'mains' | 'advanced';
export type JeeSubject = 'physics' | 'chemistry' | 'maths';
export type JeeTestType = 'full' | 'partial';
export type JeePaperType = 'p1' | 'p2' | 'combined';

export interface JeeChapterMistake {subject:JeeSubject;chapterId:number;mistakes:number;reason?:string}

export interface JeeTest {
  durationMinutes?:number;
  attempted?:number;
  unattempted?:number;
  chapterMistakes?:JeeChapterMistake[];
  id: string;
  exam: JeeExamType;
  session?: string; // e.g. "Mock #1", "Allen Major 2", "AITS 1"
  paper?: JeePaperType; // for Advanced
  type: JeeTestType;
  date: string; // YYYY-MM-DD
  total: number;
  max: number;
  physics: number;
  chemistry: number;
  maths: number;
  notes?: string;
  source?: string;
}

export interface JeeUpcomingTest {
  id: string;
  exam: JeeExamType;
  session: string;
  type: JeeTestType;
  date: string;
  venue?: string;
  notes?: string;
}

export interface JeeChapter {
  id: number;
  name: string;
  theory: boolean;
  practice: boolean;
  class: '11' | '12';
  unit: string;
  section?: 'physical' | 'inorganic' | 'organic';
  revisions?: number;
  adv?: boolean;
}

export interface JeeSyllabus {
  physics: JeeChapter[];
  chemistry: JeeChapter[];
  maths: JeeChapter[];
}

export interface JeeBacklog {
  id: string;
  title: string;
  subject: JeeSubject;
  priority: 'high' | 'med' | 'low';
  due?: string;
  details?: string;
  done: boolean;
  addedDate: string;
  doneDate?: string;
}

export interface JeePracticeLog {
  id: string;
  subject: JeeSubject;
  chapterId: number;
  chapterName: string;
  questions: number;
  date: string;
  loggedAt: number;
  notes?: string;
}

export interface JeeStudyHour {
  id: string;
  date: string;
  subject: JeeSubject | 'all';
  lecture: number;
  practice: number;
  revision: number;
  mockAnalysis: number;
  chapterId?: number;
  source?: 'timer' | 'manual';
  sourceSessionId?: string;
  sessionId?: string;
  total: number;
  notes?: string;
}

export interface JeeAiInsightItem {
  title: string;
  tag: string;
  type: 'strength' | 'weakness' | 'warning' | 'tip';
  body: string;
  metric?: string;
}

export interface JeeAiInsightsResult {
  overallVerdict: string;
  momentum: 'increasing' | 'stable' | 'decreasing' | 'critical';
  score: number; // 0 to 100
  insights: JeeAiInsightItem[];
  actionPlan: string[];
  generatedAt: string;
}

export interface JeeTrackState {
  tests: JeeTest[];
  upcoming: JeeUpcomingTest[];
  hours: JeeStudyHour[];
  backlogs: JeeBacklog[];
  practiceLogs: JeePracticeLog[];
  syllabus: JeeSyllabus;
  backlogStreak: number;
  backlogBestStreak: number;
  lastBLClear?: string | null;
  weeklyPracticeGoal: number; // e.g. 350 questions
  targetYear: string;
  profile?: { classLevel: '11' | '12' | 'dropper'; studyMode: 'self' | 'coaching' | 'both'; coaching: string; targetMainsMarks?: number; targetAdvancedMarks?: number };
  examDates?: { mainsJan?: string; mainsApr?: string; advanced?: string };
  targetPercentile?: number; // e.g. 99.5
  insights?: JeeAiInsightsResult | null;
}

export type JeeTrackSubTab = 
  | 'overview' 
  | 'tests' 
  | 'syllabus' 
  | 'practice' 
  | 'backlog' 
  | 'insights' 
  | 'hours'
  | 'tasks';
