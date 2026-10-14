import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { getApps, deleteApp } from 'firebase/app';
import {
  initFirebaseAI,
  DEFAULT_AI_FIREBASE_CONFIG,
  DEFAULT_AI_MODEL,
  getAIInstance,
  getAIModel,
  generateText,
  generateTextStream,
  startStudyChat,
  breakdownStudyTopic,
  analyzeStudyPacing,
  checkAILogicHealth,
  convertStudyPlanToTasks,
  generateStudyPlanSchedule,
  insertTasksIntoStorage,
  generateAndInsertStudyTasks,
  type StudyPlan,
} from '../src/utils/aiLogic.ts';
import type { TaskItem } from '../src/types/index.ts';

test('DEFAULT_AI_FIREBASE_CONFIG has valid projectId and appId', () => {
  assert.equal(DEFAULT_AI_FIREBASE_CONFIG.projectId, 'studyapp-4137d');
  assert.equal(DEFAULT_AI_FIREBASE_CONFIG.appId, '1:504558100883:web:13ccbd5473080ed70a4866');
  assert.equal(DEFAULT_AI_FIREBASE_CONFIG.apiKey, 'AIzaSyBTUqltCcKKfAYczmy5qvl8RBCz8uskPy0');
  assert.equal(DEFAULT_AI_MODEL, 'gemini-3.8-flash');
});

test('initFirebaseAI initializes app and returns AI instance', () => {
  const { app, ai } = initFirebaseAI();
  assert.ok(app, 'Firebase app should be defined');
  assert.ok(ai, 'AI instance should be defined');
  assert.equal(getAIInstance(), ai);
});

test('getAIModel returns GenerativeModel configured for Gemini 3.8 Flash', () => {
  const model = getAIModel();
  assert.ok(model, 'GenerativeModel should be defined');
  assert.ok(model.model.includes('gemini-3.8-flash'), `Model name should include gemini-3.8-flash: ${model.model}`);
});

test('startStudyChat creates a session with memory tracking', () => {
  const session = startStudyChat({
    systemInstruction: 'You are a test tutor.',
    history: [{ role: 'user', parts: [{ text: 'Hello' }] }],
  });
  assert.ok(session, 'Chat session should be created');
  assert.equal(session.getHistory().length, 1);
  assert.equal(session.getHistory()[0].parts[0].text, 'Hello');
});

test('convertStudyPlanToTasks converts study plan into scheduled TaskItems', () => {
  const mockPlan: StudyPlan = {
    subject: 'Organic Chemistry',
    targetDate: '2026-10-20',
    dailyFocusRecommendationMinutes: 90,
    pacingStrategy: 'Active recall and reaction mechanisms',
    milestones: [
      {
        dayOrWeek: 'Day 1',
        focusTopic: 'Electrophilic Addition',
        tasks: ['Review alkene mechanism rules', 'Complete Markovnikov problem set'],
        estimatedMinutes: 80,
      },
      {
        dayOrWeek: 'Day 2',
        focusTopic: 'Nucleophilic Substitution',
        tasks: ['SN1 vs SN2 kinetics review'],
        estimatedMinutes: 50,
      },
    ],
  };

  const tasks = convertStudyPlanToTasks(mockPlan, {
    startDate: '2026-10-05',
    preferredStartTime: '10:00',
    subjectId: 'sub-chem-1',
  });

  assert.equal(tasks.length, 3);
  const task1 = tasks[0];
  assert.ok(task1.id.startsWith('task-ai-'));
  assert.equal(task1.dueDate, '2026-10-05');
  assert.equal(task1.startTime, '10:00');
  assert.ok(task1.endTime && task1.endTime > '10:00');
  assert.equal(task1.completed, false);
  assert.equal(task1.subjectId, 'sub-chem-1');
  assert.ok(task1.text.includes('Electrophilic Addition'));

  // Day 2 task
  const task3 = tasks[2];
  assert.equal(task3.dueDate, '2026-10-06');
  assert.ok(task3.text.includes('Nucleophilic Substitution'));
});

