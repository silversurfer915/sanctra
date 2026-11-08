import React, { useState } from 'react';
import { Quote, RefreshCw } from 'lucide-react';

const STUDY_QUOTES = [
  "Give this moment your attention. The rest can wait.",
  "One page, one problem, one small step forward.",
  "A little progress is still progress.",
  "You don’t have to finish everything. Just begin.",
  "Make room for focus. Make room for rest.",
  "Let your next session be a fresh start.",
  "Your pace is yours. Keep going gently.",
];

export const QuoteBanner: React.FC = () => {
  const [index, setIndex] = useState(0);

  const nextQuote = () => {
    setIndex((prev) => (prev + 1) % STUDY_QUOTES.length);
  };

  return (
    <div className="timer-quote w-full max-w-2xl mx-auto px-4 py-1.5 my-1 sm:my-2">
      <div
        className="flex items-center justify-between gap-3 px-5 py-2.5 rounded-full backdrop-blur-xl transition-all"
        style={{
          background: 'linear-gradient(135deg, rgba(22, 26, 40, 0.82) 0%, rgba(16, 18, 24, 0.88) 100%)',
          border: '1px solid var(--theme-card-border, rgba(255, 255, 255, 0.14))',
          boxShadow: '0 4px 20px var(--theme-card-glow, transparent)',
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Quote className="w-3.5 h-3.5 shrink-0 opacity-90 transition-colors" style={{ color: 'var(--theme-accent, #c4b5fd)' }} />
          <p key={index} className="quote-line text-xs sm:text-sm font-serif italic text-[#f5f2eb]/90 tracking-wide truncate">
            "{STUDY_QUOTES[index]}"
          </p>
        </div>

        <button
          onClick={nextQuote}
          aria-label="New motivational quote"
          title="Cycle quote"
          className="p-1.5 rounded-full text-slate-400 hover:text-[var(--theme-accent,#c4b5fd)] hover:bg-white/5 transition-all shrink-0 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
