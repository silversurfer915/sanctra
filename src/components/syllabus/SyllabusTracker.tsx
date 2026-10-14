import React, { useState, useMemo, useRef } from 'react';
import type {
  SyllabusCourse,
  SyllabusTopic,
  SyllabusState,
} from '../../types/syllabus.ts';
import {
  calculateCourseAnalytics,
  getDueRevisions,
  toggleTopicCompletion,
  recordTopicRevision,
  addTopicToUnit,
  addUnitToSubject,
  addSubjectToCourse,
  deleteTopicFromCourse,
  updateTopicFields,
  exportCourseToJson,
  importCourseFromJson,
} from '../../utils/syllabusService.ts';
import { CURATED_SYLLABUS_TEMPLATES, createBlankSyllabusCourse } from '../../utils/syllabusTemplates.ts';
import { getLocalDateString } from '../../utils/time.ts';
import {
  BookOpen,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Calendar,
  Download,
  Upload,
  Play,
  Edit2,
  AlertCircle,
  Clock,
  Layers,
} from 'lucide-react';

interface SyllabusTrackerProps {
  syllabusState: SyllabusState;
  onUpdateSyllabusState: (updater: (prev: SyllabusState) => SyllabusState) => void;
  onFocusTopic?: (topic: SyllabusTopic, course: SyllabusCourse, subjectTitle: string) => void;
  onAddTaskForTopic?: (topic: SyllabusTopic, subjectTitle: string) => void;
}

