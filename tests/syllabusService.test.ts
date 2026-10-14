import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeNextRevisionDate,
  calculateCourseAnalytics,
  getDueRevisions,
  toggleTopicCompletion,
  recordTopicRevision,
  addSubjectToCourse,
  addUnitToSubject,
  addTopicToUnit,
  deleteTopicFromCourse,
  exportCourseToJson,
  importCourseFromJson,
} from '../src/utils/syllabusService.ts';
import type { SyllabusCourse } from '../src/types/syllabus.ts';

test('computeNextRevisionDate adheres to spaced repetition intervals', () => {
  const base = new Date('2026-10-02T00:00:00Z');
  // 0 revisions -> +3 days -> 2026-10-05
  assert.equal(computeNextRevisionDate(0, base), '2026-10-05');
  // 1 revision -> +7 days -> 2026-10-09
  assert.equal(computeNextRevisionDate(1, base), '2026-10-09');
  // 2 revisions -> +14 days -> 2026-10-16
  assert.equal(computeNextRevisionDate(2, base), '2026-10-16');
  // 3 revisions -> +30 days -> 2026-11-01
  assert.equal(computeNextRevisionDate(3, base), '2026-11-01');
});

test('calculateCourseAnalytics calculates accurate completion, revision and mastery', () => {
  const course: SyllabusCourse = {
    id: 'c1',
    title: 'Test Course',
    category: 'learning',
    createdAt: 1000,
    updatedAt: 1000,
    subjects: [
      {
        id: 's1',
        title: 'Subject 1',
        units: [
          {
            id: 'u1',
            title: 'Unit 1',
            topics: [
              { id: 't1', title: 'Top 1', completed: true, revisionCount: 2, targetRevisionDate: '2026-10-01' },
              { id: 't2', title: 'Top 2', completed: true, revisionCount: 1, targetRevisionDate: '2026-10-05' },
              { id: 't3', title: 'Top 3', completed: false, revisionCount: 0 },
              { id: 't4', title: 'Top 4', completed: false, revisionCount: 0 },
            ],
          },
        ],
      },
    ],
  };

  const stats = calculateCourseAnalytics(course, '2026-10-02');
  assert.equal(stats.totalTopics, 4);
  assert.equal(stats.completedTopics, 2);
  assert.equal(stats.revisedTopics, 2);
  assert.equal(stats.masteredTopics, 1);
  assert.equal(stats.completionPct, 50); // 2/4 = 50%
  assert.equal(stats.revisionPct, 50);   // 2/4 = 50%
  assert.equal(stats.masteryPct, 25);    // 1/4 = 25%
  assert.equal(stats.dueTopicsCount, 1); // '2026-10-01' is <= '2026-10-02'
});

test('getDueRevisions finds overdue and due topics sorted by urgency', () => {
  const course: SyllabusCourse = {
    id: 'c1',
    title: 'Test Course',
    category: 'learning',
    createdAt: 1000,
    updatedAt: 1000,
    subjects: [
      {
        id: 's1',
        title: 'Polity',
        units: [
          {
            id: 'u1',
            title: 'Constitution',
            topics: [
              { id: 't1', title: 'Fundamental Rights', completed: true, revisionCount: 1, targetRevisionDate: '2026-09-28' }, // 4 days overdue
              { id: 't2', title: 'Preamble', completed: true, revisionCount: 0, targetRevisionDate: '2026-10-02' }, // due today
              { id: 't3', title: 'Judiciary', completed: true, revisionCount: 2, targetRevisionDate: '2026-10-10' }, // future
            ],
          },
        ],
      },
    ],
  };

  const due = getDueRevisions(course, '2026-10-02');
  assert.equal(due.length, 2);
  assert.equal(due[0].topic.id, 't1');
  assert.equal(due[0].isOverdue, true);
  assert.equal(due[1].topic.id, 't2');
  assert.equal(due[1].isOverdue, false);
});

