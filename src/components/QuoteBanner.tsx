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
    <div className="timer-quote w-full max-w-2xl mx-auto px-4 py-2 my-2 sm:my-3">
      <div className="flex items-center justify-between gap-3 px-4 py-2 rounded-full glass-pill border border-white/12 shadow-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <Quote className="w-3.5 h-3.5 text-emerald-400 shrink-0 opacity-80" />
          <p key={index} className="quote-line text-xs sm:text-sm font-display italic text-slate-200 tracking-wide">
            "{STUDY_QUOTES[index]}"
          </p>
        </div>

        <button
          onClick={nextQuote}
          aria-label="New motivational quote"
          title="Cycle quote"
          className="p-2 min-w-11 min-h-11 rounded-full text-slate-400 hover:text-emerald-300 hover:bg-white/5 transition-all shrink-0 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
