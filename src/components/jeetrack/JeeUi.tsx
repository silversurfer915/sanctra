import { useEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import type { JeeSubject } from '../../types/jeetrack.ts';

export const subjects: JeeSubject[] = ['physics', 'chemistry', 'maths'];

export const subjectName = (s: string) => {
  if (s === 'maths') return 'Mathematics';
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const subjectColor = (s: string) => {
  switch (s) {
    case 'physics':
      return '#38bdf8';
    case 'chemistry':
      return '#34d399';
    case 'maths':
      return '#fbbf24';
    default:
      return '#a78bfa';
  }
};

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const dateLabel = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

export const hoursLabel = (h: number) => {
  const totalM = Math.round(h * 60);
  const hrs = Math.floor(totalM / 60);
  const mins = totalM % 60;
  return `${hrs}h ${mins}m`;
};

export function Empty({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="jee-empty">
      <div className="jee-empty-icon" aria-hidden="true">✦</div>
      <p>{children}</p>
      {action && <div className="jee-empty-action">{action}</div>}
    </div>
  );
}

export function Panel({
  title,
  children,
  action,
  subtitle,
  className = '',
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  subtitle?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`jee-panel ${className}`.trim()}>
      <div className="jee-section-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p className="jee-panel-sub">{subtitle}</p>}
        </div>
        {action && <div className="jee-section-action">{action}</div>}
      </div>
      {children}
    </section>
  );
}

export function SubjectSelect({
  value,
  onChange,
  all = true,
}: {
  value: string;
  onChange: (s: string) => void;
  all?: boolean;
}) {
  return (
    <label className="jee-filter">
      Subject
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {all && <option value="all">All subjects</option>}
        {subjects.map((s) => (
          <option key={s} value={s}>
            {subjectName(s)}
          </option>
        ))}
      </select>
    </label>
  );
}

export type RangeKind = 'today' | 'week' | 'month' | 'all' | 'custom';

export function useDateRange(defaultRange: RangeKind = 'week') {
  const [range, setRange] = useState<RangeKind>(defaultRange);
  const [start, setStart] = useState(today());
  const [end, setEnd] = useState(today());
  const now = today();
  let from = '',
    to = now;

  if (range === 'today') from = now;
  if (range === 'week' || range === 'month') {
    const d = new Date(`${now}T12:00:00`);
    d.setDate(d.getDate() - (range === 'week' ? 6 : 29));
    from = todayFor(d);
  }
  if (range === 'custom') {
    from = start;
    to = end;
  }

  return {
    range,
    setRange,
    start,
    setStart,
    end,
    setEnd,
    contains: (date: string) => (!from || date >= from) && date <= to,
    invalid: range === 'custom' && start > end,
  };
}

export function todayFor(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function DateFilters({ filter }: { filter: ReturnType<typeof useDateRange> }) {
  return (
    <div className="jee-date-filter-wrap">
      <div className="jee-segments" aria-label="Date range">
        {(
          [
            ['today', 'Today'],
            ['week', 'Last 7 days'],
            ['month', 'Last 30 days'],
            ['all', 'All time'],
            ['custom', 'Custom'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter.range === value}
            onClick={() => filter.setRange(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {filter.range === 'custom' && (
        <div className="jee-form-row jee-date-custom-row">
          <label>
            From
            <input type="date" value={filter.start} onChange={(e) => filter.setStart(e.target.value)} />
          </label>
          <label>
            To
            <input type="date" value={filter.end} min={filter.start} onChange={(e) => filter.setEnd(e.target.value)} />
          </label>
          {filter.invalid && <p role="alert" className="jee-form-error">The end date must be on or after the start date.</p>}
        </div>
      )}
    </div>
  );
}

export function Bars({
  items,
  unit = '',
}: {
  items: { label: string; value: number; color?: string }[];
  unit?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="jee-bars">
      {items.map((item, i) => {
        const pct = Math.max(0, Math.min(100, (item.value / max) * 100));
        return (
          <div className="jee-bar-item" key={`${item.label}-${i}`}>
            <span className="jee-bar-label">{item.label}</span>
            <div className="jee-bar-track">
              <span
                style={{
                  width: `${pct}%`,
                  background: item.color || undefined,
                }}
              />
            </div>
            <strong className="jee-bar-val">
              {Number(item.value.toFixed(1))}
              {unit}
            </strong>
          </div>
        );
      })}
    </div>
  );
}

export function ProgressRing({
  percent,
  size = 96,
  strokeWidth = 7,
  label = 'done',
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="syl-hero-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="sylRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7c6af7" />
            <stop offset="100%" stopColor="#f472b6" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#sylRingGrad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)' }}
        />
      </svg>
      <div className="syl-hero-pct">
        {clamped}%<span>{label}</span>
      </div>
    </div>
  );
}

export function Trend({
  items,
  percent = true,
}: {
  items: { label: string; value: number }[];
  percent?: boolean;
}) {
  if (!items.length) return <Empty>Log a mock test to see your score trend.</Empty>;

  const max = percent ? 100 : Math.max(1, ...items.map((i) => i.value));
  const min = Math.min(0, ...items.map((i) => i.value));
  const range = max - min || 1;

  const width = 600;
  const height = 180;
  const paddingX = 40;
  const topY = 24;
  const bottomY = 145;
  const chartH = bottomY - topY;

  const points = items.map((v, i) => {
    const x = paddingX + (i * (width - paddingX * 2)) / Math.max(1, items.length - 1);
    const y = bottomY - ((v.value - min) / range) * chartH;
    return { x, y, value: v.value, label: v.label };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPoints = `${points[0].x},${bottomY} ${polylinePoints} ${points[points.length - 1].x},${bottomY}`;

  return (
    <div className="jee-chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Score trend: ${items.map((i) => `${i.label}: ${i.value.toFixed(1)}${percent ? ' percent' : ' marks'}`).join('; ')}`}
      >
        <defs>
          <linearGradient id="trendAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c6af7" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#7c6af7" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        <line x1={paddingX} y1={topY} x2={width - paddingX} y2={topY} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
        <line x1={paddingX} y1={topY + chartH / 2} x2={width - paddingX} y2={topY + chartH / 2} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
        <line x1={paddingX} y1={bottomY} x2={width - paddingX} y2={bottomY} stroke="rgba(255,255,255,0.12)" />

        {/* Y Axis labels */}
        <text x="6" y={topY + 4} className="jee-chart-axis-label">
          {max}{percent ? '%' : ''}
        </text>
        <text x="6" y={topY + chartH / 2 + 4} className="jee-chart-axis-label">
          {Math.round((max + min) / 2)}{percent ? '%' : ''}
        </text>
        <text x="6" y={bottomY + 4} className="jee-chart-axis-label">
          {min}
        </text>

        {/* Area fill under curve */}
        <polygon points={areaPoints} fill="url(#trendAreaGrad)" />

        {/* Main line */}
        <polyline
          points={polylinePoints}
          fill="none"
          stroke="#a78bfa"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((p, i) => (
          <g key={i} className="jee-chart-point">
            <circle cx={p.x} cy={p.y} r="5" fill="#7c6af7" stroke="#ffffff" strokeWidth="2" />
            <title>{`${p.label}: ${p.value.toFixed(1)}${percent ? '%' : ' marks'}`}</title>
          </g>
        ))}
      </svg>
      <div className="jee-chart-dates">
        <span>{items[0].label}</span>
        <span>{items.at(-1)?.label}</span>
      </div>
    </div>
  );
}

export function StatCard({
  title,
  value,
  badge,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: ReactNode;
  badge?: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  color?: string;
}) {
  return (
    <div className="jee-stat-card">
      <div className="jee-stat-card-hd">
        <span className="jee-stat-card-title">{title}</span>
        {icon && <span className="jee-stat-card-icon" style={{ color }}>{icon}</span>}
      </div>
      <div className="jee-stat-card-main">
        <strong className="jee-stat-card-val" style={{ color }}>{value}</strong>
        {badge && <div className="jee-stat-card-badge">{badge}</div>}
      </div>
      {subtitle && <p className="jee-stat-card-sub">{subtitle}</p>}
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    return () => el?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className="jee-modal"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-label={title}
    >
      <div className="jee-modal-heading">
        <h2>{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close dialog" className="jee-modal-close-btn">
          <X size={18} />
        </button>
      </div>
      {children}
    </dialog>
  );
}

export function confirmDelete(label: string) {
  return window.confirm(`Delete ${label}? This removes this record from your JEE Track data.`);
}