test('toggleTopicCompletion updates topic status and sets initial revision suggestion', () => {
  const course: SyllabusCourse = {
    id: 'c1',
    title: 'Test',
    category: 'custom',
    createdAt: 1000,
    updatedAt: 1000,
    subjects: [
      {
        id: 's1',
        title: 'Sub',
        units: [
          {
            id: 'u1',
            title: 'Unit',
            topics: [
              { id: 't1', title: 'Topic 1', completed: false, revisionCount: 0 },
            ],
          },
        ],
      },
    ],
  };

  const updated = toggleTopicCompletion(course, 't1', new Date('2026-10-02T12:00:00Z').getTime());
  const topic = updated.subjects[0].units[0].topics[0];
  assert.equal(topic.completed, true);
  assert.equal(topic.targetRevisionDate, '2026-10-05'); // +3 days
});

test('recordTopicRevision increments count and advances revision interval', () => {
  const course: SyllabusCourse = {
    id: 'c1',
    title: 'Test',
    category: 'custom',
    createdAt: 1000,
    updatedAt: 1000,
    subjects: [
      {
        id: 's1',
        title: 'Sub',
        units: [
          {
            id: 'u1',
            title: 'Unit',
            topics: [
              { id: 't1', title: 'Topic 1', completed: true, revisionCount: 1, targetRevisionDate: '2026-10-02' },
            ],
          },
        ],
      },
    ],
  };

  const revised = recordTopicRevision(course, 't1', undefined, new Date('2026-10-02T12:00:00Z').getTime());
  const topic = revised.subjects[0].units[0].topics[0];
  assert.equal(topic.revisionCount, 2);
  assert.equal(topic.targetRevisionDate, '2026-10-16'); // 2nd revision -> +14 days
});

test('structural additions and deletions maintain integrity', () => {
  let course: SyllabusCourse = {
    id: 'c1',
    title: 'Empty Course',
    category: 'custom',
    createdAt: 1000,
    updatedAt: 1000,
    subjects: [],
  };

  course = addSubjectToCourse(course, 'Algorithms', '#B7CDEA');
  assert.equal(course.subjects.length, 1);
  const subId = course.subjects[0].id;

  course = addUnitToSubject(course, subId, 'Graph Theory');
  assert.equal(course.subjects[0].units.length, 1);
  const unitId = course.subjects[0].units[0].id;

  course = addTopicToUnit(course, unitId, 'Dijkstra Algorithm');
  assert.equal(course.subjects[0].units[0].topics.length, 1);
  const topicId = course.subjects[0].units[0].topics[0].id;

  course = deleteTopicFromCourse(course, topicId);
  assert.equal(course.subjects[0].units[0].topics.length, 0);
});

test('export and import JSON preserves course structure with safety validations', () => {
  const originalCourse: SyllabusCourse = {
    id: 'test-course-id',
    title: 'Distributed Systems',
    category: 'learning',
    createdAt: 1000,
    updatedAt: 1000,
    subjects: [
      {
        id: 'sub-1',
        title: 'Consensus Protocols',
        color: '#B7CDEA',
        units: [
          {
            id: 'unit-1',
            title: 'Paxos & Raft',
            topics: [
              { id: 'top-1', title: 'Leader Election', completed: true, revisionCount: 3, confidence: 'high' },
            ],
          },
        ],
      },
    ],
  };

  const json = exportCourseToJson(originalCourse);
  const imported = importCourseFromJson(json);

  assert.equal(imported.title, 'Distributed Systems');
  assert.equal(imported.category, 'learning');
  assert.equal(imported.subjects.length, 1);
  assert.equal(imported.subjects[0].title, 'Consensus Protocols');
  assert.equal(imported.subjects[0].units[0].topics[0].title, 'Leader Election');
  assert.equal(imported.subjects[0].units[0].topics[0].completed, true);
  assert.equal(imported.subjects[0].units[0].topics[0].revisionCount, 3);
  assert.equal(imported.subjects[0].units[0].topics[0].confidence, 'high');
});
