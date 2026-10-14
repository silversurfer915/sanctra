import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Sparkles,
  Calendar,
  MessageSquare,
  HelpCircle,
  Activity,
  FileText,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  CheckSquare,
  Square,
  BookOpen,
  ArrowRight,
  Zap,
} from 'lucide-react';
import {
  checkAILogicHealth,
  generateAndInsertStudyTasks,
  startStudyChat,
  generateQuizQuestions,
  summarizeStudyNotes,
  analyzeStudyPacing,
  DEFAULT_AI_MODEL,
  DEFAULT_AI_FIREBASE_CONFIG,
  type StudyPlan,
  type QuizQuestion,
  type StudyPacingAdvice,
  type StudyChatSession,
} from './utils/aiLogic';
import type { TaskItem } from './types';
import { getTasks, saveTasks, clearTasks } from './utils/storage';
import { getLocalDateString } from './utils/time';
import './index.css';

type DemoTab = 'schedule' | 'chat' | 'quiz' | 'summarize' | 'pacing';

const PRESET_SUBJECTS = [
  { name: 'Organic Chemistry', topics: 'Alkene Reactions\nMarkovnikov Addition\nNucleophilic Substitution (SN1 vs SN2)' },
  { name: 'Calculus II', topics: 'Integration by Parts\nTrigonometric Substitution\nPartial Fractions Decomposition\nTaylor Series' },
  { name: 'Microeconomics', topics: 'Supply and Demand Elasticity\nConsumer Surplus & Deadweight Loss\nMonopoly vs Perfect Competition' },
  { name: 'Cell Biology', topics: 'Mitochondrial Respiration\nGlycolysis & Krebs Cycle\nActive Membrane Transport' },
];

