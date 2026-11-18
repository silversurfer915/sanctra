import { formatDurationHuman } from '../../utils/time.ts';

export function FocusChart({
  values,
  labels,
  title,
}: {
  values: number[];
  labels: string[];
  title: string;
}) {
  const max = Math.max(1800, ...values);
  const hasData = values.some((v) => v > 0);

  return (
    <div className="analytics-bar-chart-wrap mt-5" role="region" aria-label={title}>
      {/* Chunky CSS Bar Chart on Ink Baseline */}
      <div className="analytics-bar-chart-stage">
        <div className="analytics-bar-chart-bars">
          {values.map((v, i) => {
            const pct = Math.max(0, Math.min(100, Math.round((v / max) * 100)));
            const hasFocus = v > 0;
            const durationStr = formatDurationHuman(Math.round(v));
            const dayLabel = labels[i] || '';

            return (
              <div
                key={i}
                className="analytics-bar-col"
                title={`${dayLabel}: ${durationStr}`}
              >
                {/* Bar area above ink baseline */}
                <div className="analytics-bar-track">
                  {hasFocus ? (
                    <div
                      className="analytics-bar-block"
                      style={{ height: `${Math.max(12, pct)}%` }}
                    >
                      {pct >= 28 && (
                        <span className="analytics-bar-val">{durationStr}</span>
                      )}
                    </div>
                  ) : (
                    <div className="analytics-bar-empty" />
                  )}
                </div>

                {/* Day label directly below ink baseline */}
                <div className="analytics-bar-foot">
                  <span className="analytics-bar-lbl">{dayLabel}</span>
                  {hasFocus && pct < 28 && (
                    <span className="analytics-bar-subval">{durationStr}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {!hasData && (
        <p className="text-xs text-center mt-3 text-ink-dim">
          No saved focus in this range yet. Save a session to see your bars grow.
        </p>
      )}
    </div>
  );
}

export function GoalRing({
  percent,
  label,
}: {
  percent: number;
  label: string;
}) {
  const fraction = Math.max(0, Math.min(100, percent));

  return (
    <div className="goal-ring relative w-28 h-28 shrink-0 flex items-center justify-center">
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full -rotate-90"
        aria-hidden="true"
      >
        {/* Chunky track */}
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="#efe2c6"
          stroke="var(--l-line, #2a2116)"
          strokeWidth="6"
        />
        {/* Chunky fill: no gradient, solid gold */}
        {fraction > 0 && (
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="var(--l-gold, #e9b44c)"
            strokeWidth="6"
            strokeLinecap="butt"
            pathLength="100"
            strokeDasharray={`${fraction} 100`}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <strong className="font-display text-xl font-bold text-ink leading-none">
          {Math.round(fraction)}%
        </strong>
        <span className="text-[10px] font-bold text-ink-dim uppercase tracking-wider mt-1">
          {label}
        </span>
      </div>
    </div>
  );
}
