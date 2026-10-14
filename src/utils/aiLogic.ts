import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { initAppCheck } from './appCheck.ts';
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  type AI,
  type GenerativeModel,
  type GenerateContentResult,
} from 'firebase/ai';
import type { TaskItem } from '../types/index.ts';
import { getTasks, saveTasks } from './storage.ts';
import { getLocalDateString } from './time.ts';

export interface FirebaseAIConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  measurementId?: string;
}

/**
 * Dedicated Firebase Configuration for Firebase AI Logic in Sanctra.
 */
export const DEFAULT_AI_FIREBASE_CONFIG: FirebaseAIConfig = {
  apiKey: 'AIzaSyBTUqltCcKKfAYczmy5qvl8RBCz8uskPy0',
  authDomain: 'studyapp-4137d.firebaseapp.com',
  projectId: 'studyapp-4137d',
  storageBucket: 'studyapp-4137d.firebasestorage.app',
  messagingSenderId: '504558100883',
  appId: '1:504558100883:web:13ccbd5473080ed70a4866',
  measurementId: 'G-NEBCP98MD6',
};

/**
 * Default supported Gemini model for Firebase AI Logic (Gemini Developer API)
 */
export const DEFAULT_AI_MODEL = 'gemini-3.1-flash-lite';

/**
 * Fallback model for backward compatibility
 */
export const FALLBACK_AI_MODEL = 'gemini-2.5-flash';

/**
 * App Check debug token registered for Sanctra local development & testing
 */
export const REGISTERED_DEV_APP_CHECK_TOKEN = import.meta.env?.DEV ? (import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN || '') : '';

export interface ChatMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

export interface TextGenerationOptions {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
  systemInstruction?: string;
}

export interface TopicModule {
  id: string;
  title: string;
  estimatedMinutes: number;
  difficulty: 'easy' | 'medium' | 'hard';
  keyConcepts: string[];
}

export interface TopicBreakdown {
  topic: string;
  summary: string;
  estimatedTotalHours: number;
  modules: TopicModule[];
}

export interface StudyPlanMilestone {
  dayOrWeek: string;
  focusTopic: string;
  tasks: string[];
  estimatedMinutes: number;
}

export interface StudyPlan {
  subject: string;
  targetDate?: string;
  dailyFocusRecommendationMinutes: number;
  milestones: StudyPlanMilestone[];
  pacingStrategy: string;
}

export interface ScheduledTaskProposal {
  text: string;
  dueDate: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  category?: 'today' | 'backlog' | 'unscheduled';
  estimatedMinutes?: number;
  subjectId?: string;
  milestoneTitle?: string;
}

export interface StudyPlanWithSchedule extends StudyPlan {
  scheduledTasks: ScheduledTaskProposal[];
}

export interface GenerateStudyPlanScheduleParams {
  subject: string;
  targetDate?: string;
  currentTopics?: string[];
  startDate?: string;
  dailyFocusHours?: number;
  preferredDailyStartTime?: string;
  subjectId?: string;
  workspaceId?: string;
}

export interface StudyPlanTaskConversionOptions {
  startDate?: string;
  preferredStartTime?: string;
  defaultTaskMinutes?: number;
  subjectId?: string;
  workspaceId?: string;
}