function StandaloneAiDemoApp() {
  const [activeTab, setActiveTab] = useState<DemoTab>('schedule');

  // Backend Health State
  const [healthStatus, setHealthStatus] = useState<{ ok?: boolean; message?: string; latencyMs?: number } | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  // Live Storage Tasks State
  const [storedTasks, setStoredTasks] = useState<TaskItem[]>(() => {
    try { return getTasks(); } catch { return []; }
  });

  // Refresh tasks from localStorage
  const refreshTasks = () => {
    try { setStoredTasks(getTasks()); } catch { setStoredTasks([]); }
  };

  useEffect(() => {
    const handleStorage = () => refreshTasks();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('sanctra_tasks_updated', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('sanctra_tasks_updated', handleStorage);
    };
  }, []);

  // Run initial health check on mount
  useEffect(() => {
    handleRunHealthCheck();
  }, []);

  const handleRunHealthCheck = async () => {
    setIsCheckingHealth(true);
    const start = performance.now();
    try {
      const res = await checkAILogicHealth();
      const latency = Math.round(performance.now() - start);
      setHealthStatus({ ok: res.ok, message: res.message, latencyMs: latency });
    } catch (err: unknown) {
      setHealthStatus({ ok: false, message: err instanceof Error ? err.message : String(err) });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  // --- TAB 1: SCHEDULE GENERATOR ---
  const [subject, setSubject] = useState(PRESET_SUBJECTS[0].name);
  const [topics, setTopics] = useState(PRESET_SUBJECTS[0].topics);
  const [targetDate, setTargetDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return getLocalDateString(d);
  });
  const [dailyHours, setDailyHours] = useState('2');
  const [preferredStartTime, setPreferredStartTime] = useState('09:00');
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<StudyPlan | null>(null);
  const [generatedTasks, setGeneratedTasks] = useState<TaskItem[]>([]);
  const [scheduleError, setScheduleError] = useState('');

  const handleGenerateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGeneratingSchedule(true);
    setScheduleError('');

    try {
      const topicList = topics.split('\n').map((t) => t.trim()).filter(Boolean);
      const res = await generateAndInsertStudyTasks({
        subject,
        targetDate,
        startDate: getLocalDateString(),
        dailyFocusHours: parseFloat(dailyHours) || 2,
        preferredDailyStartTime: preferredStartTime,
        currentTopics: topicList,
      });

      setGeneratedPlan(res.plan);
      setGeneratedTasks(res.newTasks);
      refreshTasks();
    } catch (err: unknown) {
      setScheduleError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsGeneratingSchedule(false);
    }
  };

  const handleToggleTask = (id: string) => {
    const updated = storedTasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
    saveTasks(updated);
    setStoredTasks(updated);
  };

  const handleClearAllTasks = () => {
    clearTasks();
    setStoredTasks([]);
    setGeneratedTasks([]);
  };

  // --- TAB 2: STREAMING TUTOR CHAT ---
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    {
      sender: 'ai',
      text: 'Hello! I am your Sanctra AI Study Tutor. Ask me to break down difficult concepts, provide memory mnemonics, or explain step-by-step problem solutions.',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isStreamingChat, setIsStreamingChat] = useState(false);
  const chatSessionRef = useRef<StudyChatSession | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'chat' && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isStreamingChat, activeTab]);

  const handleSendChat = async (queryText?: string) => {
    const text = (queryText || chatInput).trim();
    if (!text || isStreamingChat) return;

    setChatMessages((prev) => [...prev, { sender: 'user', text }]);
    setChatInput('');
    setIsStreamingChat(true);

    if (!chatSessionRef.current) {
      chatSessionRef.current = startStudyChat();
    }

    try {
      setChatMessages((prev) => [...prev, { sender: 'ai', text: '' }]);
      await chatSessionRef.current.sendMessageStream(text, (chunk) => {
        setChatMessages((prev) => {
          const list = [...prev];
          const last = list.length - 1;
          if (last >= 0 && list[last].sender === 'ai') {
            list[last] = { sender: 'ai', text: list[last].text + chunk };
          }
          return list;
        });
      });
    } catch (err: unknown) {
      setChatMessages((prev) => [
        ...prev,
        { sender: 'ai', text: `⚠️ Error: ${err instanceof Error ? err.message : String(err)}` },
      ]);
    } finally {
      setIsStreamingChat(false);
    }
  };

  // --- TAB 3: ACTIVE RECALL QUIZ ---
  const [quizTopic, setQuizTopic] = useState('Photosynthesis & Light Reactions');
  const [quizCount, setQuizCount] = useState(4);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [quizList, setQuizList] = useState<QuizQuestion[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizError, setQuizError] = useState('');

  const handleGenerateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizTopic.trim()) return;
    setIsGeneratingQuiz(true);
    setQuizError('');
    setQuizAnswers({});

    try {
      const q = await generateQuizQuestions(quizTopic.trim(), quizCount);
      setQuizList(q);
    } catch (err: unknown) {
      setQuizError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  // --- TAB 4: NOTES SUMMARIZER ---
  const [notesInput, setNotesInput] = useState(
    `Mitochondria are double-membraned organelles often referred to as the powerhouse of the cell. They generate most of the chemical energy needed to power the cell's biochemical reactions through cellular respiration. Chemical energy produced by the mitochondria is stored in a small molecule called adenosine triphosphate (ATP). The outer membrane covers the organelle and contains it like a skin. The inner membrane folds over many times and creates layered structures called cristae. The folding increases the surface area inside the organelle. Glycolysis takes place in the cytoplasm, producing pyruvate which enters the mitochondrial matrix for the Krebs Cycle, generating NADH and FADH2 for the electron transport chain.`
  );
  const [summaryFormat, setSummaryFormat] = useState<'bullet' | 'summary' | 'flashcards'>('bullet');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryResult, setSummaryResult] = useState('');
  const [summaryCopied, setSummaryCopied] = useState(false);

  const handleSummarize = async () => {
    if (!notesInput.trim()) return;
    setIsSummarizing(true);
    try {
      const res = await summarizeStudyNotes(notesInput, summaryFormat);
      setSummaryResult(res);
    } catch (err: unknown) {
      setSummaryResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSummarizing(false);
    }
  };

  // --- TAB 5: PACING COACH ---
  const [focusMin, setFocusMin] = useState(140);
  const [breakMin, setBreakMin] = useState(15);
  const [sessionCount, setSessionCount] = useState(4);
  const [isAnalyzingPacing, setIsAnalyzingPacing] = useState(false);
  const [pacingResult, setPacingResult] = useState<StudyPacingAdvice | null>(null);

  const handleAnalyzePacing = async () => {
    setIsAnalyzingPacing(true);
    try {
      const res = await analyzeStudyPacing({
        totalFocusMinutes: focusMin,
        breakMinutes: breakMin,
        sessionCount: sessionCount,
        targetDailyGoalMinutes: 180,
      });
      setPacingResult(res);
    } catch (err: unknown) {
      alert(`Pacing error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsAnalyzingPacing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md shadow-emerald-500/10">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Sanctra AI Logic Studio
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 font-semibold">
                Standalone Demo
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Live Google Gemini 3.8 Flash • Firebase AI Logic Integration
            </p>
          </div>
        </div>

        {/* Backend Connectivity Status Badge */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
            <span
              className={`w-2 h-2 rounded-full ${
                healthStatus?.ok === true
                  ? 'bg-emerald-400 animate-pulse'
                  : healthStatus?.ok === false
                  ? 'bg-rose-500'
                  : 'bg-amber-400'
              }`}
            />
            <span className="font-mono text-[11px] text-slate-300">
              {DEFAULT_AI_MODEL}
            </span>
            {healthStatus?.latencyMs !== undefined && (
              <span className="text-[10px] text-emerald-400/90 font-mono">
                ({healthStatus.latencyMs}ms)
              </span>
            )}
          </div>

          <button
            onClick={handleRunHealthCheck}
            disabled={isCheckingHealth}
            title="Ping Gemini Backend"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-xs flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingHealth ? 'animate-spin text-emerald-400' : ''}`} />
            <span className="hidden md:inline">Ping Model</span>
          </button>
        </div>
      </header>

      {/* Main Studio Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800/80 gap-2 overflow-x-auto pb-px">
          {[
            { id: 'schedule', label: '1. Plan & Auto-Tasks', icon: Calendar },
            { id: 'chat', label: '2. Streaming AI Tutor', icon: MessageSquare },
            { id: 'quiz', label: '3. Active Recall Quiz', icon: HelpCircle },
            { id: 'summarize', label: '4. Notes Summarizer', icon: FileText },
            { id: 'pacing', label: '5. Cognitive Pacing', icon: Activity },
          ].map((tab) => {
            const Icon = tab.icon;
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as DemoTab)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
                  isCurrent
                    ? 'border-emerald-400 text-emerald-300 bg-slate-900/60'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/20'
                }`}
              >
                <Icon className={`w-4 h-4 ${isCurrent ? 'text-emerald-400' : 'text-slate-500'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: STUDY PLAN & AUTOMATED TODO INSERTION */}
        {/* ========================================================================= */}
        {activeTab === 'schedule' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Input Form */}
            <div className="lg:col-span-6 space-y-5">
              <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-4">
                <div>
                  <h2 className="text-base font-semibold text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    AI Study Plan & Task Scheduler
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Gemini formulates your milestones and saves actionable scheduled tasks into your Sanctra Todo list.
                  </p>
                </div>

                {/* Quick Presets */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Quick Demo Presets:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_SUBJECTS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          setSubject(preset.name);
                          setTopics(preset.topics);
                        }}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                          subject === preset.name
                            ? 'bg-emerald-950 border-emerald-500 text-emerald-300 font-medium'
                            : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleGenerateSchedule} className="space-y-4 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Subject</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      required
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Target Date</label>
                      <input
                        type="date"
                        value={targetDate}
                        onChange={(e) => setTargetDate(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Daily Commitment</label>
                      <input
                        type="number"
                        min="0.5"
                        max="8"
                        step="0.5"
                        value={dailyHours}
                        onChange={(e) => setDailyHours(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Start Time</label>
                      <input
                        type="time"
                        value={preferredStartTime}
                        onChange={(e) => setPreferredStartTime(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Topics Breakdown (one per line)
                    </label>
                    <textarea
                      rows={4}
                      value={topics}
                      onChange={(e) => setTopics(e.target.value)}
                      placeholder="Enter topics..."
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isGeneratingSchedule}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
                  >
                    {isGeneratingSchedule ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating Plan & Inserting Tasks...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generate & Insert Directly into Todo
                      </>
                    )}
                  </button>
                </form>

                {scheduleError && (
                  <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{scheduleError}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Live Tasks & Plan Inspector */}
            <div className="lg:col-span-6 space-y-5">
              <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Live Sanctra Todo / Tasks Inspector
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Real-time synchronized with browser localStorage (<code className="text-emerald-400">sanctra_tasks_v1</code>)
                    </p>
                  </div>
                  {storedTasks.length > 0 && (
                    <button
                      onClick={handleClearAllTasks}
                      className="px-2.5 py-1 text-[11px] text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-800/40 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear Tasks
                    </button>
                  )}
                </div>

                {storedTasks.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500 space-y-2">
                    <Clock className="w-8 h-8 text-slate-600 mx-auto" />
                    <p>No tasks in storage yet.</p>
                    <p className="text-[11px] text-slate-600">
                      Click "Generate & Insert" on the left to watch Gemini schedule tasks here live!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                    <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                      <span>Total Tasks: <strong>{storedTasks.length}</strong></span>
                      <span>
                        Completed: <strong>{storedTasks.filter((t) => t.completed).length}</strong>
                      </span>
                    </div>
                    {storedTasks.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => handleToggleTask(t.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                          t.completed
                            ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <button className="mt-0.5 text-emerald-400 shrink-0">
                          {t.completed ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-500" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium text-slate-200 ${t.completed ? 'line-through text-slate-400' : ''}`}>
                            {t.text}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-[10px]">
                            <span className="font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/50 text-emerald-400">
                              {t.dueDate}
                            </span>
                            {t.startTime && t.endTime && (
                              <span className="font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400">
                                {t.startTime} - {t.endTime}
                              </span>
                            )}
                            <span className="uppercase text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold">
                              {t.category}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: STREAMING TUTOR CHAT */}
        {/* ========================================================================= */}
        {activeTab === 'chat' && (
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-4 max-w-4xl mx-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  Interactive AI Study Tutor (Streaming)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Multi-turn conversation with memory. Responses stream word-by-word with Gemini 3.8 Flash.
                </p>
              </div>
              <button
                onClick={() =>
                  setChatMessages([
                    {
                      sender: 'ai',
                      text: 'Chat history cleared. How can I help you study next?',
                    },
                  ])
                }
                className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800"
              >
                Clear Chat
              </button>
            </div>

            {/* Quick Prompts */}
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                'Explain Bayes Theorem with a real-world example',
                'Give 3 retention mnemonics for Amino Acids',
                'How should I structure a 4-hour study cram?',
                'Explain how photosynthesis electron transport works',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleSendChat(suggestion)}
                  className="text-xs px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-emerald-300 hover:border-emerald-600/50 transition-all"
                >
                  💡 {suggestion}
                </button>
              ))}
            </div>

            {/* Chat Viewport */}
            <div
              ref={chatScrollRef}
              className="h-[420px] overflow-y-auto space-y-3.5 p-4 rounded-xl bg-slate-950 border border-slate-850"
            >
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap ${
                      msg.sender === 'user'
                        ? 'bg-emerald-600 text-white rounded-br-none'
                        : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-bl-none'
                    }`}
                  >
                    {msg.text || (
                      <span className="inline-flex items-center gap-1.5 text-slate-400">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                        Generating thoughts...
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChat();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask your tutor anything..."
                disabled={isStreamingChat}
                className="flex-1 px-4 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isStreamingChat}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: ACTIVE RECALL QUIZ */}
        {/* ========================================================================= */}
        {activeTab === 'quiz' && (
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-5 max-w-4xl mx-auto">
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-emerald-400" />
                Active Recall Quiz Generator
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Generate high-yield multiple choice questions and test yourself with instant validation.
              </p>
            </div>

            <form onSubmit={handleGenerateQuiz} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={quizTopic}
                onChange={(e) => setQuizTopic(e.target.value)}
                placeholder="Topic (e.g. Electromagnetism, Cell Division, Macroeconomics)"
                required
                className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <div className="flex items-center gap-2">
                <select
                  value={quizCount}
                  onChange={(e) => setQuizCount(parseInt(e.target.value))}
                  className="px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value={2}>2 Questions</option>
                  <option value={4}>4 Questions</option>
                  <option value={6}>6 Questions</option>
                </select>
                <button
                  type="submit"
                  disabled={isGeneratingQuiz || !quizTopic.trim()}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all whitespace-nowrap cursor-pointer"
                >
                  {isGeneratingQuiz ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Generate Quiz
                </button>
              </div>
            </form>

            {quizError && (
              <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs">
                {quizError}
              </div>
            )}

            {quizList.length > 0 && (
              <div className="space-y-4 pt-2">
                {quizList.map((q, qIndex) => {
                  const selected = quizAnswers[qIndex];
                  const isAnswered = selected !== undefined;

                  return (
                    <div
                      key={qIndex}
                      className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3"
                    >
                      <div className="text-xs font-semibold text-slate-100 flex items-start gap-2">
                        <span className="text-emerald-400 font-mono font-bold">Q{qIndex + 1}.</span>
                        <span>{q.question}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt, optIndex) => {
                          let btnStyle = 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800/80';
                          if (isAnswered) {
                            if (optIndex === q.correctAnswerIndex) {
                              btnStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-300 font-semibold';
                            } else if (selected === optIndex) {
                              btnStyle = 'bg-rose-950/80 border-rose-500 text-rose-300 line-through';
                            } else {
                              btnStyle = 'bg-slate-900/30 border-slate-800/40 text-slate-500 opacity-50';
                            }
                          }

                          return (
                            <button
                              key={optIndex}
                              type="button"
                              disabled={isAnswered}
                              onClick={() => setQuizAnswers((prev) => ({ ...prev, [qIndex]: optIndex }))}
                              className={`text-left text-xs px-3.5 py-2.5 rounded-lg border transition-all ${btnStyle}`}
                            >
                              <span className="font-mono text-[10px] text-slate-400 mr-1.5 font-bold">
                                {String.fromCharCode(65 + optIndex)}.
                              </span>
                              {opt}
                            </button>
                          );
                        })}
                      </div>

                      {isAnswered && (
                        <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 flex items-start gap-2.5">
                          <BookOpen className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-emerald-400">Explanation: </span>
                            {q.explanation}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: NOTES SUMMARIZER */}
        {/* ========================================================================= */}
        {activeTab === 'summarize' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-4">
              <div>
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  Study Notes Summarizer & Flashcards
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Paste lecture slides or notes to distill core takeaways into flashcards or high-yield points.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">Format</label>
                <div className="flex gap-2">
                  {[
                    { id: 'bullet', label: 'Bullet Points' },
                    { id: 'summary', label: 'Executive Summary' },
                    { id: 'flashcards', label: 'Q&A Flashcards' },
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setSummaryFormat(fmt.id as 'bullet' | 'summary' | 'flashcards')}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                        summaryFormat === fmt.id
                          ? 'bg-emerald-950 border-emerald-500 text-emerald-300 font-semibold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Source Notes</label>
                <textarea
                  rows={8}
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none font-mono text-[11px]"
                />
              </div>

              <button
                type="button"
                onClick={handleSummarize}
                disabled={isSummarizing || !notesInput.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                {isSummarizing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Distilling Notes...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Process & Summarize
                  </>
                )}
              </button>
            </div>

            {/* Result Preview */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-4 flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Processed Output
                </h3>
                {summaryResult && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(summaryResult);
                      setSummaryCopied(true);
                      setTimeout(() => setSummaryCopied(false), 2000);
                    }}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
                  >
                    {summaryCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{summaryCopied ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>

              <div className="flex-1 min-h-[300px] p-4 rounded-xl bg-slate-950 border border-slate-850 overflow-y-auto text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                {summaryResult || (
                  <span className="text-slate-500 italic">
                    Click "Process & Summarize" to see distilled study points here.
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: COGNITIVE PACING & FATIGUE ANALYZER */}
        {/* ========================================================================= */}
        {activeTab === 'pacing' && (
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-6 max-w-4xl mx-auto">
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                Cognitive Pacing & Burnout Prevention Coach
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Simulate or inspect focus metrics. Gemini calculates cognitive load and schedules tactical breaks.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Total Focus Time</span>
                  <span className="font-mono font-bold text-emerald-400">{focusMin} mins</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="360"
                  step="10"
                  value={focusMin}
                  onChange={(e) => setFocusMin(parseInt(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Total Break Time</span>
                  <span className="font-mono font-bold text-teal-400">{breakMin} mins</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="90"
                  step="5"
                  value={breakMin}
                  onChange={(e) => setBreakMin(parseInt(e.target.value))}
                  className="w-full accent-teal-500"
                />
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Session Count</span>
                  <span className="font-mono font-bold text-blue-400">{sessionCount} sessions</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="12"
                  value={sessionCount}
                  onChange={(e) => setSessionCount(parseInt(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleAnalyzePacing}
              disabled={isAnalyzingPacing}
              className="py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
            >
              {isAnalyzingPacing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Evaluating Fatigue Curve...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Analyze Cognitive Load & Recommend Breaks
                </>
              )}
            </button>

            {pacingResult && (
              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4 animate-fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="text-xs font-semibold text-slate-300">Cognitive Assessment</span>
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                      pacingResult.cognitiveLoadAssessment === 'optimal'
                        ? 'bg-emerald-950 border border-emerald-500 text-emerald-300'
                        : pacingResult.cognitiveLoadAssessment === 'moderate_fatigue'
                        ? 'bg-amber-950 border border-amber-500 text-amber-300'
                        : 'bg-rose-950 border border-rose-500 text-rose-300'
                    }`}
                  >
                    {pacingResult.cognitiveLoadAssessment.replace('_', ' ')}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 leading-relaxed">
                  {pacingResult.recommendation}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Recommended Break</span>
                    <div className="text-xl font-extrabold text-emerald-400 mt-0.5">
                      {pacingResult.suggestedNextBreakMinutes} mins
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Next Focus Block</span>
                    <div className="text-xl font-extrabold text-teal-400 mt-0.5">
                      {pacingResult.nextFocusBlockMinutes} mins
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
        Sanctra AI Logic Studio • Standalone Testing Environment • Powered by Google Gemini Developer API
      </footer>
    </div>
  );
}

// Mount the standalone demo app
createRoot(document.getElementById('root')!).render(<StandaloneAiDemoApp />);
