import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractRetiredExamData } from '../scripts/lib/exam-archive.mjs';

const stringValue = (value: string) => ({ stringValue: value });

test('extracts exact retired exam fields and dependent session goal links', () => {
  const user = {
    name: 'projects/example/databases/(default)/documents/users/user-1',
    createTime: '2026-01-01T00:00:00.000Z',
    updateTime: '2026-10-09T00:00:00.000Z',
    fields: {
      examGoal: { mapValue: { fields: { id: stringValue('exam-1'), name: stringValue('Finals') } } },
      examGoals: { arrayValue: { values: [{ mapValue: { fields: { id: stringValue('exam-1') } } }] } },
      settings: {
        mapValue: {
          fields: {
            targetExam: stringValue('Finals'),
            targetExamDate: stringValue('2026-12-01'),
            studyDetails: { mapValue: { fields: { grade: stringValue('Year 2'), city: stringValue('Pune') } } },
            workspaces: {
              arrayValue: {
                values: [
                  { mapValue: { fields: { id: stringValue('space-1'), targetExam: stringValue('Finals'), name: stringValue('Main') } } },
                ],
              },
            },
          },
        },
      },
      sessions: {
        arrayValue: {
          values: [
            { mapValue: { fields: { id: stringValue('session-1'), goalId: stringValue('exam-1'), subjectId: stringValue('math') } } },
            { mapValue: { fields: { id: stringValue('session-2'), subjectId: stringValue('physics') } } },
          ],
        },
      },
      tasks: { arrayValue: { values: [{ mapValue: { fields: { id: stringValue('task-1'), text: stringValue('Keep private') } } }] } },
    },
  };

  const group = {
    name: 'projects/example/databases/(default)/documents/study_groups/group-1',
    updateTime: '2026-10-09T00:00:00.000Z',
    fields: {
      targetExam: stringValue('General Milestone'),
      name: stringValue('Do not export this name'),
    },
  };

  const archive = extractRetiredExamData({ users: [user], studyGroups: [group] });

  assert.deepEqual(archive.users[0], {
    document: user.name,
    createTime: user.createTime,
    updateTime: user.updateTime,
    fields: {
      examGoal: user.fields.examGoal,
      examGoals: user.fields.examGoals,
      settings: {
        targetExam: user.fields.settings.mapValue.fields.targetExam,
        targetExamDate: user.fields.settings.mapValue.fields.targetExamDate,
        studyDetails: { grade: user.fields.settings.mapValue.fields.studyDetails.mapValue.fields.grade },
        workspaces: [
          {
            index: 0,
            id: stringValue('space-1'),
            targetExam: stringValue('Finals'),
          },
        ],
      },
      sessionGoalLinks: [
        {
          index: 0,
          id: stringValue('session-1'),
          goalId: stringValue('exam-1'),
        },
      ],
    },
  });
  assert.deepEqual(archive.studyGroups[0].fields, { targetExam: group.fields.targetExam });
  assert.equal(JSON.stringify(archive).includes('Keep private'), false);
  assert.equal(JSON.stringify(archive).includes('Do not export this name'), false);
  assert.deepEqual(archive.counts, {
    usersScanned: 1,
    usersArchived: 1,
    groupsScanned: 1,
    groupsArchived: 1,
    sessionGoalLinks: 1,
  });
});

test('omits documents without retired exam data', () => {
  const archive = extractRetiredExamData({
    users: [{ name: 'users/plain', fields: { settings: { mapValue: { fields: { timezone: stringValue('UTC') } } } } }],
    studyGroups: [{ name: 'study_groups/plain', fields: { topic: stringValue('Reading') } }],
  });

  assert.deepEqual(archive.users, []);
  assert.deepEqual(archive.studyGroups, []);
});