test('insertTasksIntoStorage safely merges and stores task items', () => {
  const sampleTask: TaskItem = {
    id: `test-task-${Date.now()}`,
    text: 'Test AI scheduled task',
    completed: false,
    dueDate: '2026-10-05',
    category: 'today',
    createdAt: Date.now(),
  };

  const updatedTasks = insertTasksIntoStorage([sampleTask]);
  assert.ok(Array.isArray(updatedTasks));
  assert.ok(updatedTasks.some((t) => t.id === sampleTask.id));
});

test('Firebase AI Logic generates content and passes live health check', async () => {
  const health = await checkAILogicHealth();
  assert.ok(health.ok, `AI logic health check should succeed: ${health.message}`);
  assert.equal(health.model, 'gemini-3.8-flash');

  const text = await generateText('Say the word "SANCTRA_TEST_SUCCESS" only.', {
    temperature: 0.1,
    maxOutputTokens: 250,
  });
  assert.ok(text.includes('SANCTRA_TEST_SUCCESS'), `Generated text should contain expected keyword: ${text}`);
});

test('Firebase AI Logic streaming yields non-empty chunks', async () => {
  const chunks: string[] = [];
  const full = await generateTextStream(
    'Count: 1, 2, 3',
    (chunk) => {
      chunks.push(chunk);
    },
    { temperature: 0.1, maxOutputTokens: 250 },
  );

  assert.ok(chunks.length > 0, 'Stream should receive at least 1 chunk');
  assert.ok(full.length > 0, 'Full response should be accumulated');
});

test('breakdownStudyTopic returns valid structured modules', async () => {
  const breakdown = await breakdownStudyTopic('Basic Calculus - Derivatives', 2);
  assert.ok(breakdown.topic.length > 0);
  assert.ok(breakdown.modules.length > 0);
  const first = breakdown.modules[0];
  assert.ok(first.title);
  assert.ok(typeof first.estimatedMinutes === 'number');
  assert.ok(['easy', 'medium', 'hard'].includes(first.difficulty));
});

test('generateStudyPlanSchedule and generateAndInsertStudyTasks produce tasks with dates and times', async () => {
  const result = await generateAndInsertStudyTasks({
    subject: 'Thermodynamics',
    targetDate: '2026-10-15',
    startDate: '2026-10-06',
    dailyFocusHours: 2,
    preferredDailyStartTime: '09:00',
    subjectId: 'sub-physics-1',
  });

  assert.ok(result.plan.subject);
  assert.ok(result.newTasks.length >= 3, `Expected at least 3 tasks, got ${result.newTasks.length}`);

  const firstTask = result.newTasks[0];
  assert.ok(firstTask.text);
  assert.ok(firstTask.dueDate);
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(firstTask.dueDate), `Invalid dueDate: ${firstTask.dueDate}`);
  assert.ok(firstTask.startTime);
  assert.ok(firstTask.endTime);
  assert.equal(firstTask.completed, false);
  assert.equal(firstTask.subjectId, 'sub-physics-1');

  // Verify inserted tasks are in allTasks
  assert.ok(result.allTasks.some((t) => t.id === firstTask.id));
});

test('analyzeStudyPacing produces cognitive pacing assessment', async () => {
  const advice = await analyzeStudyPacing({
    totalFocusMinutes: 150,
    breakMinutes: 10,
    sessionCount: 5,
    targetDailyGoalMinutes: 180,
  });

  assert.ok(
    ['optimal', 'moderate_fatigue', 'high_burnout_risk'].includes(advice.cognitiveLoadAssessment),
    `Invalid assessment: ${advice.cognitiveLoadAssessment}`,
  );
  assert.ok(advice.recommendation.length > 0);
  assert.ok(advice.suggestedNextBreakMinutes > 0);
  assert.ok(advice.nextFocusBlockMinutes > 0);
});

after(async () => {
  const apps = getApps();
  await Promise.all(apps.map((app) => deleteApp(app)));
  setTimeout(() => process.exit(0), 100);
});
