import type {
  SyllabusCourse,
  SyllabusSubject,
  SyllabusUnit,
  SyllabusTopic,
  SyllabusState,
} from '../types/syllabus.ts';
import { CURATED_SYLLABUS_TEMPLATES } from './syllabusTemplates.ts';
import { getLocalDateString } from './time.ts';

const SYLLABUS_STORAGE_KEY = 'sanctra_syllabus_state_v1';

export function getDefaultSyllabusState(): SyllabusState {
  return {
    enabled: false,
    activeCourseId: CURATED_SYLLABUS_TEMPLATES[0].id,
    courses: [...CURATED_SYLLABUS_TEMPLATES],
  };
}

export function getStoredSyllabus(): SyllabusState {
  try {
    const raw = localStorage.getItem(SYLLABUS_STORAGE_KEY);
    if (!raw) return getDefaultSyllabusState();
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.courses) || parsed.courses.length === 0) {
      return getDefaultSyllabusState();
    }
    return {
      enabled: Boolean(parsed.enabled),
      activeCourseId: parsed.activeCourseId || parsed.courses[0].id,
      courses: parsed.courses,
    };
  } catch {
    return getDefaultSyllabusState();
  }
}

export function saveStoredSyllabus(state: SyllabusState): void {
  try {
    localStorage.setItem(SYLLABUS_STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save syllabus state', err);
  }
}

/**
 * Computes spaced repetition next revision date based on current revision count.
 * 0 revs: +3 days
 * 1 rev:  +7 days
 * 2 revs: +14 days
 * 3+ revs: +30 days
 */
export function computeNextRevisionDate(currentRevisionCount: number, baseDate = new Date()): string {
  const d = new Date(baseDate.getTime());
  let daysToAdd = 3;
  if (currentRevisionCount === 1) daysToAdd = 7;
  else if (currentRevisionCount === 2) daysToAdd = 14;
  else if (currentRevisionCount >= 3) daysToAdd = 30;

  d.setDate(d.getDate() + daysToAdd);
  return getLocalDateString(d);
}

export interface SyllabusCourseAnalytics {
  totalTopics: number;
  completedTopics: number;
  revisedTopics: number;
  masteredTopics: number; // 2+ revisions
  dueTopicsCount: number;
  completionPct: number;
  revisionPct: number;
  masteryPct: number;
}

export function calculateCourseAnalytics(
  course: SyllabusCourse,
  todayStr = getLocalDateString()
): SyllabusCourseAnalytics {
  let totalTopics = 0;
  let completedTopics = 0;
  let revisedTopics = 0;
  let masteredTopics = 0;
  let dueTopicsCount = 0;

  for (const sub of course.subjects) {
    for (const unit of sub.units) {
      for (const top of unit.topics) {
        totalTopics++;
        if (top.completed) {
          completedTopics++;
        }
        if (top.revisionCount > 0) {
          revisedTopics++;
        }
        if (top.revisionCount >= 2) {
          masteredTopics++;
        }
        if (top.targetRevisionDate && top.targetRevisionDate <= todayStr) {
          dueTopicsCount++;
        }
      }
    }
  }

  const denominator = Math.max(1, totalTopics);
  return {
    totalTopics,
    completedTopics,
    revisedTopics,
    masteredTopics,
    dueTopicsCount,
    completionPct: Math.round((completedTopics / denominator) * 100),
    revisionPct: Math.round((revisedTopics / denominator) * 100),
    masteryPct: Math.round((masteredTopics / denominator) * 100),
  };
}

export interface DueRevisionItem {
  topic: SyllabusTopic;
  unitTitle: string;
  subjectTitle: string;
  subjectColor?: string;
  isOverdue: boolean;
  daysDiff: number;
}

export function getDueRevisions(
  course: SyllabusCourse,
  todayStr = getLocalDateString()
): DueRevisionItem[] {
  const todayTime = new Date(`${todayStr}T00:00:00`).getTime();
  const dueList: DueRevisionItem[] = [];

  for (const sub of course.subjects) {
    for (const unit of sub.units) {
      for (const top of unit.topics) {
        if (top.targetRevisionDate) {
          const targetTime = new Date(`${top.targetRevisionDate}T00:00:00`).getTime();
          const diffDays = Math.round((targetTime - todayTime) / (1000 * 60 * 60 * 24));
          if (diffDays <= 0) {
            dueList.push({
              topic: top,
              unitTitle: unit.title,
              subjectTitle: sub.title,
              subjectColor: sub.color,
              isOverdue: diffDays < 0,
              daysDiff: diffDays,
            });
          }
        }
      }
    }
  }

  // Sort: most overdue first
  return dueList.sort((a, b) => a.daysDiff - b.daysDiff);
}

/**
 * Immutable helpers for updating course contents
 */
export function toggleTopicCompletion(
  course: SyllabusCourse,
  topicId: string,
  now = Date.now()
): SyllabusCourse {
  let updated = false;
  const newSubjects = course.subjects.map((sub) => ({
    ...sub,
    units: sub.units.map((unit) => ({
      ...unit,
      topics: unit.topics.map((t) => {
        if (t.id === topicId) {
          updated = true;
          const nextCompleted = !t.completed;
          return {
            ...t,
            completed: nextCompleted,
            completedAt: nextCompleted ? now : undefined,
            // When marking completed for first time, suggest initial revision in 3 days
            targetRevisionDate:
              nextCompleted && !t.targetRevisionDate
                ? computeNextRevisionDate(0, new Date(now))
                : t.targetRevisionDate,
          };
        }
        return t;
      }),
    })),
  }));

  if (!updated) return course;
  return { ...course, subjects: newSubjects, updatedAt: now };
}

export function recordTopicRevision(
  course: SyllabusCourse,
  topicId: string,
  customNextDate?: string,
  now = Date.now()
): SyllabusCourse {
  let updated = false;
  const newSubjects = course.subjects.map((sub) => ({
    ...sub,
    units: sub.units.map((unit) => ({
      ...unit,
      topics: unit.topics.map((t) => {
        if (t.id === topicId) {
          updated = true;
          const nextRevCount = (t.revisionCount || 0) + 1;
          const nextTarget =
            customNextDate || computeNextRevisionDate(nextRevCount, new Date(now));
          return {
            ...t,
            completed: true, // A revision inherently satisfies completion
            completedAt: t.completedAt || now,
            revisionCount: nextRevCount,
            lastRevisedAt: now,
            targetRevisionDate: nextTarget,
          };
        }
        return t;
      }),
    })),
  }));

  if (!updated) return course;
  return { ...course, subjects: newSubjects, updatedAt: now };
}

export function updateTopicFields(
  course: SyllabusCourse,
  topicId: string,
  patch: Partial<SyllabusTopic>,
  now = Date.now()
): SyllabusCourse {
  const newSubjects = course.subjects.map((sub) => ({
    ...sub,
    units: sub.units.map((unit) => ({
      ...unit,
      topics: unit.topics.map((t) => {
        if (t.id === topicId) {
          return { ...t, ...patch };
        }
        return t;
      }),
    })),
  }));

  return { ...course, subjects: newSubjects, updatedAt: now };
}

export function addTopicToUnit(
  course: SyllabusCourse,
  unitId: string,
  title: string
): SyllabusCourse {
  const now = Date.now();
  const newTopic: SyllabusTopic = {
    id: `top-${now}-${Math.random().toString(36).substring(2, 6)}`,
    title: title.trim(),
    completed: false,
    revisionCount: 0,
  };

  const newSubjects = course.subjects.map((sub) => ({
    ...sub,
    units: sub.units.map((u) => {
      if (u.id === unitId) {
        return { ...u, topics: [...u.topics, newTopic] };
      }
      return u;
    }),
  }));

  return { ...course, subjects: newSubjects, updatedAt: now };
}

export function deleteTopicFromCourse(
  course: SyllabusCourse,
  topicId: string
): SyllabusCourse {
  const now = Date.now();
  const newSubjects = course.subjects.map((sub) => ({
    ...sub,
    units: sub.units.map((u) => ({
      ...u,
      topics: u.topics.filter((t) => t.id !== topicId),
    })),
  }));

  return { ...course, subjects: newSubjects, updatedAt: now };
}

export function addUnitToSubject(
  course: SyllabusCourse,
  subjectId: string,
  unitTitle: string
): SyllabusCourse {
  const now = Date.now();
  const newUnit: SyllabusUnit = {
    id: `unit-${now}-${Math.random().toString(36).substring(2, 6)}`,
    title: unitTitle.trim(),
    topics: [],
  };

  const newSubjects = course.subjects.map((sub) => {
    if (sub.id === subjectId) {
      return { ...sub, units: [...sub.units, newUnit] };
    }
    return sub;
  });

  return { ...course, subjects: newSubjects, updatedAt: now };
}

export function addSubjectToCourse(
  course: SyllabusCourse,
  subjectTitle: string,
  color = '#B7CDEA'
): SyllabusCourse {
  const now = Date.now();
  const newSubject: SyllabusSubject = {
    id: `sub-${now}-${Math.random().toString(36).substring(2, 6)}`,
    title: subjectTitle.trim(),
    color,
    units: [],
  };

  return {
    ...course,
    subjects: [...course.subjects, newSubject],
    updatedAt: now,
  };
}

/**
 * Export course to portable JSON
 */
export function exportCourseToJson(course: SyllabusCourse): string {
  return JSON.stringify(
    {
      format: 'sanctra-syllabus-v1',
      exportedAt: new Date().toISOString(),
      course,
    },
    null,
    2
  );
}

/**
 * Import course with schema validation
 */
export function importCourseFromJson(jsonString: string): SyllabusCourse {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonString);
  } catch (e) {
    throw new Error('Invalid JSON format: Could not parse syllabus file.');
  }

  const rawCourse = parsed.course || parsed;
  if (!rawCourse || typeof rawCourse !== 'object' || !rawCourse.title) {
    throw new Error('Invalid syllabus file: Missing course title or root object.');
  }

  if (!Array.isArray(rawCourse.subjects)) {
    throw new Error('Invalid syllabus file: Missing subjects list.');
  }

  const now = Date.now();
  const importedCourse: SyllabusCourse = {
    id: `course-${now}-${Math.random().toString(36).substring(2, 7)}`,
    title: String(rawCourse.title).slice(0, 150),
    category: ['learning', 'work', 'custom'].includes(rawCourse.category)
      ? rawCourse.category
      : 'custom',
    createdAt: now,
    updatedAt: now,
    subjects: rawCourse.subjects.map((s: any, sIdx: number) => ({
      id: `sub-${now}-${sIdx}`,
      title: String(s.title || `Subject ${sIdx + 1}`).slice(0, 120),
      color: s.color || '#B7CDEA',
      units: Array.isArray(s.units)
        ? s.units.map((u: any, uIdx: number) => ({
            id: `unit-${now}-${sIdx}-${uIdx}`,
            title: String(u.title || `Unit ${uIdx + 1}`).slice(0, 120),
            topics: Array.isArray(u.topics)
              ? u.topics.map((t: any, tIdx: number) => ({
                  id: `top-${now}-${sIdx}-${uIdx}-${tIdx}`,
                  title: String(t.title || `Topic ${tIdx + 1}`).slice(0, 200),
                  completed: Boolean(t.completed),
                  completedAt: t.completedAt ? Number(t.completedAt) : undefined,
                  revisionCount: Math.max(0, Number(t.revisionCount) || 0),
                  lastRevisedAt: t.lastRevisedAt ? Number(t.lastRevisedAt) : undefined,
                  targetRevisionDate: t.targetRevisionDate ? String(t.targetRevisionDate) : undefined,
                  confidence: ['low', 'medium', 'high'].includes(t.confidence) ? t.confidence : undefined,
                  notes: t.notes ? String(t.notes).slice(0, 1000) : undefined,
                }))
              : [],
          }))
        : [],
    })),
  };

  return importedCourse;
}