export interface GenerateAndInsertStudyTasksResult {
  plan: StudyPlan;
  newTasks: TaskItem[];
  allTasks: TaskItem[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface StudyPacingAdvice {
  cognitiveLoadAssessment: 'optimal' | 'moderate_fatigue' | 'high_burnout_risk';
  recommendation: string;
  suggestedNextBreakMinutes: number;
  nextFocusBlockMinutes: number;
}

export interface StudyChatSession {
  sendMessage: (message: string) => Promise<string>;
  sendMessageStream: (message: string, onChunk: (text: string) => void) => Promise<string>;
  getHistory: () => ChatMessage[];
}

// Module singletons
let aiApp: FirebaseApp | null = null;
let aiInstance: AI | null = null;
let activeModelName: string = DEFAULT_AI_MODEL;

/**
 * Initialize Firebase AI Logic service.
 */
export function initFirebaseAI(options?: {
  config?: Partial<FirebaseAIConfig>;
  debugToken?: string;
  forceReinit?: boolean;
}): { app: FirebaseApp; ai: AI } {
  if (aiInstance && aiApp && !options?.forceReinit) {
    return { app: aiApp, ai: aiInstance };
  }

  const mergedConfig: FirebaseAIConfig = {
    ...DEFAULT_AI_FIREBASE_CONFIG,
    ...options?.config,
  };

  // Find or create Firebase App
  const existingApps = getApps();
  const matchedApp = existingApps.find(
    (a) =>
      (a.options.projectId === mergedConfig.projectId && a.options.appId === mergedConfig.appId) ||
      a.name === 'sanctra-ai',
  );

  if (matchedApp && !options?.forceReinit) {
    aiApp = matchedApp;
  } else {
    try {
      if (existingApps.length === 0) {
        aiApp = initializeApp(mergedConfig);
      } else {
        aiApp = initializeApp(mergedConfig, `sanctra-ai-${Date.now()}`);
      }
    } catch {
      aiApp = existingApps[0] || initializeApp(mergedConfig);
    }
  }

  // Initialize or connect App Check
  if (aiApp) {
    initAppCheck(aiApp);
  }

  // Initialize Firebase AI with GoogleAIBackend (Gemini Developer API)
  aiInstance = getAI(aiApp, { backend: new GoogleAIBackend() });

  return { app: aiApp, ai: aiInstance };
}

/**
 * Retrieve the active AI instance, initializing if necessary.
 */
export function getAIInstance(): AI {
  if (!aiInstance) {
    const { ai } = initFirebaseAI();
    return ai;
  }
  return aiInstance;
}

/**
 * Construct a GenerativeModel instance with given options.
 */
export function getAIModel(options?: TextGenerationOptions): GenerativeModel {
  const ai = getAIInstance();
  const model = options?.model || activeModelName;

  return getGenerativeModel(ai, {
    model,
    generationConfig: {
      temperature: options?.temperature ?? 0.7,
      maxOutputTokens: options?.maxOutputTokens ?? 2048,
      topP: options?.topP ?? 0.95,
      topK: options?.topK ?? 40,
    },
    systemInstruction: options?.systemInstruction,
  });
}

/**
 * Set the default model for future requests.
 */
export function setActiveAIModel(modelName: string): void {
  activeModelName = modelName;
}

/**
 * Format errors into human-readable messages.
 */
function normalizeAIError(error: unknown): Error {
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.includes('Firebase App Check token is invalid') || msg.includes('401')) {
      return new Error(
        'Firebase AI Logic Authentication Error: App Check token invalid. Ensure debug token is registered in Firebase Console (Security > App Check).',
      );
    }
    if (msg.includes('404') && msg.includes('no longer available')) {
      return new Error(
        `Firebase AI Logic: Model is retired. Update model to "${DEFAULT_AI_MODEL}". Details: ${msg}`,
      );
    }
    if (msg.includes('429')) {
      return new Error('Firebase AI Logic: Rate limit exceeded. Please wait a moment before trying again.');
    }
    return error;
  }
  return new Error(String(error));
}

/**
 * Generate plain text response from Gemini via Firebase AI Logic or direct API.
 */
export async function generateText(prompt: string, options?: TextGenerationOptions): Promise<string> {

  try {
    const model = getAIModel(options);
    const result: GenerateContentResult = await model.generateContent(prompt);
    const text = result.response.text();
    return text;
  } catch (err) {
    throw normalizeAIError(err);
  }
}

/**
 * Stream text chunks in real-time as they are generated.
 */
export async function generateTextStream(
  prompt: string,
  onChunk: (chunk: string) => void,
  options?: TextGenerationOptions,
): Promise<string> {

  try {
    const model = getAIModel(options);
    const result = await model.generateContentStream(prompt);
    let fullText = '';

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullText += chunkText;
      onChunk(chunkText);
    }

    return fullText;
  } catch (err) {
    throw normalizeAIError(err);
  }
}

