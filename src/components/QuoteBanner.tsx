import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';

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
    <div className="timer-quote w-full max-w-xl mx-auto px-4 py-0.5 select-none">
      <div
        className="flex items-center justify-between gap-3 px-4 py-1.5 rounded-full border border-white/10 bg-black/30 backdrop-blur-xl transition-all shadow-sm"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[var(--theme-accent,#fef08a)] font-serif text-sm leading-none select-none opacity-80">“</span>
          <p key={index} className="quote-line text-xs sm:text-sm italic text-white/90 tracking-wide truncate font-sans">
            {STUDY_QUOTES[index]}
          </p>
          <span className="text-[var(--theme-accent,#fef08a)] font-serif text-sm leading-none select-none opacity-80">”</span>
        </div>

        <button
          onClick={nextQuote}
          aria-label="New motivational quote"
          title="Cycle quote"
          className="p-1.5 rounded-full text-slate-400 hover:text-[var(--theme-accent,#fef08a)] hover:bg-white/10 transition-all shrink-0 cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
