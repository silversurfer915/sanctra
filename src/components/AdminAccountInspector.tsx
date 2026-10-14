import {AdminAiAllowance} from './AdminAiAllowance.tsx';
import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  BarChart3,
  CheckSquare,
  Target,
  Users,
  User,
  Calendar,
  Clock,
  Flame,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Layers,
  Search,
  BookOpen,
  Sparkles,
  CheckCircle2,
  Circle,
  Globe,
  Lock,
  ArrowUpRight,
  Quote,
  AlertCircle,
} from 'lucide-react';
import { getCloudDatabase } from '../utils/firebase.ts';
import { cloudErrorMessage } from '../utils/cloudErrors.ts';
import { buildPeriodAnalytics, type AnalyticsPeriod, shiftPeriod, periodBounds } from '../utils/analytics.ts';
import { formatDurationHuman, calculateStreak, getTodaySeconds, getThisWeekSeconds } from '../utils/time.ts';
import type { StudySession, Subject, TaskItem, UserSettings } from '../types/index.ts';
import { DEFAULT_USER_SETTINGS } from '../utils/storage.ts';
import { getStudyGroupById } from '../utils/groupsService.ts';
import type { LiveGroup } from '../utils/liveGroups.ts';

interface AdminAccountInspectorProps {
  uid: string;
  displayName?: string;
  onInspectGroup?: (groupId: string) => void;
}

