import React, { useState } from 'react';
import type { Subject } from '../../types/index.ts';
import { X, Layers, Plus, Trash2, Check, ShieldAlert } from 'lucide-react';

interface SubjectModalProps {
  categoryLabel?: string;
  children?: React.ReactNode;
  isOpen: boolean;
  subjects: Subject[];
  activeSubjectId?: string;
  trackingEnabled: boolean;
  onToggleTracking: (enabled: boolean) => void;
  onSelectActiveSubject: (id?: string) => void;
  onAddSubject: (name: string, color: string) => void;
  onDeleteSubject: (id: string) => void;
  onClose: () => void;
}

const COLOR_PALETTE = [
  '#B7CDEA', // Blue
  '#B9D6C6', // Emerald
  '#CCBDE7', // Purple
  '#E5BED3', // Pink
  '#E8CBA9', // Amber
  '#B4D8DF', // Cyan
  '#E7BDBE', // Rose
  '#B7D5D0', // Teal
  '#BEC3E6', // Indigo
  '#D1D8B7', // Lime
];

export const SubjectModal: React.FC<SubjectModalProps> = ({
  categoryLabel = 'Subjects',
  children,
  isOpen,
  subjects,
  activeSubjectId,
  trackingEnabled,
  onToggleTracking,
  onSelectActiveSubject,
  onAddSubject,
  onDeleteSubject,
  onClose,
}) => {
  const [newSubjectName, setNewSubjectName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0]);
  const [errorMsg, setErrorMsg] = useState('');

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const MAX_SUBJECTS = 15;
  const canAddMore = subjects.length < MAX_SUBJECTS;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSubjectName.trim();
    if (!trimmed) {
      setErrorMsg('Please enter a subject name');
      return;
    }
    if (trimmed.length > 40) {
      setErrorMsg('Subject name must be 40 characters or fewer');
      return;
    }
    if (subjects.some(s => s.name.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMsg('A subject with this name already exists');
      return;
    }
    if (!canAddMore) {
      setErrorMsg(`Maximum of ${MAX_SUBJECTS} subjects reached`);
      return;
    }

    onAddSubject(trimmed, selectedColor);
    setNewSubjectName('');
    setErrorMsg('');
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div 
        className="w-full max-w-lg glass-modal subject-manager rounded-3xl p-6 sm:p-7 relative border border-white/15 shadow-2xl max-h-[90vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-subject-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 id="modal-subject-title" className="text-lg font-bold text-white tracking-tight">
                {categoryLabel}
              </h2>
              <p className="text-xs text-slate-400">
                Choose a category for your focus time ({subjects.length}/{MAX_SUBJECTS})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tracking Enable / Disable Toggle */}
        <div className="mt-4 p-3.5 rounded-2xl bg-slate-900/60 border border-white/10 flex items-center justify-between shrink-0">
          <div>
            <div className="text-sm font-semibold text-white">Enable tracking</div>
            <div className="text-xs text-slate-400">
              Organize your focus time in this space
            </div>
          </div>

          <button type="button" role="switch" aria-label="Focus category tracking" aria-checked={trackingEnabled} onClick={()=>onToggleTracking(!trackingEnabled)} className="subject-toggle"><span /></button>
        </div>

        {trackingEnabled && children}
        {/* Add Subject Form */}
        {trackingEnabled && canAddMore && (
          <form onSubmit={handleCreate} className="mt-4 shrink-0">
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/10">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Add an item
              </label>

              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  maxLength={40}
                  placeholder="e.g. Mathematics, Design, Evening reflection"
                  value={newSubjectName}
                  onChange={(e) => {
                    setNewSubjectName(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                />

                <button
                  type="submit"
                  disabled={!newSubjectName.trim()}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-md shadow-emerald-500/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add</span>
                </button>
              </div>

              {/* Color Picker */}
              <div className="flex items-center gap-2.5 py-2.5 px-1 overflow-x-auto">
                <span className="text-xs font-semibold text-slate-400 mr-0.5 shrink-0">Color:</span>
                {COLOR_PALETTE.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Subject color ${color}`}
                    aria-pressed={selectedColor === color}
                    onClick={() => setSelectedColor(color)}
                    style={{ backgroundColor: `color-mix(in srgb, ${color} 82%, var(--sanctra-sage))` }}
                    className={`w-6 h-6 rounded-full transition-all shrink-0 cursor-pointer flex items-center justify-center ${
                      selectedColor === color
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-950'
                        : 'opacity-75 hover:opacity-100'
                    }`}
                  >
                    {selectedColor === color && (
                      <Check className="w-3.5 h-3.5 stroke-[3]" style={{ color: 'var(--sanctra-ink)' }} />
                    )}
                  </button>
                ))}
              </div>

              {errorMsg && (
                <div className="flex items-center gap-1.5 text-xs text-rose-400 mt-2 font-medium">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          </form>
        )}

        {/* Subjects List */}
        <div className="mt-4 flex-1 overflow-y-auto pr-1 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider px-1 mb-1">
            <span>Your items</span>
            <span>Select for timer</span>
          </div>

          {subjects.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-400 rounded-2xl bg-slate-900/30 border border-dashed border-white/10">
              No subjects added yet. Add one above to start tracking!
            </div>
          ) : (
            subjects.map((sub) => {
              const isActive = activeSubjectId === sub.id;

              return (
                <div
                  key={sub.id}
                  onClick={() => onSelectActiveSubject(isActive ? undefined : sub.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer group ${
                    isActive
                      ? 'bg-emerald-500/15 border-emerald-500/40 shadow-md shadow-emerald-500/10'
                      : 'bg-slate-900/40 border-white/5 hover:border-white/20 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 ring-2 ring-white/15"
                      style={{ backgroundColor: `color-mix(in srgb, ${sub.color} 55%, var(--sanctra-sage))` }}
                    />
                    <span className="text-sm font-semibold text-white truncate">
                      {sub.name}
                    </span>
                    {isActive && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                        Selected
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSubject(sub.id);
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 opacity-60 group-hover:opacity-100 transition-all cursor-pointer"
                      title="Delete subject"
                      aria-label={`Delete subject ${sub.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-white/10 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
