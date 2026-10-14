import React, { useEffect } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';

interface ResetConfirmModalProps {
  isOpen: boolean;
  onConfirmReset: () => void;
  onClose: () => void;
}

export const ResetConfirmModal: React.FC<ResetConfirmModalProps> = ({
  isOpen,
  onConfirmReset,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div 
        className="reset-confirm-modal w-full max-w-sm glass-modal rounded-3xl p-6 relative border border-white/15 shadow-2xl text-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-reset-title"
      >
        <div className="reset-confirm-icon">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <h2 id="modal-reset-title" className="text-lg font-bold text-white tracking-tight">
          Reset this session?
        </h2>

        <p className="text-xs text-slate-300 mt-2 mb-5 leading-relaxed">
          Your unsaved focus time will be cleared. Save your session first if you want to keep it.
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white glass-pill cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => {
              onConfirmReset();
              onClose();
            }}
            className="reset-confirm-primary"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset timer</span>
          </button>
        </div>
      </div>
    </div>
  );
};
