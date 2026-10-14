import React, { useState, useEffect } from 'react';
import { X, Play, Music, ExternalLink, Minimize2, Maximize2 } from 'lucide-react';
import { parseYouTubeUrl, POPULAR_STUDY_STREAMS, type YouTubeResource } from '../../utils/youtubeHelper.ts';

interface YouTubeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const YouTubeModal: React.FC<YouTubeModalProps> = ({ isOpen, onClose }) => {
  const [urlInput, setUrlInput] = useState('');
  const [activeResource, setActiveResource] = useState<YouTubeResource | null>(() =>
    parseYouTubeUrl(POPULAR_STUDY_STREAMS[0].url)
  );
  const [isCompact, setIsCompact] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleLoadUrl = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!urlInput.trim()) return;
    const parsed = parseYouTubeUrl(urlInput);
    if (!parsed) {
      setError('Please enter a valid YouTube video link, playlist link, or video ID.');
      return;
    }
    setError('');
    setActiveResource(parsed);
  };

  const handleSelectPreset = (url: string) => {
    setUrlInput(url);
    const parsed = parseYouTubeUrl(url);
    if (parsed) {
      setError('');
      setActiveResource(parsed);
    }
  };

  if (isCompact && activeResource) {
    return (
      <div className="fixed bottom-4 right-4 z-50 w-72 max-w-[calc(100vw-32px)] rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-slate-900/95 backdrop-blur-md animate-fade-in">
        <div className="flex items-center justify-between p-2 px-3 border-b border-white/10 bg-black/40">
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <Music size={13} className="text-emerald-400" />
            <span className="font-medium truncate max-w-[140px]">Focus Stream</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsCompact(false)}
              className="p-1 text-slate-400 hover:text-white rounded"
              title="Expand player"
            >
              <Maximize2 size={13} />
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-rose-400 rounded"
              title="Close player"
            >
              <X size={13} />
            </button>
          </div>
        </div>
        <div className="aspect-video w-full bg-black">
          <iframe
            src={activeResource.embedUrl}
            title="Sanctra YouTube Focus Stream"
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-2xl rounded-2xl border border-white/15 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/15 text-rose-300 border border-rose-500/30">
              <Music size={18} />
            </div>
            <div>
              <h2 className="text-lg font-serif text-slate-100">Distraction-Free Focus Stream</h2>
              <p className="text-xs text-slate-400">Play study music or ambient sounds while focusing</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeResource && (
              <button
                onClick={() => setIsCompact(true)}
                className="analytics-button text-xs py-1.5 px-2.5 flex items-center gap-1"
                title="Dock to mini player"
              >
                <Minimize2 size={14} /> Mini player
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-1"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Video Player */}
        {activeResource ? (
          <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-white/10 shadow-inner">
            <iframe
              src={activeResource.embedUrl}
              title="Sanctra YouTube Focus Stream"
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="aspect-video w-full rounded-xl flex items-center justify-center bg-black/40 border border-white/5 text-slate-500 text-sm">
            Enter a YouTube URL below or choose a stream
          </div>
        )}

        {/* Custom URL Input */}
        <form onSubmit={handleLoadUrl} className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Paste YouTube video or playlist URL (e.g. lofi, classical, nature)..."
              className="inbox-input flex-1 text-sm py-2"
            />
            <button type="submit" className="workspace-primary px-4 py-2 text-sm flex items-center gap-1.5">
              <Play size={14} /> Load
            </button>
          </div>
          {error && <p className="text-xs text-rose-400">{error}</p>}
        </form>

        {/* Suggested Streams */}
        <div className="space-y-1.5">
          <span className="text-xs text-slate-400 font-medium">Curated focus streams:</span>
          <div className="flex flex-wrap gap-2">
            {POPULAR_STUDY_STREAMS.map((s) => (
              <button
                key={s.title}
                type="button"
                onClick={() => handleSelectPreset(s.url)}
                className="analytics-button text-xs py-1 px-3 flex items-center gap-1.5"
              >
                <ExternalLink size={11} className="text-slate-400" />
                {s.title}
              </button>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-slate-500 pt-2 border-t border-white/5 leading-relaxed">
          Sanctra does not host or store YouTube media. Videos stream directly through YouTube&apos;s privacy-enhanced embed player.
        </p>
      </div>
    </div>
  );
};