export const SyllabusTracker: React.FC<SyllabusTrackerProps> = ({
  syllabusState,
  onUpdateSyllabusState,
  onFocusTopic,
  onAddTaskForTopic,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const todayStr = useMemo(() => getLocalDateString(), []);

  // Active course
  const activeCourse = useMemo(() => {
    return (
      syllabusState.courses.find((c) => c.id === syllabusState.activeCourseId) ||
      syllabusState.courses[0] ||
      CURATED_SYLLABUS_TEMPLATES[0]
    );
  }, [syllabusState.courses, syllabusState.activeCourseId]);

  // Analytics
  const analytics = useMemo(() => {
    return calculateCourseAnalytics(activeCourse, todayStr);
  }, [activeCourse, todayStr]);

  // Due topics
  const dueRevisions = useMemo(() => {
    return getDueRevisions(activeCourse, todayStr);
  }, [activeCourse, todayStr]);

  // UI state for expand/collapse
  const [collapsedSubjects, setCollapsedSubjects] = useState<Record<string, boolean>>({});
  const toggleSubjectCollapse = (subId: string) => {
    setCollapsedSubjects((prev) => ({ ...prev, [subId]: !prev[subId] }));
  };

  // Modals & form state
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [newSubjectTitle, setNewSubjectTitle] = useState('');
  const [isAddingSubject, setIsAddingSubject] = useState(false);

  const [addingUnitForSubjectId, setAddingUnitForSubjectId] = useState<string | null>(null);
  const [newUnitTitle, setNewUnitTitle] = useState('');

  const [addingTopicForUnitId, setAddingTopicForUnitId] = useState<string | null>(null);
  const [newTopicTitle, setNewTopicTitle] = useState('');

  const [editingTopic, setEditingTopic] = useState<{ id: string; title: string; notes?: string } | null>(null);
  const [scheduleModalTopicId, setScheduleModalTopicId] = useState<string | null>(null);

  const [notification, setNotification] = useState<string | null>(null);
  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Course management helpers
  const handleSelectCourse = (courseId: string) => {
    onUpdateSyllabusState((prev) => ({ ...prev, activeCourseId: courseId }));
  };

  const handleAddCourseFromTemplate = (template: SyllabusCourse) => {
    const clone = {
      ...template,
      id: `course-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    onUpdateSyllabusState((prev) => ({
      ...prev,
      courses: [...prev.courses, clone],
      activeCourseId: clone.id,
    }));
    setIsTemplateModalOpen(false);
    showNotice(`Added course "${clone.title}"`);
  };

  const handleCreateBlankCourse = () => {
    const blank = createBlankSyllabusCourse();
    onUpdateSyllabusState((prev) => ({
      ...prev,
      courses: [...prev.courses, blank],
      activeCourseId: blank.id,
    }));
    setIsTemplateModalOpen(false);
    showNotice('Created new custom syllabus course');
  };

  const handleDeleteCourse = (courseId: string) => {
    if (syllabusState.courses.length <= 1) {
      showNotice('Cannot delete the only remaining syllabus course.');
      return;
    }
    if (window.confirm(`Delete syllabus course "${activeCourse.title}"?`)) {
      onUpdateSyllabusState((prev) => {
        const remaining = prev.courses.filter((c) => c.id !== courseId);
        return {
          ...prev,
          courses: remaining,
          activeCourseId: remaining[0]?.id || '',
        };
      });
      showNotice('Course deleted.');
    }
  };

  // Topic mutations
  const handleToggleTopic = (topicId: string) => {
    onUpdateSyllabusState((prev) => ({
      ...prev,
      courses: prev.courses.map((c) =>
        c.id === activeCourse.id ? toggleTopicCompletion(c, topicId) : c
      ),
    }));
  };

  const handleRecordRevision = (topicId: string, customDate?: string) => {
    onUpdateSyllabusState((prev) => ({
      ...prev,
      courses: prev.courses.map((c) =>
        c.id === activeCourse.id ? recordTopicRevision(c, topicId, customDate) : c
      ),
    }));
    showNotice('Revision recorded (+1 revision)');
  };

  const handleCycleConfidence = (topic: SyllabusTopic) => {
    const next: SyllabusTopic['confidence'] =
      topic.confidence === 'high' ? 'medium' : topic.confidence === 'medium' ? 'low' : 'high';
    onUpdateSyllabusState((prev) => ({
      ...prev,
      courses: prev.courses.map((c) =>
        c.id === activeCourse.id
          ? updateTopicFields(c, topic.id, { confidence: next })
          : c
      ),
    }));
  };

  const handleSaveTopicEdit = () => {
    if (!editingTopic || !editingTopic.title.trim()) return;
    onUpdateSyllabusState((prev) => ({
      ...prev,
      courses: prev.courses.map((c) =>
        c.id === activeCourse.id
          ? updateTopicFields(c, editingTopic.id, {
              title: editingTopic.title.trim(),
              notes: editingTopic.notes,
            })
          : c
      ),
    }));
    setEditingTopic(null);
    showNotice('Topic updated.');
  };

  const handleDeleteTopic = (topicId: string) => {
    onUpdateSyllabusState((prev) => ({
      ...prev,
      courses: prev.courses.map((c) =>
        c.id === activeCourse.id ? deleteTopicFromCourse(c, topicId) : c
      ),
    }));
    showNotice('Topic deleted.');
  };

  // Export / Import
  const handleExportJson = () => {
    const json = exportCourseToJson(activeCourse);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sanctra-syllabus-${activeCourse.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotice('Syllabus exported.');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = String(event.target?.result || '');
        const imported = importCourseFromJson(text);
        onUpdateSyllabusState((prev) => ({
          ...prev,
          courses: [...prev.courses, imported],
          activeCourseId: imported.id,
        }));
        showNotice(`Imported "${imported.title}" successfully!`);
      } catch (err: any) {
        alert(err?.message || 'Failed to import syllabus JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Toast Notice */}
      {notification && (
        <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <Sparkles className="w-4 h-4 text-emerald-300 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* 1. Header & Course Switcher Bar */}
      <div className="p-4 sm:p-5 rounded-3xl glass-card border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--sanctra-sage)]/15 border border-[var(--sanctra-sage)]/30 flex items-center justify-center text-[var(--sanctra-sage)]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--sanctra-sage)]">
                  Curriculum & Revision Tracker
                </span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-semibold">
                  {activeCourse.category === 'learning'
                    ? 'Self-Paced'
                    : 'Custom Course'}
                </span>
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                {activeCourse.title}
              </h2>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Course Selector Dropdown */}
            <select
              aria-label="Select active course"
              value={activeCourse.id}
              onChange={(e) => handleSelectCourse(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white focus:outline-none focus:border-[var(--sanctra-sage)] cursor-pointer"
            >
              {syllabusState.courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>

            {/* Add Course / Template Button */}
            <button
              type="button"
              onClick={() => setIsTemplateModalOpen(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[var(--sanctra-ink)] bg-[var(--sanctra-sage)] hover:brightness-105 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Add another course or choose from templates"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>New Course</span>
            </button>

            {/* Export JSON */}
            <button
              type="button"
              onClick={handleExportJson}
              className="p-2 rounded-xl glass-pill text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Export Syllabus JSON"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Import JSON */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-xl glass-pill text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Import Syllabus JSON"
            >
              <Upload className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportFile}
            />

            {/* Delete Course */}
            {syllabusState.courses.length > 1 && (
              <button
                type="button"
                onClick={() => handleDeleteCourse(activeCourse.id)}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                title="Delete current course"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 2. Coverage Analytics Metric Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-white/10">
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Total Topics
            </span>
            <span className="text-xl font-bold font-mono text-white mt-0.5 block">
              {analytics.totalTopics}
            </span>
            <span className="text-[10px] text-slate-400">across {activeCourse.subjects.length} subjects</span>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Completion
              </span>
              <span className="text-xs font-bold text-emerald-400 font-mono">
                {analytics.completionPct}%
              </span>
            </div>
            <span className="text-xl font-bold font-mono text-white mt-0.5 block">
              {analytics.completedTopics} <span className="text-xs text-slate-400 font-normal">/ {analytics.totalTopics}</span>
            </span>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                style={{ width: `${analytics.completionPct}%` }}
              />
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Revised 1x+
              </span>
              <span className="text-xs font-bold text-[var(--sanctra-sage)] font-mono">
                {analytics.revisionPct}%
              </span>
            </div>
            <span className="text-xl font-bold font-mono text-white mt-0.5 block">
              {analytics.revisedTopics} <span className="text-xs text-slate-400 font-normal">/ {analytics.totalTopics}</span>
            </span>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full bg-[var(--sanctra-sage)] rounded-full transition-all duration-500"
                style={{ width: `${analytics.revisionPct}%` }}
              />
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Mastered (2x+)
              </span>
              <span className="text-xs font-bold text-purple-300 font-mono">
                {analytics.masteryPct}%
              </span>
            </div>
            <span className="text-xl font-bold font-mono text-white mt-0.5 block">
              {analytics.masteredTopics} <span className="text-xs text-slate-400 font-normal">topics</span>
            </span>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full bg-gradient-to-r from-purple-400 to-indigo-400 rounded-full transition-all duration-500"
                style={{ width: `${analytics.masteryPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Spaced Repetition Due Queue */}
      {dueRevisions.length > 0 ? (
        <div className="p-4 sm:p-5 rounded-3xl bg-[var(--sanctra-sage)]/10 border border-[var(--sanctra-sage)]/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[var(--sanctra-sage)] font-bold text-xs uppercase tracking-wider">
              <AlertCircle className="w-4 h-4 text-[var(--sanctra-sage)]" />
              <span>Spaced Repetition Queue ({dueRevisions.length} due)</span>
            </div>
            <span className="text-[10px] text-slate-300">
              Reviewing right on schedule solidifies long-term recall
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
            {dueRevisions.slice(0, 6).map((item) => (
              <div
                key={item.topic.id}
                className="p-3 rounded-2xl bg-slate-950/60 border border-white/10 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase"
                      style={{
                        backgroundColor: `${item.subjectColor || '#B7CDEA'}25`,
                        color: item.subjectColor || '#B7CDEA',
                      }}
                    >
                      {item.subjectTitle}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate">
                      {item.unitTitle}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-white truncate mt-1">
                    {item.topic.title}
                  </p>
                  <span
                    className={`text-[10px] font-medium mt-0.5 inline-block ${
                      item.isOverdue ? 'text-rose-400 font-bold' : 'text-[var(--sanctra-sage)]'
                    }`}
                  >
                    {item.isOverdue
                      ? `Overdue by ${Math.abs(item.daysDiff)} day${Math.abs(item.daysDiff) > 1 ? 's' : ''}`
                      : 'Scheduled for revision today'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRecordRevision(item.topic.id)}
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    title="Mark revised (+1 revision)"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>+1 Revise</span>
                  </button>

                  {onFocusTopic && (
                    <button
                      type="button"
                      onClick={() => onFocusTopic(item.topic, activeCourse, item.subjectTitle)}
                      className="p-1.5 rounded-xl glass-pill text-[var(--sanctra-sage)] hover:text-white cursor-pointer"
                      title="Focus on this topic"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {dueRevisions.length > 6 && (
            <p className="text-[10px] text-[var(--sanctra-sage)]/80 text-center pt-1">
              +{dueRevisions.length - 6} more topic{dueRevisions.length - 6 > 1 ? 's' : ''} in review queue below
            </p>
          )}
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-300 font-medium">All revisions are up to date!</span>
          </div>
          <span className="text-[10px] text-slate-400">
            Next scheduled topic revisions will appear here automatically.
          </span>
        </div>
      )}

      {/* 4. Subject & Unit & Topic Hierarchy */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Layers className="w-4 h-4 text-[var(--sanctra-sage)]" />
            <span>Syllabus Breakdown ({activeCourse.subjects.length} Subjects)</span>
          </h3>
          <button
            type="button"
            onClick={() => setIsAddingSubject(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-200 glass-pill hover:text-white flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Subject</span>
          </button>
        </div>

        {/* Add Subject Inline Form */}
        {isAddingSubject && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newSubjectTitle.trim()) return;
              onUpdateSyllabusState((prev) => ({
                ...prev,
                courses: prev.courses.map((c) =>
                  c.id === activeCourse.id
                    ? addSubjectToCourse(c, newSubjectTitle)
                    : c
                ),
              }));
              setNewSubjectTitle('');
              setIsAddingSubject(false);
              showNotice('Subject added.');
            }}
            className="p-3 rounded-2xl glass-card border border-white/15 flex items-center gap-2 animate-fade-in"
          >
            <input
              type="text"
              autoFocus
              maxLength={100}
              placeholder="e.g. Modern History, Organic Chemistry, System Architecture..."
              value={newSubjectTitle}
              onChange={(e) => setNewSubjectTitle(e.target.value)}
              className="flex-1 bg-transparent px-3 py-1 text-xs text-white placeholder-slate-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setIsAddingSubject(false)}
              className="px-3 py-1 rounded-xl text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newSubjectTitle.trim()}
              className="px-3 py-1 rounded-xl text-xs font-bold bg-[var(--sanctra-sage)] text-[var(--sanctra-ink)] disabled:opacity-40 hover:brightness-105"
            >
              Save Subject
            </button>
          </form>
        )}

        {/* Subjects List */}
        {activeCourse.subjects.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 rounded-3xl glass-card border border-dashed border-white/10">
            <BookOpen className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="font-semibold text-slate-300">No subjects yet.</p>
            <p className="mt-0.5">Click "Add Subject" above to organize your modules and units.</p>
          </div>
        ) : (
          activeCourse.subjects.map((sub) => {
            const isCollapsed = Boolean(collapsedSubjects[sub.id]);
            const subTopics = sub.units.flatMap((u) => u.topics);
            const subCompleted = subTopics.filter((t) => t.completed).length;
            const subPct = subTopics.length > 0 ? Math.round((subCompleted / subTopics.length) * 100) : 0;

            return (
              <div
                key={sub.id}
                className="rounded-3xl glass-card border border-white/10 overflow-hidden transition-all"
              >
                {/* Subject Header Row */}
                <div
                  onClick={() => toggleSubjectCollapse(sub.id)}
                  className="p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      className="text-slate-400 hover:text-white shrink-0"
                      aria-label={isCollapsed ? 'Expand subject' : 'Collapse subject'}
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    <div
                      className="w-2.5 h-7 rounded-full shrink-0"
                      style={{ backgroundColor: sub.color || '#B7CDEA' }}
                    />
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">
                        {sub.title}
                      </h4>
                      <span className="text-[10px] text-slate-400">
                        {sub.units.length} unit{sub.units.length !== 1 ? 's' : ''} · {subTopics.length} topic{subTopics.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right hidden sm:block">
                      <span className="text-xs font-mono font-bold text-slate-200">
                        {subCompleted} / {subTopics.length}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1">({subPct}%)</span>
                    </div>

                    <div className="w-16 sm:w-24 bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 rounded-full"
                        style={{ width: `${subPct}%` }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAddingUnitForSubjectId(sub.id);
                        if (isCollapsed) toggleSubjectCollapse(sub.id);
                      }}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-semibold text-slate-300 glass-pill hover:text-white"
                      title="Add unit to this subject"
                    >
                      + Unit
                    </button>
                  </div>
                </div>

                {/* Subject Body: Units and Topics */}
                {!isCollapsed && (
                  <div className="p-4 pt-0 space-y-4 border-t border-white/5">
                    {/* Add Unit Inline Form */}
                    {addingUnitForSubjectId === sub.id && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!newUnitTitle.trim()) return;
                          onUpdateSyllabusState((prev) => ({
                            ...prev,
                            courses: prev.courses.map((c) =>
                              c.id === activeCourse.id
                                ? addUnitToSubject(c, sub.id, newUnitTitle)
                                : c
                            ),
                          }));
                          setNewUnitTitle('');
                          setAddingUnitForSubjectId(null);
                          showNotice('Unit created.');
                        }}
                        className="mt-3 p-3 rounded-2xl glass-card border border-white/15 flex items-center gap-2 animate-fade-in"
                      >
                        <input
                          type="text"
                          autoFocus
                          maxLength={100}
                          placeholder="Unit / Chapter title..."
                          value={newUnitTitle}
                          onChange={(e) => setNewUnitTitle(e.target.value)}
                          className="flex-1 bg-transparent px-3 py-1 text-xs text-white placeholder-slate-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setAddingUnitForSubjectId(null)}
                          className="px-2.5 py-1 rounded-xl text-xs text-slate-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={!newUnitTitle.trim()}
                          className="px-3 py-1 rounded-xl text-xs font-bold bg-[var(--sanctra-sage)] text-[var(--sanctra-ink)] disabled:opacity-40 hover:brightness-105"
                        >
                          Add Unit
                        </button>
                      </form>
                    )}

                    {sub.units.length === 0 ? (
                      <div className="py-4 text-center text-xs text-slate-500">
                        No units in this subject. Click "+ Unit" above to add chapters.
                      </div>
                    ) : (
                      sub.units.map((unit) => (
                        <div
                          key={unit.id}
                          className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2.5"
                        >
                          {/* Unit Title Bar */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-300 tracking-wide">
                              {unit.title}
                            </span>
                            <button
                              type="button"
                              onClick={() => setAddingTopicForUnitId(unit.id)}
                              className="text-[10px] text-[var(--sanctra-sage)] hover:brightness-125 font-semibold cursor-pointer"
                            >
                              + Add Topic
                            </button>
                          </div>

                          {/* Add Topic Inline Form */}
                          {addingTopicForUnitId === unit.id && (
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                if (!newTopicTitle.trim()) return;
                                onUpdateSyllabusState((prev) => ({
                                  ...prev,
                                  courses: prev.courses.map((c) =>
                                    c.id === activeCourse.id
                                      ? addTopicToUnit(c, unit.id, newTopicTitle)
                                      : c
                                  ),
                                }));
                                setNewTopicTitle('');
                                setAddingTopicForUnitId(null);
                                showNotice('Topic added.');
                              }}
                              className="p-2.5 rounded-xl bg-slate-900 border border-white/15 flex items-center gap-2"
                            >
                              <input
                                type="text"
                                autoFocus
                                maxLength={200}
                                placeholder="Topic name..."
                                value={newTopicTitle}
                                onChange={(e) => setNewTopicTitle(e.target.value)}
                                className="flex-1 bg-transparent px-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => setAddingTopicForUnitId(null)}
                                className="text-xs text-slate-400 hover:text-white"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={!newTopicTitle.trim()}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-400 text-slate-950 disabled:opacity-40"
                              >
                                Add
                              </button>
                            </form>
                          )}

                          {/* Topics List */}
                          <div className="space-y-1.5">
                            {unit.topics.length === 0 ? (
                              <p className="text-[11px] text-slate-500 py-1">
                                No topics in this unit yet.
                              </p>
                            ) : (
                              unit.topics.map((topic) => {
                                const isDue = Boolean(
                                  topic.targetRevisionDate && topic.targetRevisionDate <= todayStr
                                );

                                return (
                                  <div
                                    key={topic.id}
                                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all group ${
                                      topic.completed
                                        ? 'bg-slate-950/40 border-white/5 opacity-80'
                                        : 'bg-slate-900/60 border-white/10 hover:border-white/20'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      {/* Completion checkbox */}
                                      <button
                                        type="button"
                                        onClick={() => handleToggleTopic(topic.id)}
                                        className="text-slate-400 hover:text-emerald-400 transition-colors shrink-0 cursor-pointer"
                                        aria-label={topic.completed ? 'Mark uncompleted' : 'Mark completed'}
                                      >
                                        {topic.completed ? (
                                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                        ) : (
                                          <Circle className="w-4 h-4" />
                                        )}
                                      </button>

                                      <span
                                        className={`text-xs font-medium text-white break-words ${
                                          topic.completed ? 'text-slate-300' : ''
                                        }`}
                                      >
                                        {topic.title}
                                      </span>

                                      {/* Revision badge */}
                                      <span
                                        className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-semibold shrink-0 ${
                                          topic.revisionCount >= 2
                                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                            : topic.revisionCount === 1
                                            ? 'bg-[var(--sanctra-sage)]/20 text-[var(--sanctra-sage)] border border-[var(--sanctra-sage)]/30'
                                            : 'bg-white/5 text-slate-400'
                                        }`}
                                      >
                                        {topic.revisionCount} rev{topic.revisionCount !== 1 ? 's' : ''}
                                      </span>

                                      {/* Revision Reminder Badge */}
                                      {topic.targetRevisionDate && (
                                        <span
                                          className={`text-[9px] px-1.5 py-0.2 rounded font-mono shrink-0 flex items-center gap-1 ${
                                            isDue
                                              ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 animate-pulse'
                                              : 'text-slate-400 bg-white/5'
                                          }`}
                                          title={`Scheduled revision: ${topic.targetRevisionDate}`}
                                        >
                                          <Clock className="w-2.5 h-2.5" />
                                          <span>{topic.targetRevisionDate}</span>
                                        </span>
                                      )}

                                      {/* Confidence button */}
                                      {topic.confidence && (
                                        <button
                                          type="button"
                                          onClick={() => handleCycleConfidence(topic)}
                                          className={`text-[9px] px-1.5 py-0.2 rounded uppercase font-bold shrink-0 ${
                                            topic.confidence === 'high'
                                              ? 'text-emerald-300 bg-emerald-500/15'
                                              : topic.confidence === 'medium'
                                              ? 'text-[var(--sanctra-sage)] bg-[var(--sanctra-sage)]/15'
                                              : 'text-rose-300 bg-rose-500/15'
                                          }`}
                                          title="Click to cycle confidence (Low / Medium / High)"
                                        >
                                          {topic.confidence}
                                        </button>
                                      )}
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex items-center gap-1.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                                      {/* Quick +1 Revise */}
                                      <button
                                        type="button"
                                        onClick={() => handleRecordRevision(topic.id)}
                                        className="p-1 rounded-lg text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer"
                                        title="Record revision (+1 revision)"
                                      >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                      </button>

                                      {/* Schedule revision modal trigger */}
                                      <button
                                        type="button"
                                        onClick={() => setScheduleModalTopicId(topic.id)}
                                        className="p-1 rounded-lg text-slate-400 hover:text-[var(--sanctra-sage)] hover:bg-[var(--sanctra-sage)]/10 cursor-pointer"
                                        title="Schedule spaced revision date"
                                      >
                                        <Calendar className="w-3.5 h-3.5" />
                                      </button>

                                      {/* Focus Now */}
                                      {onFocusTopic && (
                                        <button
                                          type="button"
                                          onClick={() => onFocusTopic(topic, activeCourse, sub.title)}
                                          className="p-1 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 cursor-pointer"
                                          title="Start focus timer on this topic"
                                        >
                                          <Play className="w-3.5 h-3.5" />
                                        </button>
                                      )}

                                      {/* Add Planner Task */}
                                      {onAddTaskForTopic && (
                                        <button
                                          type="button"
                                          onClick={() => onAddTaskForTopic(topic, sub.title)}
                                          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
                                          title="Add task in Planner for this topic"
                                        >
                                          <Plus className="w-3.5 h-3.5" />
                                        </button>
                                      )}

                                      {/* Edit */}
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setEditingTopic({
                                            id: topic.id,
                                            title: topic.title,
                                            notes: topic.notes,
                                          })
                                        }
                                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
                                        title="Edit topic title or notes"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>

                                      {/* Delete */}
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteTopic(topic.id)}
                                        className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                                        title="Delete topic"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: Pick Curated Template or Start Blank */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-modal rounded-3xl p-6 w-full max-w-xl max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Create or Select Curriculum</h3>
                <p className="text-xs text-slate-400">Choose a ready-to-use template or start your own custom course.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Close
              </button>
            </div>

            <div className="space-y-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--sanctra-sage)] block">
                Curated Presets
              </span>
              <div className="grid grid-cols-1 gap-2">
                {CURATED_SYLLABUS_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleAddCourseFromTemplate(tmpl)}
                    className="p-3.5 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-white/10 hover:border-[var(--sanctra-sage)]/40 text-left transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-xs text-white group-hover:text-[var(--sanctra-sage)]">
                          {tmpl.title}
                        </strong>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/10 text-slate-300">
                          {tmpl.category}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {tmpl.subjects.length} subjects · {tmpl.subjects.flatMap((s) => s.units.flatMap((u) => u.topics)).length} topics
                      </p>
                    </div>
                    <span className="text-xs font-bold text-[var(--sanctra-sage)] group-hover:translate-x-1 transition-transform">
                      + Add
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-white/10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Custom Learning
              </span>
              <button
                type="button"
                onClick={handleCreateBlankCourse}
                className="w-full p-3.5 rounded-2xl border border-dashed border-white/20 hover:border-emerald-400/40 hover:bg-emerald-500/5 text-center text-xs font-bold text-emerald-300 transition-all cursor-pointer"
              >
                + Start Blank Custom Course
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Edit Topic */}
      {editingTopic && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveTopicEdit();
            }}
            className="glass-modal rounded-3xl p-6 w-full max-w-md space-y-4"
          >
            <h3 className="text-base font-bold text-white">Edit Topic</h3>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Topic Title</label>
              <input
                type="text"
                required
                maxLength={200}
                value={editingTopic.title}
                onChange={(e) => setEditingTopic({ ...editingTopic, title: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs text-white focus:outline-none focus:border-[var(--sanctra-sage)]"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Study Notes / References</label>
              <textarea
                maxLength={1000}
                rows={3}
                placeholder="Important formulas, page references, key concepts..."
                value={editingTopic.notes || ''}
                onChange={(e) => setEditingTopic({ ...editingTopic, notes: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs text-white focus:outline-none focus:border-[var(--sanctra-sage)] resize-none"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditingTopic(null)}
                className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[var(--sanctra-sage)] text-[var(--sanctra-ink)] hover:brightness-105"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Spaced Revision Scheduler */}
      {scheduleModalTopicId && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-modal rounded-3xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[var(--sanctra-sage)]" />
              <span>Schedule Next Revision</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Pick a spaced repetition interval to receive a reminder when this topic is ready for review.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {[
                { label: '+3 Days (Initial)', days: 3 },
                { label: '+7 Days (1 Week)', days: 7 },
                { label: '+14 Days (2 Weeks)', days: 14 },
                { label: '+30 Days (1 Month)', days: 30 },
              ].map((opt) => (
                <button
                  key={opt.days}
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + opt.days);
                    const targetStr = getLocalDateString(d);
                    onUpdateSyllabusState((prev) => ({
                      ...prev,
                      courses: prev.courses.map((c) =>
                        c.id === activeCourse.id
                          ? updateTopicFields(c, scheduleModalTopicId, {
                              targetRevisionDate: targetStr,
                            })
                          : c
                      ),
                    }));
                    setScheduleModalTopicId(null);
                    showNotice(`Scheduled revision for ${targetStr}`);
                  }}
                  className="p-3 rounded-xl bg-slate-900 border border-white/10 hover:border-[var(--sanctra-sage)]/40 text-xs text-slate-200 hover:text-white text-center font-medium transition-all cursor-pointer"
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  onUpdateSyllabusState((prev) => ({
                    ...prev,
                    courses: prev.courses.map((c) =>
                      c.id === activeCourse.id
                        ? updateTopicFields(c, scheduleModalTopicId, {
                            targetRevisionDate: undefined,
                          })
                        : c
                    ),
                  }));
                  setScheduleModalTopicId(null);
                  showNotice('Cleared revision schedule.');
                }}
                className="text-xs text-rose-300 hover:underline"
              >
                Clear Schedule
              </button>
              <button
                type="button"
                onClick={() => setScheduleModalTopicId(null)}
                className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