/**
 * Initialize a multi-turn conversation session.
 */
export function startStudyChat(options?: {
  systemInstruction?: string;
  history?: ChatMessage[];
  model?: string;
}): StudyChatSession {
  const model = getAIModel({
    model: options?.model,
    systemInstruction:
      options?.systemInstruction ||
      'You are Sanctra Study AI, an intelligent, encouraging, and deeply knowledgeable academic tutor designed to guide students with clear structure and focused discipline.',
  });

  const chatHistory: ChatMessage[] = options?.history ? [...options.history] : [];

  const chat = model.startChat({
    history: chatHistory,
  });

  return {
    async sendMessage(message: string): Promise<string> {
      try {
        const result = await chat.sendMessage(message);
        const text = result.response.text();
        chatHistory.push({ role: 'user', parts: [{ text: message }] });
        chatHistory.push({ role: 'model', parts: [{ text }] });
        return text;
      } catch (err) {
        throw normalizeAIError(err);
      }
    },

    async sendMessageStream(message: string, onChunk: (text: string) => void): Promise<string> {
      try {
        const result = await chat.sendMessageStream(message);
        let fullText = '';
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          fullText += chunkText;
          onChunk(chunkText);
        }
        chatHistory.push({ role: 'user', parts: [{ text: message }] });
        chatHistory.push({ role: 'model', parts: [{ text: fullText }] });
        return fullText;
      } catch (err) {
        throw normalizeAIError(err);
      }
    },

    getHistory(): ChatMessage[] {
      return [...chatHistory];
    },
  };
}

/**
 * Helper to parse JSON output cleanly even if wrapped in markdown code blocks.
 */
function extractAndParseJson<T>(raw: string): T {
  let cleaned = raw.trim();
  // Strip ```json or ``` code fences
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }

  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');

  let targetStart = -1;
  let targetEnd = -1;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    targetStart = firstBrace;
    targetEnd = cleaned.lastIndexOf('}');
  } else if (firstBracket !== -1) {
    targetStart = firstBracket;
    targetEnd = cleaned.lastIndexOf(']');
  }

  if (targetStart !== -1 && targetEnd !== -1 && targetEnd >= targetStart) {
    cleaned = cleaned.substring(targetStart, targetEnd + 1);
  }

  // Remove trailing commas before closing braces/brackets
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // If truncated, attempt to balance unclosed arrays/objects
    let openBraces = 0;
    let openBrackets = 0;
    for (const char of cleaned) {
      if (char === '{') openBraces++;
      else if (char === '}') openBraces--;
      else if (char === '[') openBrackets++;
      else if (char === ']') openBrackets--;
    }
    let patched = cleaned.replace(/,\s*$/, '');
    while (openBrackets > 0) {
      patched += ']';
      openBrackets--;
    }
    while (openBraces > 0) {
      patched += '}';
      openBraces--;
    }
    return JSON.parse(patched) as T;
  }
}

/**
 * Break down a complex study topic into digestible learning modules.
 */
export async function breakdownStudyTopic(topic: string, totalHours = 4): Promise<TopicBreakdown> {
  const prompt = `You are a curriculum designer. Break down the following study topic into a structured study syllabus.
Target Total Study Time: approximately ${totalHours} hours.
Topic: "${topic}"

Return ONLY valid JSON matching this exact structure:
{
  "topic": "${topic}",
  "summary": "Brief 1-2 sentence overview of what this covers",
  "estimatedTotalHours": ${totalHours},
  "modules": [
    {
      "id": "module-1",
      "title": "Module Title",
      "estimatedMinutes": 45,
      "difficulty": "easy",
      "keyConcepts": ["Concept A", "Concept B"]
    }
  ]
}
Ensure difficulty is strictly "easy", "medium", or "hard". Do not include text outside the JSON.`;

  const responseText = await generateText(prompt, { temperature: 0.3 });
  return extractAndParseJson<TopicBreakdown>(responseText);
}