export function AdminAccountInspector({ uid, displayName, onInspectGroup }: AdminAccountInspectorProps) {
  const [data, setData] = useState<{
    sessions: StudySession[];
    subjects: Subject[];
    tasks: TaskItem[];
    settings: UserSettings;
  } | null>(null);
  const [groups, setGroups] = useState<LiveGroup[]>([]);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'analytics' | 'tasks' | 'targets' | 'groups' | 'profile'>('analytics');
  const [period, setPeriod] = useState<AnalyticsPeriod | 'all'>('week');
  const [anchorDate, setAnchorDate] = useState<Date>(new Date());
  const [copiedUid, setCopiedUid] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);

  // Filters & search
  const [sessionSubjectFilter, setSessionSubjectFilter] = useState('all');
  const [sessionSearch, setSessionSearch] = useState('');
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [taskSubjectFilter, setTaskSubjectFilter] = useState('all');

  useEffect(() => {
    setData(null);
    setGroups([]);
    setError('');
    const db = getCloudDatabase();
    if (!db) return;
    let cancelled = false,sequence=0,lastKey:string|null=null;

    const off = onSnapshot(
      doc(db, 'users', uid),
      (s) => {
        const d = s.data() || {};
        setData({
          sessions: Array.isArray(d.sessions) ? d.sessions : [],
          subjects: Array.isArray(d.subjects) ? d.subjects : [],
          tasks: Array.isArray(d.tasks) ? d.tasks : [],
          settings: { ...DEFAULT_USER_SETTINGS, ...d.settings },
        });
      },
      (e) => setError(cloudErrorMessage(e, 'inspect account data'))
    );

    const offGroups = onSnapshot(
      doc(db, 'users', uid, 'community', 'preferences'),
      (s) => {
        const raw=s.data()?.joinedIds;
        const ids=Array.isArray(raw)?[...new Set(raw.filter((id):id is string=>typeof id==='string'&&id.length>0))].sort():[];
        const key=JSON.stringify(ids);if(key===lastKey)return;lastKey=key;const mine=++sequence;
        void Promise.all(ids.map((id: string) => getStudyGroupById(id)))
          .then((value) => {
            if (!cancelled&&mine===sequence) setGroups(value.filter(Boolean) as LiveGroup[]);
          })
          .catch((e) => {if(!cancelled&&mine===sequence)setError(cloudErrorMessage(e,'inspect groups'));});
      },
      (e) => setError(cloudErrorMessage(e, 'inspect groups'))
    );

    return () => {
      cancelled = true;
      off();
      offGroups();
    };
  }, [uid]);

  const copyUidToClipboard = () => {
    void navigator.clipboard.writeText(uid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  if (error) {
    return (
      <div role="alert" className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-300 text-sm flex items-center gap-3">
        <AlertCircle size={18} className="flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-sm text-[var(--sanctra-muted)] flex flex-col items-center justify-center gap-3 animate-pulse">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--sanctra-sage)] border-t-transparent animate-spin" />
        <p>Loading live member account records…</p>
      </div>
    );
  }

  // Analytics Calculation
  const isAllTime = period === 'all';
  const analyticsPeriodKind: AnalyticsPeriod = isAllTime ? 'month' : period;
  const stats = buildPeriodAnalytics(
    data.sessions,
    data.subjects,
    anchorDate,
    analyticsPeriodKind
  );

  // All-time totals
  const allTimeSeconds = data.sessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
  const allTimeSessions = data.sessions.length;
  const streak = calculateStreak(data.sessions);

  // Effective period values
  const effectiveTotalSeconds = isAllTime ? allTimeSeconds : stats.totalSeconds;
  const effectiveSessionCount = isAllTime ? allTimeSessions : stats.sessionCount;
  const effectiveAverageSession = effectiveSessionCount ? Math.round(effectiveTotalSeconds / effectiveSessionCount) : 0;
  const effectiveActiveDays = isAllTime ? streak.activeDays : stats.activeDays;

  // Subjects breakdown
  const displaySubjects = isAllTime
    ? (() => {
        const map = new Map<string, { id: string; name: string; color: string; seconds: number; sessionCount: number }>();
        for (const session of data.sessions) {
          const sub = data.subjects.find((s) => s.id === session.subjectId);
          const id = session.subjectId || 'untagged';
          const existing = map.get(id) || {
            id,
            name: sub?.name || session.subjectName || 'Untagged',
            color: sub?.color || session.subjectColor || 'var(--sanctra-sage)',
            seconds: 0,
            sessionCount: 0,
          };
          existing.seconds += session.durationSeconds || 0;
          existing.sessionCount += 1;
          map.set(id, existing);
        }
        return [...map.values()].sort((a, b) => b.seconds - a.seconds);
      })()
    : stats.subjects.map((sub) => {
        const count = stats.sessions.filter((s) => (s.subjectId || 'untagged') === sub.id).length;
        return { ...sub, sessionCount: count };
      });

  // Filtered session history
  const rawSessions = isAllTime ? [...data.sessions].sort((a, b) => b.startTime - a.startTime) : stats.sessions;
  const filteredSessions = rawSessions
    .filter((s) => sessionSubjectFilter === 'all' || (s.subjectId || 'untagged') === sessionSubjectFilter)
    .filter((s) => {
      if (!sessionSearch.trim()) return true;
      const term = sessionSearch.toLowerCase();
      const subjectName = s.subjectName || data.subjects.find((sub) => sub.id === s.subjectId)?.name || 'Untagged';
      return (
        subjectName.toLowerCase().includes(term) ||
        (s.notes && s.notes.toLowerCase().includes(term)) ||
        (s.syllabusTopicTitle && s.syllabusTopicTitle.toLowerCase().includes(term))
      );
    });

  // Task metrics
  const completedTasksCount = data.tasks.filter((t) => t.completed).length;
  const pendingTasksCount = data.tasks.filter((t) => !t.completed).length;
  const totalTasksCount = data.tasks.length;
  const taskCompletionRate = totalTasksCount ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  const filteredTasks = data.tasks
    .filter((t) => {
      if (taskFilter === 'pending') return !t.completed;
      if (taskFilter === 'completed') return t.completed;
      return true;
    })
    .filter((t) => taskSubjectFilter === 'all' || (t.subjectId || 'untagged') === taskSubjectFilter);

  // Goal calculations
  const todaySeconds = getTodaySeconds(data.sessions);
  const todayHours = todaySeconds / 3600;
  const dailyGoalHours = data.settings.dailyGoalHours || 4;
  const dailyGoalProgress = Math.min(100, Math.round((todayHours / dailyGoalHours) * 100));

  const thisWeekSeconds = getThisWeekSeconds(data.sessions);
  const thisWeekHours = thisWeekSeconds / 3600;
  const weeklyTargetHours = data.settings.weeklyTargetHours || (dailyGoalHours * 6);
  const weeklyGoalProgress = Math.min(100, Math.round((thisWeekHours / weeklyTargetHours) * 100));

  // Date range display string
  const formatPeriodLabel = () => {
    if (isAllTime) return 'All Recorded History';
    const { start, end } = periodBounds(anchorDate, period);
    if (period === 'day') {
      return anchorDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    }
    if (period === 'week') {
      const endInclusive = new Date(end);
      endInclusive.setDate(endInclusive.getDate() - 1);
      return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${endInclusive.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return anchorDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  };

  // Generate and copy formatted markdown summary
  const copyMemberSummary = () => {
    const lines = [
      `### Sanctra Member Activity Report: ${data.settings.customDisplayName || displayName || 'Member'}`,
      `- **UID**: \`${uid}\``,
      `- **Focus Intent**: ${data.settings.focusIntent || 'Learning'}`,
      `- **Lifetime Focus**: ${formatDurationHuman(allTimeSeconds)} across ${allTimeSessions} sessions`,
      `- **Current Streak**: ${streak.currentStreak} days (Best: ${streak.bestStreak} days, Active Days: ${streak.activeDays})`,
      `- **Inspected Period (${period})**: ${formatDurationHuman(effectiveTotalSeconds)} (${effectiveSessionCount} sessions)`,
      `- **Tasks**: ${completedTasksCount}/${totalTasksCount} completed (${taskCompletionRate}%)`,
      `- **Daily Target**: ${todayHours.toFixed(1)}h / ${dailyGoalHours}h (${dailyGoalProgress}%)`,
      `- **Top Subjects**: ${displaySubjects.slice(0, 3).map((s) => `${s.name} (${formatDurationHuman(s.seconds)})`).join(', ') || 'None'}`,
    ];
    void navigator.clipboard.writeText(lines.join('\n'));
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  return (
    <div className="admin-account-inspector space-y-5">
      <AdminAiAllowance uid={uid}/>
      {/* Member Profile Identity Bar */}
      <div className="admin-inspector-hero flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[var(--sanctra-surface)] border border-[var(--sanctra-glass-border)]">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="relative w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-inner">
            {data.settings.avatarUrl ? (
              <img src={data.settings.avatarUrl} alt="User Avatar" className="w-full h-full object-cover" />
            ) : (
              <User size={24} className="text-[var(--sanctra-sage)]" />
            )}
            {data.settings.plusAvatarEffect && data.settings.plusAvatarEffect !== 'none' && (
              <span className="absolute inset-0 rounded-2xl ring-1 ring-amber-400/40 pointer-events-none" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-[var(--sanctra-paper)] truncate">
                {data.settings.customDisplayName || displayName || 'Member'}
              </h3>
              {data.settings.focusIntent && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium tracking-wide uppercase bg-[var(--sanctra-sage)]/15 text-[var(--sanctra-sage)] border border-[var(--sanctra-sage)]/30">
                  {data.settings.focusIntent}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-0.5 text-xs text-[var(--sanctra-muted)]">
              <span className="font-mono text-[11px] opacity-80 break-all">{uid}</span>
              <button
                type="button"
                onClick={copyUidToClipboard}
                className="hover:text-[var(--sanctra-paper)] p-0.5 rounded transition"
                title="Copy User UID"
                aria-label="Copy User UID"
              >
                {copiedUid ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions & Lifetime Stats */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 pr-2 border-r border-[var(--sanctra-glass-border)] text-right">
            <div>
              <div className="text-xs text-[var(--sanctra-muted)] font-medium">All-time focus</div>
              <div className="text-sm font-semibold text-[var(--sanctra-paper)]">
                {formatDurationHuman(allTimeSeconds)}
              </div>
            </div>
            <div>
              <div className="text-xs text-[var(--sanctra-muted)] font-medium">Streak</div>
              <div className="text-sm font-semibold text-amber-300 flex items-center justify-end gap-1">
                <Flame size={13} /> {streak.currentStreak}d
              </div>
            </div>
          </div>

          <button
            type="button"
            className="analytics-button text-xs py-1.5 px-3 flex items-center gap-1.5"
            onClick={copyMemberSummary}
            title="Copy structured summary to clipboard"
          >
            {copiedReport ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            <span>{copiedReport ? 'Report Copied' : 'Export Summary'}</span>
          </button>
        </div>
      </div>

      {/* Modern Inspector Tabs Navigation */}
      <nav className="workspace-tabs flex flex-wrap gap-1 p-1 bg-black/20 rounded-xl border border-[var(--sanctra-glass-border)]" aria-label="Account inspection sections">
        {[
          { id: 'analytics', label: 'Analytics & Focus', Icon: BarChart3, badge: formatDurationHuman(effectiveTotalSeconds) },
          { id: 'tasks', label: 'Tasks', Icon: CheckSquare, badge: `${completedTasksCount}/${totalTasksCount}` },
          { id: 'targets', label: 'Focus Targets', Icon: Target },
          { id: 'groups', label: 'Study Groups', Icon: Users, badge: `${groups.length}` },
          { id: 'profile', label: 'Profile & Setup', Icon: User },
        ].map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={active}
              onClick={() => setTab(t.id as typeof tab)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                active
                  ? 'bg-[var(--sanctra-surface)] text-[var(--sanctra-paper)] shadow-sm border border-[var(--sanctra-glass-border)]'
                  : 'text-[var(--sanctra-muted)] hover:text-[var(--sanctra-paper)] hover:bg-white/[0.03]'
              }`}
            >
              <t.Icon size={14} className={active ? 'text-[var(--sanctra-sage)]' : 'opacity-70'} />
              <span>{t.label}</span>
              {t.badge && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  active ? 'bg-[var(--sanctra-sage)]/20 text-[var(--sanctra-sage)]' : 'bg-white/5 text-[var(--sanctra-muted)]'
                }`}>
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* TAB 1: ANALYTICS & FOCUS */}
      {tab === 'analytics' && (
        <div className="space-y-5 animate-in fade-in-50 duration-200">
          {/* Period Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.02] border border-[var(--sanctra-glass-border)]">
            {/* Period Pills */}
            <div className="flex items-center gap-1">
              {(['day', 'week', 'month', 'all'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition ${
                    period === p
                      ? 'bg-[var(--sanctra-sage)] text-[var(--sanctra-ink)] font-semibold'
                      : 'text-[var(--sanctra-muted)] hover:text-[var(--sanctra-paper)] hover:bg-white/5'
                  }`}
                >
                  {p === 'all' ? 'All Time' : p}
                </button>
              ))}
            </div>

            {/* Date Navigator */}
            {!isAllTime && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="p-1 rounded-lg hover:bg-white/10 text-[var(--sanctra-muted)] hover:text-[var(--sanctra-paper)] transition"
                  onClick={() => setAnchorDate((prev) => shiftPeriod(prev, analyticsPeriodKind, -1))}
                  title="Previous period"
                  aria-label="Previous period"
                >
                  <ChevronLeft size={16} />
                </button>

                <span className="text-xs font-medium text-[var(--sanctra-paper)] px-2">
                  {formatPeriodLabel()}
                </span>

                <button
                  type="button"
                  className="p-1 rounded-lg hover:bg-white/10 text-[var(--sanctra-muted)] hover:text-[var(--sanctra-paper)] transition"
                  onClick={() => setAnchorDate((prev) => shiftPeriod(prev, analyticsPeriodKind, 1))}
                  title="Next period"
                  aria-label="Next period"
                >
                  <ChevronRight size={16} />
                </button>

                <input
                  aria-label="Select inspection date"
                  type="date"
                  className="inbox-input text-xs py-1 px-2 w-auto ml-1"
                  value={anchorDate.toISOString().slice(0, 10)}
                  onChange={(e) => {
                    if (e.target.value) setAnchorDate(new Date(e.target.value + 'T12:00:00'));
                  }}
                />

                <button
                  type="button"
                  className="analytics-button text-[11px] py-1 px-2"
                  onClick={() => setAnchorDate(new Date())}
                >
                  Today
                </button>
              </div>
            )}
          </div>

          {/* Core Analytics Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="admin-stat-card p-3.5 rounded-xl bg-[var(--sanctra-surface)] border border-[var(--sanctra-glass-border)]">
              <div className="text-[11px] font-medium text-[var(--sanctra-muted)] flex items-center gap-1.5 mb-1">
                <Clock size={12} className="text-[var(--sanctra-sage)]" />
                <span>Focus time</span>
              </div>
              <div className="text-xl font-bold text-[var(--sanctra-paper)] font-mono">
                {formatDurationHuman(effectiveTotalSeconds)}
              </div>
              <div className="text-[10px] text-[var(--sanctra-muted)] mt-1 truncate">
                {isAllTime ? 'Lifetime accumulated' : `In ${period}`}
              </div>
            </div>

            <div className="admin-stat-card p-3.5 rounded-xl bg-[var(--sanctra-surface)] border border-[var(--sanctra-glass-border)]">
              <div className="text-[11px] font-medium text-[var(--sanctra-muted)] flex items-center gap-1.5 mb-1">
                <Layers size={12} className="text-sky-400" />
                <span>Sessions</span>
              </div>
              <div className="text-xl font-bold text-[var(--sanctra-paper)] font-mono">
                {effectiveSessionCount}
              </div>
              <div className="text-[10px] text-[var(--sanctra-muted)] mt-1 truncate">
                Avg {formatDurationHuman(effectiveAverageSession)}
              </div>
            </div>

            <div className="admin-stat-card p-3.5 rounded-xl bg-[var(--sanctra-surface)] border border-[var(--sanctra-glass-border)]">
              <div className="text-[11px] font-medium text-[var(--sanctra-muted)] flex items-center gap-1.5 mb-1">
                <Calendar size={12} className="text-emerald-400" />
                <span>Active days</span>
              </div>
              <div className="text-xl font-bold text-[var(--sanctra-paper)] font-mono">
                {effectiveActiveDays}
              </div>
              <div className="text-[10px] text-[var(--sanctra-muted)] mt-1 truncate">
                {isAllTime ? `Best streak: ${streak.bestStreak}d` : `${stats.daysElapsed} days elapsed`}
              </div>
            </div>

            <div className="admin-stat-card p-3.5 rounded-xl bg-[var(--sanctra-surface)] border border-[var(--sanctra-glass-border)]">
              <div className="text-[11px] font-medium text-[var(--sanctra-muted)] flex items-center gap-1.5 mb-1">
                <Flame size={12} className="text-amber-400" />
                <span>Longest block</span>
              </div>
              <div className="text-xl font-bold text-[var(--sanctra-paper)] font-mono">
                {formatDurationHuman(stats.longestSession)}
              </div>
              <div className="text-[10px] text-[var(--sanctra-muted)] mt-1 truncate">
                Median {formatDurationHuman(stats.medianSession)}
              </div>
            </div>

            <div className="admin-stat-card p-3.5 rounded-xl bg-[var(--sanctra-surface)] border border-[var(--sanctra-glass-border)]">
              <div className="text-[11px] font-medium text-[var(--sanctra-muted)] flex items-center gap-1.5 mb-1">
                <Target size={12} className="text-indigo-400" />
                <span>Daily average</span>
              </div>
              <div className="text-xl font-bold text-[var(--sanctra-paper)] font-mono">
                {formatDurationHuman(stats.dailyAverage)}
              </div>
              <div className="text-[10px] text-[var(--sanctra-muted)] mt-1 truncate">
                Target: {dailyGoalHours}h/day
              </div>
            </div>

            <div className="admin-stat-card p-3.5 rounded-xl bg-[var(--sanctra-surface)] border border-[var(--sanctra-glass-border)]">
              <div className="text-[11px] font-medium text-[var(--sanctra-muted)] flex items-center gap-1.5 mb-1">
                <Sparkles size={12} className="text-purple-400" />
                <span>Peak window</span>
              </div>
              <div className="text-base font-bold text-[var(--sanctra-paper)] truncate mt-0.5">
                {stats.peakHour !== null ? `${stats.peakHour % 12 || 12}${stats.peakHour >= 12 ? 'pm' : 'am'}` : '—'}
              </div>
              <div className="text-[10px] text-[var(--sanctra-muted)] mt-1 truncate">
                {stats.bestDay?.seconds ? `Best: ${stats.bestDay.date.toLocaleDateString(undefined, { weekday: 'short' })}` : 'No data'}
              </div>
            </div>
          </div>

          {/* Subjects Progress & Distribution */}
          <div className="p-4 rounded-2xl bg-[var(--sanctra-surface)] border border-[var(--sanctra-glass-border)] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen size={16} className="text-[var(--sanctra-sage)]" />
                <h4 className="text-sm font-semibold text-[var(--sanctra-paper)]">Subject Distribution</h4>
              </div>
              <span className="text-xs text-[var(--sanctra-muted)]">
                {displaySubjects.length} {displaySubjects.length === 1 ? 'subject' : 'subjects'} tracked
              </span>
            </div>

            {displaySubjects.length ? (
              <div className="space-y-3">
                {displaySubjects.map((sub) => {
                  const percentage = effectiveTotalSeconds > 0 ? ((sub.seconds / effectiveTotalSeconds) * 100).toFixed(1) : '0';
                  return (
                    <div key={sub.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: sub.color }}
                          />
                          <span className="font-medium text-[var(--sanctra-paper)]">{sub.name}</span>
                          <span className="text-[10px] text-[var(--sanctra-muted)]">
                            ({sub.sessionCount} {sub.sessionCount === 1 ? 'session' : 'sessions'})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="font-semibold text-[var(--sanctra-paper)]">{formatDurationHuman(sub.seconds)}</span>
                          <span className="text-[var(--sanctra-muted)] text-[11px] w-12 text-right">{percentage}%</span>
                        </div>
                      </div>

                      {/* Custom themed progress bar track */}
                      <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.max(2, Number(percentage))}%`,
                            backgroundColor: sub.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-[var(--sanctra-muted)] italic">No subject study time recorded in this period.</p>
            )}
          </div>

          {/* Session History & Notes */}
          <div className="p-4 rounded-2xl bg-[var(--sanctra-surface)] border border-[var(--sanctra-glass-border)] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-[var(--sanctra-sage)]" />
                <h4 className="text-sm font-semibold text-[var(--sanctra-paper)]">
                  Session Log ({filteredSessions.length})
                </h4>
              </div>

              {/* Session Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--sanctra-muted)] pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search notes or topics..."
                    value={sessionSearch}
                    onChange={(e) => setSessionSearch(e.target.value)}
                    className="inbox-input text-xs py-1 pl-7 pr-3 w-48"
                  />
                </div>

                <select
                  aria-label="Filter sessions by subject"
                  value={sessionSubjectFilter}
                  onChange={(e) => setSessionSubjectFilter(e.target.value)}
                  className="inbox-input text-xs py-1 px-2.5 w-auto"
                >
                  <option value="all">All Subjects</option>
                  {data.subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                  <option value="untagged">Untagged</option>
                </select>
              </div>
            </div>

            {filteredSessions.length ? (
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {filteredSessions.map((session) => {
                  const subject = data.subjects.find((s) => s.id === session.subjectId);
                  const subjectName = session.subjectName || subject?.name || 'Untagged';
                  const subjectColor = subject?.color || session.subjectColor || 'var(--sanctra-sage)';

                  return (
                    <div
                      key={session.id}
                      className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-[var(--sanctra-glass-border)] transition space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: subjectColor }} />
                          <strong className="text-xs font-semibold text-[var(--sanctra-paper)]">{subjectName}</strong>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 text-[var(--sanctra-muted)] font-mono capitalize">
                            {session.mode}
                          </span>
                        </div>

                        <span className="font-mono text-xs font-semibold text-[var(--sanctra-sage)]">
                          {formatDurationHuman(session.durationSeconds)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--sanctra-muted)]">
                        <span>
                          {new Date(session.startTime).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}{' '}
                          —{' '}
                          {new Date(session.endTime).toLocaleTimeString(undefined, {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                        {session.syllabusTopicTitle && (
                          <span className="text-[10px] text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
                            Topic: {session.syllabusTopicTitle}
                          </span>
                        )}
                      </div>

                      {session.notes && (
                        <div className="flex items-start gap-1.5 p-2 rounded-lg bg-black/20 text-xs text-[var(--sanctra-paper)]/90 border border-white/5">
                          <Quote size={12} className="text-[var(--sanctra-sage)] flex-shrink-0 mt-0.5 opacity-60" />
                          <p className="whitespace-pre-wrap break-words">{session.notes}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-[var(--sanctra-muted)]">
                No study sessions recorded matching this filter.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: TASKS */}
      {tab === 'tasks' && (
        <div className="space-y-4 animate-in fade-in-50 duration-200">
          {/* Tasks Overview Stats Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-[var(--sanctra-surface)] border border-[var(--sanctra-glass-border)]">
            <div>
              <div className="text-xs text-[var(--sanctra-muted)]">Completed tasks</div>
              <div className="text-xl font-bold text-emerald-400 font-mono mt-0.5">{completedTasksCount}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--sanctra-muted)]">Pending tasks</div>
              <div className="text-xl font-bold text-amber-300 font-mono mt-0.5">{pendingTasksCount}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--sanctra-muted)]">Completion rate</div>
              <div className="text-xl font-bold text-[var(--sanctra-paper)] font-mono mt-0.5">{taskCompletionRate}%</div>
              <div className="w-full h-1.5 rounded-full bg-white/10 mt-1 overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${taskCompletionRate}%` }} />
              </div>
            </div>
          </div>

          {/* Task Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              {(['all', 'pending', 'completed'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setTaskFilter(filter)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition ${
                    taskFilter === filter
                      ? 'bg-[var(--sanctra-sage)] text-[var(--sanctra-ink)] font-semibold'
                      : 'text-[var(--sanctra-muted)] hover:text-[var(--sanctra-paper)] hover:bg-white/5'
                  }`}
                >
                  {filter} ({filter === 'all' ? totalTasksCount : filter === 'pending' ? pendingTasksCount : completedTasksCount})
                </button>
              ))}
            </div>

            <select
              aria-label="Filter tasks by subject"
              value={taskSubjectFilter}
              onChange={(e) => setTaskSubjectFilter(e.target.value)}
              className="inbox-input text-xs py-1 px-2.5 w-auto"
            >
              <option value="all">All Subjects</option>
              {data.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Task Items List */}
          {filteredTasks.length ? (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {filteredTasks.map((t) => {
                const sub = data.subjects.find((s) => s.id === t.subjectId);
                const isOverdue = !t.completed && t.dueDate && t.dueDate < new Date().toISOString().slice(0, 10);
                const isDueToday = !t.completed && t.dueDate === new Date().toISOString().slice(0, 10);

                return (
                  <div
                    key={t.id}
                    className={`p-3 rounded-xl border transition flex items-start justify-between gap-3 ${
                      t.completed
                        ? 'bg-white/[0.01] border-white/5 opacity-75'
                        : 'bg-[var(--sanctra-surface)] border-[var(--sanctra-glass-border)]'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="mt-0.5 flex-shrink-0">
                        {t.completed ? (
                          <CheckCircle2 size={16} className="text-emerald-400" />
                        ) : (
                          <Circle size={16} className="text-[var(--sanctra-muted)]" />
                        )}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div
                          className={`text-xs font-medium break-words ${
                            t.completed ? 'line-through text-[var(--sanctra-muted)]' : 'text-[var(--sanctra-paper)]'
                          }`}
                        >
                          {t.text}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--sanctra-muted)]">
                          {sub && (
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sub.color }} />
                              <span>{sub.name}</span>
                            </span>
                          )}

                          {t.dueDate && (
                            <span
                              className={`px-1.5 py-0.2 rounded font-mono text-[10px] ${
                                isOverdue
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : isDueToday
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-white/5 text-[var(--sanctra-muted)]'
                              }`}
                            >
                              {isOverdue ? 'Overdue' : isDueToday ? 'Due Today' : t.dueDate}
                            </span>
                          )}

                          {t.startTime && (
                            <span className="font-mono text-[10px]">
                              {t.startTime}
                              {t.endTime ? ` – ${t.endTime}` : ''}
                            </span>
                          )}

                          {t.syllabusTopicTitle && (
                            <span className="text-[10px] text-sky-300">Topic: {t.syllabusTopicTitle}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 p-4 rounded-xl border border-[var(--sanctra-glass-border)] bg-[var(--sanctra-surface)] text-xs text-[var(--sanctra-muted)]">
              No tasks found for this selection.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: FOCUS TARGETS */}
      {tab === 'targets' && (
        <div className="space-y-5 animate-in fade-in-50 duration-200">
          {/* Daily & Weekly Target Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-[var(--sanctra-surface)] border border-[var(--sanctra-glass-border)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target size={16} className="text-emerald-400" />
                  <h4 className="text-sm font-semibold text-[var(--sanctra-paper)]">Daily Study Goal</h4>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {todayHours.toFixed(1)}h / {dailyGoalHours}h
                </span>
              </div>

              <div className="w-full h-2.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                  style={{ width: `${dailyGoalProgress}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-[var(--sanctra-muted)]">
                <span>{dailyGoalProgress}% achieved today</span>
                <span>{todayHours >= dailyGoalHours ? 'Daily target reached 🎉' : `${(dailyGoalHours - todayHours).toFixed(1)}h remaining`}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--sanctra-surface)] border border-[var(--sanctra-glass-border)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame size={16} className="text-amber-400" />
                  <h4 className="text-sm font-semibold text-[var(--sanctra-paper)]">Weekly Target</h4>
                </div>
                <span className="text-xs font-mono font-bold text-amber-400">
                  {thisWeekHours.toFixed(1)}h / {weeklyTargetHours}h
                </span>
              </div>

              <div className="w-full h-2.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-300"
                  style={{ width: `${weeklyGoalProgress}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-[var(--sanctra-muted)]">
                <span>{weeklyGoalProgress}% achieved this week</span>
                <span>{thisWeekHours >= weeklyTargetHours ? 'Weekly target reached 🌟' : `${(weeklyTargetHours - thisWeekHours).toFixed(1)}h remaining`}</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB 4: GROUPS */}
      {tab === 'groups' && (
        <div className="space-y-4 animate-in fade-in-50 duration-200">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-[var(--sanctra-paper)]">
              Joined Study Communities ({groups.length})
            </h4>
            <span className="text-xs text-[var(--sanctra-muted)]">Live community links</span>
          </div>

          {groups.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {groups.map((g) => {
                const isOwner = g.createdById === uid;
                const isAdmin = g.adminIds?.includes(uid);
                const roleLabel = isOwner ? 'Owner' : isAdmin ? 'Admin' : 'Member';

                return (
                  <div
                    key={g.id}
                    className="p-4 rounded-xl bg-[var(--sanctra-surface)] border border-[var(--sanctra-glass-border)] space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          {g.isPublic ? (
                            <Globe size={14} className="text-sky-400" />
                          ) : (
                            <Lock size={14} className="text-amber-400" />
                          )}
                          <strong className="text-sm font-semibold text-[var(--sanctra-paper)]">{g.name}</strong>
                        </div>
                        <p className="text-xs text-[var(--sanctra-muted)] mt-0.5">
                          Room Code: <span className="font-mono text-[var(--sanctra-paper)] font-semibold">{g.roomCode}</span>
                        </p>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                          isOwner
                            ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                            : isAdmin
                            ? 'bg-sky-400/20 text-sky-300 border border-sky-400/30'
                            : 'bg-white/5 text-[var(--sanctra-muted)]'
                        }`}
                      >
                        {roleLabel}
                      </span>
                    </div>

                    {g.description && (
                      <p className="text-xs text-[var(--sanctra-muted)] line-clamp-2">{g.description}</p>
                    )}

                    <div className="pt-1 flex items-center justify-between text-xs text-[var(--sanctra-muted)] border-t border-[var(--sanctra-glass-border)]">
                      <span>{g.isPublic ? 'Public sanctuary' : 'Private circle'}</span>
                      {onInspectGroup && (
                        <button
                          type="button"
                          className="analytics-button text-[11px] py-1 px-2 flex items-center gap-1 text-[var(--sanctra-sage)] hover:text-white"
                          onClick={() => onInspectGroup(g.id)}
                        >
                          <span>Open in Groups</span>
                          <ArrowUpRight size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 p-4 rounded-xl border border-[var(--sanctra-glass-border)] bg-[var(--sanctra-surface)] text-xs text-[var(--sanctra-muted)]">
              This member hasn't joined or created any study groups yet.
            </div>
          )}
        </div>
      )}

      {/* TAB 5: PROFILE & SETTINGS */}
      {tab === 'profile' && (
        <div className="space-y-4 animate-in fade-in-50 duration-200">
          <div className="p-5 rounded-2xl bg-[var(--sanctra-surface)] border border-[var(--sanctra-glass-border)] space-y-4">
            <h4 className="text-sm font-semibold text-[var(--sanctra-paper)]">Member Profile & Configuration</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-[var(--sanctra-muted)]">Display Name</span>
                <p className="text-sm font-semibold text-[var(--sanctra-paper)]">
                  {data.settings.customDisplayName || 'None configured'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[var(--sanctra-muted)]">Focus Intent</span>
                <p className="text-sm font-semibold text-[var(--sanctra-paper)] capitalize">
                  {data.settings.focusIntent || 'Learning'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[var(--sanctra-muted)]">Timezone</span>
                <p className="text-sm font-semibold text-[var(--sanctra-paper)]">
                  {data.settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
                </p>
              </div>
            </div>

            {data.settings.statusMessage && (
              <div className="space-y-1 pt-2">
                <span className="text-xs text-[var(--sanctra-muted)]">Status Note</span>
                <blockquote className="p-3 rounded-xl bg-black/20 text-xs italic text-[var(--sanctra-paper)] border border-white/5">
                  “{data.settings.statusMessage}”
                </blockquote>
              </div>
            )}

            {data.settings.bio && (
              <div className="space-y-1">
                <span className="text-xs text-[var(--sanctra-muted)]">Bio / Study Goals</span>
                <p className="p-3 rounded-xl bg-white/[0.02] text-xs text-[var(--sanctra-paper)] border border-white/5 whitespace-pre-wrap">
                  {data.settings.bio}
                </p>
              </div>
            )}

            {/* Custom Subjects Roster */}
            <div className="space-y-2 pt-2 border-t border-[var(--sanctra-glass-border)]">
              <span className="text-xs text-[var(--sanctra-muted)]">Configured Subjects ({data.subjects.length})</span>
              <div className="flex flex-wrap gap-2">
                {data.subjects.map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10"
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-[var(--sanctra-paper)]">{s.name}</span>
                  </span>
                ))}
                {!data.subjects.length && <span className="text-xs text-[var(--sanctra-muted)]">No custom subjects</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
