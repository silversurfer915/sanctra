export type SyllabusConfidence = 'low' | 'medium' | 'high';

export interface SyllabusTopic {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: number;
  revisionCount: number; // 0 for unrevised, 1 for 1st revision, etc.
  lastRevisedAt?: number;
  targetRevisionDate?: string; // YYYY-MM-DD local date
  confidence?: SyllabusConfidence;
  notes?: string;
}

export interface SyllabusUnit {
  id: string;
  title: string;
  topics: SyllabusTopic[];
}

export interface SyllabusSubject {
  id: string;
  title: string;
  color?: string;
  units: SyllabusUnit[];
}

export interface SyllabusCourse {
  id: string;
  title: string;
  category: 'learning' | 'work' | 'custom';
  subjects: SyllabusSubject[];
  createdAt: number;
  updatedAt: number;
}

export interface SyllabusState {
  enabled: boolean;
  activeCourseId?: string;
  courses: SyllabusCourse[];
}
