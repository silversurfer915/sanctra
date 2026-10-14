import React, { useState } from 'react';
import { X, Users, Globe, Lock } from 'lucide-react';
import type { AuthUser, TimerMode } from '../../types/index.ts';
import type { StudyGroup } from '../../types/groups.ts';
import { createCustomStudyRoom } from '../../utils/groupsService.ts';

interface CreateRoomModalProps {
  isOpen: boolean;
  currentUser: AuthUser | null;
  onCreated: (room: StudyGroup) => void;
  onClose: () => void;
}

const CATEGORIES = [
  'Engineering / STEM',
  'Medical / Biology',
  'Writing & Research',
  'Languages & Reading',
  'School & University',
  'College & Higher Ed',
  'Deep Work / Flow',
];

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  currentUser,
  onCreated,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [timerMode, setTimerMode] = useState<TimerMode>('pomodoro-50');
  const [topic, setTopic] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isCreating) return;
    setIsCreating(true); setError('');
    try {

    const newRoom = await createCustomStudyRoom(
      {
        name,
        description,
        category,
        timerMode,
        topic,
        isPublic,
      },
      currentUser
    );

    onCreated(newRoom);
    onClose();
    } catch { setError('Unable to create this room. Check your connection and try again.'); }
    finally { setIsCreating(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900/95 border border-white/15 rounded-3xl shadow-2xl p-5 sm:p-6 text-slate-100 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Create Study Room
              </h2>
              <p className="text-xs text-slate-400">
                Host a virtual focus room for you and your study peers
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Create Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {error && <p role="alert" className="text-rose-300">{error}</p>}
          {/* Room Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Room Title *
            </label>
            <input
              type="text"
              required
              maxLength={60}
              placeholder="e.g. Late Night Organic Chemistry Grind"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
            />
          </div>

          {/* Category & Timer Mode Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/15 text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Default Timer Mode
              </label>
              <select
                value={timerMode}
                onChange={(e) => setTimerMode(e.target.value as TimerMode)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/15 text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
              >
                <option value="pomodoro-50">50m Pomodoro / 10m Break</option>
                <option value="pomodoro-25">25m Pomodoro / 5m Break</option>
                <option value="countup">Stopwatch (Free Run)</option>
                <option value="countdown-60">60m Countdown Block</option>
                <option value="countdown-120">120m Deep Work Block</option>
              </select>
            </div>
          </div>

          {/* Current Focus Topic */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Current Session Topic (Optional)
            </label>
            <input
              type="text"
              maxLength={80}
              placeholder="e.g. Chapter 4 Thermodynamics & Numerical Problems"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Room Description & Rules
            </label>
            <textarea
              rows={2}
              maxLength={160}
              placeholder="Brief guidelines (e.g. quiet desk presence, camera-optional, 50m intervals)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 resize-none"
            />
          </div>

          {/* Privacy Toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center gap-2.5">
              {isPublic ? (
                <Globe className="w-4 h-4 text-emerald-400" />
              ) : (
                <Lock className="w-4 h-4 text-[var(--sanctra-sage)]" />
              )}
              <div>
                <div className="text-xs font-semibold text-white">
                  {isPublic ? 'Public Focus Room' : 'Private Study Circle'}
                </div>
                <div className="text-[10px] text-slate-400">
                  {isPublic
                    ? 'Visible to all scholars in the Sanctra community'
                    : 'Saved to your personal study circles'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsPublic(!isPublic)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                isPublic
                  ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                  : 'border-[var(--sanctra-sage)]/40 bg-[var(--sanctra-sage)]/20 text-[var(--sanctra-sage)]'
              }`}
            >
              {isPublic ? 'Public' : 'Private'}
            </button>
          </div>

          {/* Form Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white font-semibold cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isCreating}
              className="btn-sheen px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-bold shadow-md shadow-emerald-500/20 cursor-pointer hover:brightness-110"
            >
              {isCreating ? 'Creating…' : 'Create room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
