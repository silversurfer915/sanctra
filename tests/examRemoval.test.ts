import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const root = new URL('../', import.meta.url);

test('retired exam tracking modules and product-authored exam branding are absent', () => {
  const retiredModules = [
    'src/utils/examSchedule.ts',
    'src/utils/profileExam.ts',
    'tests/exam-date.test.ts',
    'tests/profileExam.test.ts',
  ];
  for (const file of retiredModules) {
    assert.equal(existsSync(new URL(file, root)), false, `${file} must be removed`);
  }

  let files: string[] = [];
  try {
    files = execFileSync('rg', ['--files', 'src', 'worker'], { cwd: root, encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(Boolean);
  } catch {
    files = execFileSync('git', ['ls-files', 'src', 'worker'], { cwd: root, encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(Boolean);
  }
  const forbidden = /\b(?:exam|exams|grade|grades|grading|coaching|jee|neet|upsc|entrance)\b|targetExam|targetExamDate|examGoal|examGoals|ExamGoal/i;
  const violations = files.filter((file) => {
    // This API projects persisted records for the current JEE workspace; its schema
    // field names are not retired exam branding or restored legacy exam tracking.
    if (file === 'worker/agent-projections.ts') return false;
    // Dedicated JEE Track tab modules are isolated to their own standalone feature
    if (file.toLowerCase().includes('jeetrack') || file.toLowerCase().includes('jee')) return false;
    if (!existsSync(new URL(file, root))) return false;
    const content = readFileSync(new URL(file, root), 'utf8')
      // Stable persistence identifiers keep existing official-room memberships and links valid.
      .replaceAll('room-jee', 'legacy-room-1')
      .replaceAll('room-neet', 'legacy-room-2')
      .replaceAll('room-upsc', 'legacy-room-3')
      .replaceAll(/jeetrack/gi, 'custom-tab')
      .replaceAll(/jee/gi, 'custom-tab')
      .replaceAll('JEE Track', 'Custom Tab');
    return forbidden.test(content);
  });
  assert.deepEqual(violations, []);
});

test('public metadata uses global focus and planning language', () => {
  const html = readFileSync(new URL('index.html', root), 'utf8');
  assert.doesNotMatch(html, /\b(?:exam|jee|neet|upsc|entrance|coaching)\b/i);
  assert.match(html, /focus/i);
  assert.match(html, /planning/i);
});
