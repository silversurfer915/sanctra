import { useState, useId } from 'react';
import { BookOpen, Check, ChevronDown, Plus, Minus, Sparkles, Star, Target, Trash2 } from 'lucide-react';
import type { JeeSyllabus, JeeSubject } from '../../types/jeetrack.ts';
import { Empty, subjects, subjectName, subjectColor } from './JeeUi.tsx';

type Props = {
  syllabus: JeeSyllabus;
  onToggleTheory: (s: JeeSubject, id: number) => void;
  onTogglePractice: (s: JeeSubject, id: number) => void;
  onIncrementRevision: (s: JeeSubject, id: number, delta?: number) => void;
  onOpenAddChapter: () => void;
  onScheduleRevision?:(s:JeeSubject,id:number)=>void;
  onLogPractice: (s: JeeSubject, id: number) => void;
  onStartFocus: (s: JeeSubject, id: number, kind: 'lecture' | 'practice' | 'revision' | 'mockAnalysis') => void;
  onDeleteChapter: (s: JeeSubject, id: number) => void;
};

export function JeeSyllabusView(p: Props) {
  const [subject, setSubject] = useState<JeeSubject>('physics');
  const [classLevel, setClassLevel] = useState<'all' | '11' | '12'>('all');
  const [section, setSection] = useState<'all' | 'physical' | 'inorganic' | 'organic'>('all');
  const [query, setQuery] = useState('');
  const [includeAdv, setIncludeAdv] = useState(true);
  const [openUnits, setOpenUnits] = useState<Record<string, boolean>>({});

  const filterId = useId();

  // Overall syllabus stats across all subjects
  const allChapters = Object.values(p.syllabus).flat();
  const mainsOnlyChapters = allChapters.filter((c) => !c.adv);
  const consideredChapters = includeAdv ? allChapters : mainsOnlyChapters;
  const totalChs = consideredChapters.length;
  const completeChs = consideredChapters.filter((c) => c.theory && c.practice).length;
  const partialChs = consideredChapters.filter((c) => (c.theory && !c.practice) || (!c.theory && c.practice)).length;
  const pendingChs = consideredChapters.filter((c) => !c.theory && !c.practice).length;
  const overallPct = totalChs ? Math.round((completeChs / totalChs) * 100) : 0;

  // Subject-wise stats
  const subjData = subjects.map((s) => {
    const chs = includeAdv ? p.syllabus[s] : p.syllabus[s].filter((c) => !c.adv);
    const done = chs.filter((c) => c.theory && c.practice).length;
    const pct = chs.length ? Math.round((done / chs.length) * 100) : 0;
    return { s, total: chs.length, done, pct, color: subjectColor(s) };
  });

  // Current filtered list for active subject
  const currentSubjectList = (p.syllabus[subject] || []).filter((c) => {
    if (!includeAdv && c.adv) return false;
    if (classLevel !== 'all' && c.class !== classLevel) return false;
    if (subject === 'chemistry' && section !== 'all' && c.section !== section) return false;
    if (query.trim() && !c.name.toLowerCase().includes(query.toLowerCase().trim())) return false;
    return true;
  });

  // Units grouping
  const units = [...new Set(currentSubjectList.map((c) => c.unit))];

  const toggleUnit = (unit: string) => {
    setOpenUnits((prev) => ({
      ...prev,
      [`${subject}-${unit}`]: prev[`${subject}-${unit}`] === false ? true : false,
    }));
  };

  const isUnitOpen = (unit: string, index: number) => {
    const key = `${subject}-${unit}`;
    if (openUnits[key] !== undefined) return openUnits[key];
    return index === 0 || query.trim().length > 0; // Default first unit open, or open all on search
  };

  // Ring calculations
  const ringSize = 96;
  const strokeWidth = 7;
  const radius = (ringSize - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (overallPct / 100) * circumference;

  return (
    <>
      {/* Page Header */}
      <div className="jee-heading">
        <div>
          <h1>Syllabus Tracker</h1>
          <p>
            Complete JEE Mains & Advanced chapter tracker with theory, practice, and revision progress.
          </p>
        </div>
        <div className="jee-actions">
          <button className="jee-primary" onClick={p.onOpenAddChapter}>
            <Plus size={16} /> Add custom chapter
          </button>
        </div>
      </div>

      {/* Hero Stats Card (Authentic jeetrack.in .syl-hero) */}
      <div className="syl-hero">
        <div className="syl-hero-top">
          {/* Circular SVG Ring */}
          <div className="syl-hero-ring">
            <svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`}>
              <defs>
                <linearGradient id="sylHeroRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#7c6af7" />
                  <stop offset="100%" stopColor="#f472b6" />
                </linearGradient>
              </defs>
              <circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.07)"
                strokeWidth={strokeWidth}
              />
              <circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={radius}
                fill="none"
                stroke="url(#sylHeroRingGrad)"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
                style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)' }}
              />
            </svg>
            <div className="syl-hero-pct">
              {overallPct}%<span>done</span>
            </div>
          </div>

          {/* 4 Counter Pills */}
          <div className="syl-hero-stats">
            <div className="syl-hero-stat">
              <div className="syl-hero-stat-num" style={{ color: '#34d399' }}>
                {completeChs}
              </div>
              <div className="syl-hero-stat-lbl">Complete</div>
            </div>
            <div className="syl-hero-stat">
              <div className="syl-hero-stat-num" style={{ color: '#fbbf24' }}>
                {partialChs}
              </div>
              <div className="syl-hero-stat-lbl">Partial</div>
            </div>
            <div className="syl-hero-stat">
              <div className="syl-hero-stat-num" style={{ color: '#94a3b8' }}>
                {pendingChs}
              </div>
              <div className="syl-hero-stat-lbl">Pending</div>
            </div>
            <div className="syl-hero-stat">
              <div className="syl-hero-stat-num" style={{ color: '#a78bfa' }}>
                {totalChs}
              </div>
              <div className="syl-hero-stat-lbl">Total</div>
            </div>
          </div>
        </div>

        {/* Overall Completion Bar */}
        <div className="syl-hero-bar-wrap">
          <div className="syl-hero-bar-label">
            <span>
              Overall completion{' '}
              {!includeAdv && (
                <span style={{ fontSize: '11px', color: 'var(--jee-tx-muted)' }}>(Mains only)</span>
              )}
            </span>
            <span style={{ fontWeight: 600, color: 'var(--jee-accent-light)' }}>
              {completeChs}/{totalChs}
            </span>
          </div>
          <div className="syl-hero-bar">
            <div className="syl-hero-bar-fill" style={{ width: `${overallPct}%` }} />
          </div>
        </div>

        {/* 3 Subject Progress Cards */}
        <div className="syl-subj-bars">
          {subjData.map((d) => (
            <div
              key={d.s}
              className="syl-subj-bar-item"
              style={{
                borderColor: subject === d.s ? d.color : undefined,
                cursor: 'pointer',
              }}
              onClick={() => setSubject(d.s)}
            >
              <div className="syl-subj-bar-hd">
                <span style={{ color: d.color }}>{subjectName(d.s)}</span>
                <span style={{ color: d.color }}>{d.pct}%</span>
              </div>
              <div className="syl-subj-bar-track">
                <div className="syl-subj-bar-fill" style={{ width: `${d.pct}%`, background: d.color }} />
              </div>
              <div className="syl-subj-bar-meta">
                {d.done}/{d.total} chapters
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Official Syllabus Links */}
      <p className="jee-note syl-sources">
        <a href="https://jeemain.nta.nic.in/document/syllabus-2026/" target="_blank" rel="noreferrer">
          Official JEE Mains 2026 syllabus
        </a>{' '}
        ·{' '}
        <a href="https://jeeadv.ac.in/documents/jee-advanced-2026-syllabus.pdf" target="_blank" rel="noreferrer">
          Official JEE Advanced 2026 syllabus
        </a>
      </p>

      {/* Filters Toolbar */}
      <div className="jee-filters syl-filters">
        {/* Subject Switcher */}
        <div className="jee-segments" aria-label="Select subject">
          {subjects.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={subject === s}
              onClick={() => setSubject(s)}
              style={
                subject === s
                  ? {
                      borderColor: subjectColor(s),
                    }
                  : undefined
              }
            >
              {subjectName(s)}
            </button>
          ))}
        </div>

        {/* Class Switcher */}
        <div className="jee-segments" aria-label="Select class">
          {(['all', '11', '12'] as const).map((lvl) => (
            <button
              key={lvl}
              type="button"
              aria-pressed={classLevel === lvl}
              onClick={() => setClassLevel(lvl)}
            >
              {lvl === 'all' ? 'All Classes' : `Class ${lvl}`}
            </button>
          ))}
        </div>

        {/* Chemistry Section Switcher (Physical / Inorganic / Organic) */}
        {subject === 'chemistry' && (
          <div className="jee-segments" aria-label="Chemistry section">
            {(
              [
                ['all', 'All Sections'],
                ['physical', 'Physical'],
                ['inorganic', 'Inorganic'],
                ['organic', 'Organic'],
              ] as const
            ).map(([sec, label]) => (
              <button
                key={sec}
                type="button"
                aria-pressed={section === sec}
                onClick={() => setSection(sec)}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Search Input */}
        <label className="jee-filter syl-search">
          Search chapters
          <input
            id={`${filterId}-search`}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by chapter name..."
          />
        </label>

        {/* Include Advanced Toggle */}
        <label className="jee-check">
          <input
            type="checkbox"
            checked={includeAdv}
            onChange={(e) => setIncludeAdv(e.target.checked)}
          />
          Include Advanced (ADV)
        </label>
      </div>

      {/* Chapters Units Accordion */}
      {units.length > 0 ? (
        <div className="syl-units-list">
          {units.map((unit, unitIdx) => {
            const unitChs = currentSubjectList.filter((c) => c.unit === unit);
            const unitDone = unitChs.filter((c) => c.theory && c.practice).length;
            const unitPct = unitChs.length ? Math.round((unitDone / unitChs.length) * 100) : 0;
            const open = isUnitOpen(unit, unitIdx);
            const col = subjectColor(subject);

            return (
              <div key={`${subject}-${unit}`} className="syl-unit">
                {/* Unit Header */}
                <div
                  className={`syl-unit-hd ${open ? 'open' : ''}`}
                  onClick={() => toggleUnit(unit)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleUnit(unit);
                    }
                  }}
                  aria-expanded={open}
                >
                  <div className="syl-unit-hd-left">
                    <div className="syl-unit-dot" style={{ backgroundColor: col, color: col }} />
                    <div>
                      <div className="syl-unit-title" style={{ color: col }}>
                        {unit}
                      </div>
                      <div className="syl-unit-meta">
                        {unitChs.length} chapters · {unitDone}/{unitChs.length} done
                      </div>
                    </div>
                  </div>

                  <div className="syl-unit-hd-right">
                    <div className="syl-unit-prog-wrap">
                      <div className="syl-unit-prog-bar">
                        <div
                          className="syl-unit-prog-fill"
                          style={{ width: `${unitPct}%`, background: col }}
                        />
                      </div>
                      <span className="syl-unit-pct">{unitPct}%</span>
                    </div>
                    <ChevronDown size={18} className="syl-unit-chevron" />
                  </div>
                </div>

                {/* Unit Chapters Body */}
                {open && (
                  <div className="syl-unit-body">
                    {unitChs.map((c) => {
                      const isComplete = c.theory && c.practice;
                      const idx = c.id % 100 || c.id;
                      const numStr = idx < 10 ? `0${idx}` : `${idx}`;
                      const isCustom = c.id > 1000;

                      return (
                        <div
                          key={c.id}
                          className={`syl-chapter ${isComplete ? 'ch-complete' : ''}`}
                        >
                          {/* Chapter Number Badge */}
                          <div className="ch-num">
                            {isCustom ? <Sparkles size={14} /> : numStr}
                          </div>

                          {/* Chapter Name & Badges */}
                          <div className="ch-info">
                            <div className="ch-name">{c.name}</div>
                            <div className="ch-meta">
                              <span className="ch-class-badge">Class {c.class}</span>
                              {c.adv && (
                                <span className="ch-adv-badge">
                                  <Star size={10} fill="currentColor" /> ADV
                                </span>
                              )}
                              {isCustom && (
                                <span
                                  className="ch-adv-badge"
                                  style={{
                                    background: 'rgba(244,114,182,0.12)',
                                    color: '#f472b6',
                                    borderColor: 'rgba(244,114,182,0.25)',
                                  }}
                                >
                                  Custom
                                </span>
                              )}
                              {isComplete && (
                                <span className="ch-done-badge">
                                  <Check size={10} /> Complete
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Chapter Toggles & Actions */}
                          <div className="ch-toggles">
                            {/* Theory Button */}
                            <button
                              type="button"
                              className={`ch-toggle tog-theory ${c.theory ? 'tog-on' : ''}`}
                              onClick={() => p.onToggleTheory(subject, c.id)}
                              aria-pressed={c.theory}
                            >
                              <div className="ch-toggle-dot" />
                              <BookOpen size={12} />
                              Theory
                            </button>

                            {/* Practice Button */}
                            <button
                              type="button"
                              className={`ch-toggle tog-practice ${c.practice ? 'tog-on' : ''}`}
                              onClick={() => p.onTogglePractice(subject, c.id)}
                              aria-pressed={c.practice}
                            >
                              <div className="ch-toggle-dot" />
                              <Check size={12} />
                              Practice
                            </button>

                            {/* Quick Action: Log Practice Questions */}
                            <button
                              type="button"
                              className="ch-quick-btn"
                              onClick={() => p.onLogPractice(subject, c.id)}
                              title={`Log questions for ${c.name}`}
                              aria-label={`Log questions for ${c.name}`}
                            >
                              <Target size={15} />
                            </button>

<button type="button" onClick={()=>p.onScheduleRevision?.(subject,c.id)}>Plan revision</button>
                            {/* Revision Counter */}
                            <div className="ch-rev-wrap">
                              <button
                                type="button"
                                className="ch-rev-btn"
                                onClick={() => p.onIncrementRevision(subject, c.id, -1)}
                                disabled={!c.revisions}
                                title="Decrease revision count"
                                aria-label={`Decrease revision for ${c.name}`}
                              >
                                <Minus size={12} />
                              </button>
                              <span className="ch-rev-count" title="Number of revisions">
                                {c.revisions || 0} rev
                              </span>
                              <button
                                type="button"
                                className="ch-rev-btn"
                                onClick={() => p.onIncrementRevision(subject, c.id, 1)}
                                title="Increase revision count"
                                aria-label={`Increase revision for ${c.name}`}
                              >
                                <Plus size={12} />
                              </button>
                            </div>

                            {/* Focus Button */}
                            <button
                              type="button"
                              className="ch-quick-btn"
                              onClick={() => p.onStartFocus(subject, c.id, 'practice')}
                              title="Start timer session for this chapter"
                              aria-label={`Start timer for ${c.name}`}
                            >
                              Focus
                            </button>

                            {/* Delete Button for Custom Chapter */}
                            {isCustom && (
                              <button
                                type="button"
                                className="ch-quick-btn"
                                style={{ color: 'var(--jee-danger)' }}
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Remove custom chapter "${c.name}"? Existing practice logs remain in your history.`
                                    )
                                  ) {
                                    p.onDeleteChapter(subject, c.id);
                                  }
                                }}
                                title="Delete custom chapter"
                                aria-label={`Delete custom chapter ${c.name}`}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <Empty action={<button onClick={() => setQuery('')}>Clear search</button>}>
          No chapters match the selected filters.
        </Empty>
      )}
    </>
  );
}