/**
 * Generate a personalized study plan with milestones leading up to a target date.
 */
export async function generateStudyPlan(
  subject: string,
  targetDate?: string,
  currentTopics?: string[],
): Promise<StudyPlan> {
  const topicsContext = currentTopics && currentTopics.length > 0
    ? `Topics to cover: ${currentTopics.join(', ')}`
    : 'Cover the foundational, intermediate, and mastery topics for this subject.';

  const deadlineContext = targetDate
    ? `Target Date: ${targetDate}`
    : 'No strict target date; create an optimal 4-week mastery plan.';

  const prompt = `Create a realistic, disciplined study plan for the subject "${subject}".
${deadlineContext}
${topicsContext}

Return ONLY valid JSON matching this exact structure:
{
  "subject": "${subject}",
  "targetDate": "${targetDate || '4-week pacing'}",
  "dailyFocusRecommendationMinutes": 60,
  "milestones": [
    {
      "dayOrWeek": "Week 1",
      "focusTopic": "Topic Name",
      "tasks": ["Review fundamental concepts", "Complete 10 practice questions"],
      "estimatedMinutes": 180
    }
  ],
  "pacingStrategy": "Brief summary of retention and spaced repetition strategy"
}
Do not include text outside the JSON.`;

  const responseText = await generateText(prompt, { temperature: 0.4 });
  return extractAndParseJson<StudyPlan>(responseText);
}

/**
 * Summarize long study notes into concise key takeaways or flashcards.
 */
export async function summarizeStudyNotes(
  notes: string,
  format: 'bullet' | 'summary' | 'flashcards' = 'bullet',
): Promise<string> {
  const instructions = {
    bullet: 'Summarize the core takeaways in clear, high-yield bullet points with bold keywords.',
    summary: 'Write a high-yield executive summary in 2 focused paragraphs.',
    flashcards: 'Convert the notes into 5-10 Question & Answer flashcard pairs formatted as "Q: ... / A: ...".',
  }[format];

  const prompt = `You are a high-efficiency academic tutor. Analyze the following notes and ${instructions}

Notes:
"""
${notes}
"""`;

  return generateText(prompt, { temperature: 0.3 });
}

/**
 * Generate active-recall quiz questions for self-testing.
 */
export async function generateQuizQuestions(topic: string, count = 4): Promise<QuizQuestion[]> {
  const prompt = `Generate ${count} high-yield multiple choice questions to test understanding of: "${topic}".

Return ONLY valid JSON matching this exact array structure:
[
  {
    "question": "What is ...?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswerIndex": 0,
    "explanation": "Brief explanation of why this answer is correct."
  }
]
correctAnswerIndex must be an integer between 0 and 3. Do not include markdown or text outside the JSON.`;

  const responseText = await generateText(prompt, { temperature: 0.4 });
  return extractAndParseJson<QuizQuestion[]>(responseText);
}

/**
 * Analyze study pacing and cognitive fatigue based on user timer stats.
 */
export async function analyzeStudyPacing(stats: {
  totalFocusMinutes: number;
  breakMinutes: number;
  sessionCount: number;
  targetDailyGoalMinutes?: number;
}): Promise<StudyPacingAdvice> {
  const prompt = `Analyze these student study metrics:
- Total Focus Minutes: ${stats.totalFocusMinutes}
- Total Break Minutes: ${stats.breakMinutes}
- Number of Sessions: ${stats.sessionCount}
- Target Daily Goal: ${stats.targetDailyGoalMinutes || 120} minutes

Evaluate cognitive fatigue, optimal pacing, and recommend the next action.
Return ONLY valid JSON matching this exact structure:
{
  "cognitiveLoadAssessment": "optimal",
  "recommendation": "1-2 sentence encouraging and tactical recommendation",
  "suggestedNextBreakMinutes": 10,
  "nextFocusBlockMinutes": 25
}
cognitiveLoadAssessment MUST be one of: "optimal", "moderate_fatigue", "high_burnout_risk".
Do not include text outside the JSON.`;

  const responseText = await generateText(prompt, { temperature: 0.3 });
  return extractAndParseJson<StudyPacingAdvice>(responseText);
}

