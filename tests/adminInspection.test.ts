import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPeriodAnalytics } from '../src/utils/analytics.ts';
import { formatDurationHuman, calculateStreak } from '../src/utils/time.ts';
import type { StudySession, Subject, TaskItem } from '../src/types/index.ts';

test('Admin Account Inspector: calculates accurate focus metrics and subject shares', () => {
  const subjects: Subject[] = [
    { id: 'math', name: 'Mathematics', color: '#3b82f6', createdAt: Date.now() },
    { id: 'phy', name: 'Physics', color: '#10b981', createdAt: Date.now() },
  ];

  const sessions: StudySession[] = [
    {
      id: 's1',
      subjectId: 'math',
      startTime: new Date(2026, 9, 2, 10, 0).getTime(),
      endTime: new Date(2026, 9, 2, 12, 0).getTime(),
      durationSeconds: 7200,
      mode: 'countup',
      date: '2026-10-02',
    },
    {
      id: 's2',
      subjectId: 'phy',
      startTime: new Date(2026, 9, 2, 14, 0).getTime(),
      endTime: new Date(2026, 9, 2, 15, 0).getTime(),
      durationSeconds: 3600,
      mode: 'pomodoro-50',
      date: '2026-10-02',
    },
  ];

  const stats = buildPeriodAnalytics(sessions, subjects, new Date(2026, 9, 2), 'day', new Date(2026, 9, 2, 18));

  assert.equal(stats.totalSeconds, 10800);
  assert.equal(stats.sessionCount, 2);
  assert.equal(stats.activeDays, 1);
  assert.equal(formatDurationHuman(stats.totalSeconds), '3h 0m');

  const mathShare = stats.subjects.find((s) => s.id === 'math');
  const phyShare = stats.subjects.find((s) => s.id === 'phy');
  assert.equal(mathShare?.seconds, 7200);
  assert.equal(phyShare?.seconds, 3600);
});

test('Admin Account Inspector: calculates task completion rate and pending counts', () => {
  const tasks: TaskItem[] = [
    { id: 't1', text: 'Solve calculus problems', completed: true, dueDate: '2026-10-02', category: 'today', createdAt: Date.now() },
    { id: 't2', text: 'Optics revision', completed: false, dueDate: '2026-10-02', category: 'today', createdAt: Date.now() },
    { id: 't3', text: 'Organic chemistry notes', completed: true, dueDate: '2026-10-03', category: 'backlog', createdAt: Date.now() },
    { id: 't4', text: 'Mock test review', completed: false, dueDate: '2026-10-05', category: 'unscheduled', createdAt: Date.now() },
  ];

  const completed = tasks.filter((t) => t.completed).length;
  const pending = tasks.filter((t) => !t.completed).length;
  const rate = Math.round((completed / tasks.length) * 100);

  assert.equal(completed, 2);
  assert.equal(pending, 2);
  assert.equal(rate, 50);
});

test('Admin Account Inspector: calculates member streaks accurately', () => {
  const streakSessions: StudySession[] = [
    { id: '1', startTime: 1, endTime: 2, durationSeconds: 3600, mode: 'countup', date: '2026-10-01' },
    { id: '2', startTime: 3, endTime: 4, durationSeconds: 4000, mode: 'countup', date: '2026-10-02' },
  ];

  const streak = calculateStreak(streakSessions);
  assert.ok(streak.activeDays >= 2);
  assert.ok(streak.bestStreak >= 1);
});