/**
 * Health check to verify Firebase AI Logic connectivity.
 */
export async function checkAILogicHealth(): Promise<{ ok: boolean; model: string; message?: string }> {
  try {
    const reply = await generateText('Ping. Reply with PONG.', { maxOutputTokens: 250, temperature: 0.1 });
    return {
      ok: true,
      model: activeModelName,
      message: reply.trim(),
    };
  } catch (err) {
    const errorObj = normalizeAIError(err);
    return {
      ok: false,
      model: activeModelName,
      message: errorObj.message,
    };
  }
}

/**
 * Convert any generated StudyPlan into concrete Sanctra TaskItem objects with scheduled dates & times.
 */
export function convertStudyPlanToTasks(
  plan: StudyPlan,
  options?: StudyPlanTaskConversionOptions,
): TaskItem[] {
  const todayStr = getLocalDateString();
  const startDateStr = options?.startDate || todayStr;
  const [startY, startM, startD] = startDateStr.split('-').map(Number);
  const baseDate = new Date(startY, (startM || 1) - 1, startD || 1);

  const prefStart = options?.preferredStartTime || '09:00';
  const [prefH, prefM] = prefStart.split(':').map(Number);
  const baseMinutes = (prefH || 9) * 60 + (prefM || 0);

  const taskItems: TaskItem[] = [];
  let dayOffset = 0;

  for (const milestone of plan.milestones) {
    const milestoneDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + dayOffset);
    const dueDate = getLocalDateString(milestoneDate);
    const category = dueDate === todayStr ? 'today' : 'backlog';

    const count = Math.max(1, milestone.tasks.length);
    const slotMinutes = options?.defaultTaskMinutes || Math.max(25, Math.min(90, Math.round(milestone.estimatedMinutes / count)));

    milestone.tasks.forEach((taskText, taskIdx) => {
      const taskStartMin = baseMinutes + taskIdx * (slotMinutes + 10);
      const taskEndMin = taskStartMin + slotMinutes;

      const formatSlot = (totalMin: number) => {
        const h = Math.min(23, Math.floor(totalMin / 60));
        const m = totalMin % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      };

      const startTime = formatSlot(taskStartMin);
      const endTime = formatSlot(taskEndMin);

      taskItems.push({
        id: `task-ai-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        text: `[${milestone.focusTopic}] ${taskText}`,
        completed: false,
        dueDate,
        startTime,
        endTime,
        category,
        subjectId: options?.subjectId,
        workspaceId: options?.workspaceId,
        createdAt: Date.now(),
      });
    });

    dayOffset += 1;
  }

  return taskItems;
}

/**
 * Ask Gemini to generate a personalized study plan schedule with concrete time slots for tasks.
 */
export async function generateStudyPlanSchedule(
  params: GenerateStudyPlanScheduleParams,
): Promise<{ plan: StudyPlan; tasks: TaskItem[] }> {
  const todayStr = getLocalDateString();
  const startDateStr = params.startDate || todayStr;
  const targetDateStr = params.targetDate || 'in 4 weeks';
  const dailyFocusHours = params.dailyFocusHours || 2;
  const preferredStartTime = params.preferredDailyStartTime || '09:00';

  const topicsPrompt = params.currentTopics && params.currentTopics.length > 0
    ? `Topics to cover:\n- ${params.currentTopics.join('\n- ')}`
    : 'Cover all fundamental, high-yield, and revision topics for this subject.';

  const prompt = `You are Sanctra Study AI, an expert academic planner.
Create a structured study plan AND scheduled daily study tasks for:
- Subject: "${params.subject}"
- Study Start Date: ${startDateStr}
- Target date: ${targetDateStr}
- Daily Focus Target: ${dailyFocusHours} hours/day
- Preferred Daily Study Time: ${preferredStartTime}
${topicsPrompt}

Return ONLY valid JSON matching this exact structure:
{
  "subject": "${params.subject}",
  "targetDate": "${targetDateStr}",
  "dailyFocusRecommendationMinutes": ${dailyFocusHours * 60},
  "pacingStrategy": "Brief description of spaced repetition and review strategy",
  "milestones": [
    {
      "dayOrWeek": "Day 1",
      "focusTopic": "Topic Name",
      "tasks": ["Specific Task 1", "Specific Task 2"],
      "estimatedMinutes": 120
    }
  ],
  "scheduledTasks": [
    {
      "text": "[Topic Name] Specific actionable task description",
      "dueDate": "${startDateStr}",
      "startTime": "${preferredStartTime}",
      "endTime": "10:30",
      "estimatedMinutes": 90,
      "milestoneTitle": "Topic Name"
    }
  ]
}

Important:
- Provide 4 to 10 discrete, actionable "scheduledTasks".
- "dueDate" must be in "YYYY-MM-DD" format starting from ${startDateStr}.
- "startTime" and "endTime" must be valid 24-hour "HH:mm" time strings where endTime > startTime.
- Do not output any markdown text outside the JSON.`;

  const responseText = await generateText(prompt, { temperature: 0.3, maxOutputTokens: 4096 });
  const parsed = extractAndParseJson<StudyPlanWithSchedule>(responseText);

  const plan: StudyPlan = {
    subject: parsed.subject || params.subject,
    targetDate: parsed.targetDate || targetDateStr,
    dailyFocusRecommendationMinutes: parsed.dailyFocusRecommendationMinutes || dailyFocusHours * 60,
    milestones: parsed.milestones || [],
    pacingStrategy: parsed.pacingStrategy || 'Spaced retention strategy',
  };

  let tasks: TaskItem[] = [];

  if (Array.isArray(parsed.scheduledTasks) && parsed.scheduledTasks.length > 0) {
    tasks = parsed.scheduledTasks.map((t) => {
      const dueDate = t.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(t.dueDate) ? t.dueDate : startDateStr;
      const category = dueDate === todayStr ? 'today' : 'backlog';

      return {
        id: `task-ai-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        text: t.text || 'Study session',
        completed: false,
        dueDate,
        startTime: t.startTime,
        endTime: t.endTime,
        category,
        subjectId: params.subjectId,
        workspaceId: params.workspaceId,
        createdAt: Date.now(),
      };
    });
  } else {
    // Graceful fallback to deterministic converter
    tasks = convertStudyPlanToTasks(plan, {
      startDate: startDateStr,
      preferredStartTime,
      subjectId: params.subjectId,
      workspaceId: params.workspaceId,
    });
  }

  return { plan, tasks };
}

/**
 * Insert tasks directly into Sanctra's persistent task storage (localStorage)
 * and dispatch an update event so React components reactively update.
 */
export function insertTasksIntoStorage(
  newTasks: TaskItem[],
  options?: { prepend?: boolean },
): TaskItem[] {
  let existingTasks: TaskItem[] = [];
  try {
    existingTasks = getTasks();
  } catch {
    existingTasks = [];
  }

  const merged = options?.prepend === false
    ? [...existingTasks, ...newTasks]
    : [...newTasks, ...existingTasks];

  if (typeof localStorage !== 'undefined') {
    try {
      saveTasks(merged);
    } catch (err) {
      console.warn('[Firebase AI Logic] Notice saving tasks to storage:', err);
    }
  }

  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('sanctra_tasks_updated', { detail: merged }));
    } catch {
      // Ignore if CustomEvent not available
    }
  }

  return merged;
}

/**
 * Generate a complete study plan schedule and immediately insert the resulting
 * tasks into Sanctra's todo/tasks list in storage.
 */
export async function generateAndInsertStudyTasks(
  params: GenerateStudyPlanScheduleParams,
  options?: { prepend?: boolean },
): Promise<GenerateAndInsertStudyTasksResult> {
  const { plan, tasks } = await generateStudyPlanSchedule(params);
  const allTasks = insertTasksIntoStorage(tasks, options);

  return {
    plan,
    newTasks: tasks,
    allTasks,
  };
}
