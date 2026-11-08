import { useState, useEffect } from 'react';
import { Brand } from './Brand.tsx';
import { LandingAtmosphereCanvas } from './views/LandingAtmosphereCanvas.tsx';
import { getThemePreset, resolveThemeId } from '../utils/themeRegistry.ts';
import type { UserSettings } from '../types/index.ts';
import './loading.css';

const CALM_STAGES = [
  'Preparing your focus sanctuary…',
  'Harmonizing ambient atmosphere…',
  'Restoring your study desk…',
  'Ready.',
];

export function LoadingScreen({
  settings,
}: {
  wallpaperId?: string;
  settings?: UserSettings;
}) {
  const activeThemeId = resolveThemeId(settings?.activeThemeId);
  const theme = getThemePreset(activeThemeId);
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState(28);

  useEffect(() => {
    const stageInterval = setInterval(() => {
      setStageIndex((prev) => (prev < CALM_STAGES.length - 1 ? prev + 1 : prev));
    }, 600);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 98) return prev;
        const jump = Math.floor(Math.random() * 9) + 6;
        return Math.min(98, prev + jump);
      });
    }, 150);

    return () => {
      clearInterval(stageInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div
      className="sanctra-loading-v2"
      role="status"
      aria-live="polite"
      aria-label="Loading focus sanctuary"
    >
      {/* Deep Obsidian Radial Background Base */}
      <div className="loading-bg-base" aria-hidden="true" />

      {/* Dynamic Theme Pastel Core Glow */}
      <div
        className="loading-theme-glow"
        style={{
          background: `radial-gradient(circle, ${theme.accent}24 0%, ${theme.accent}08 45%, transparent 72%)`,
        }}
        aria-hidden="true"
      />

      {/* Living Atmospheric Starlight Spores & Rain Streaks */}
      <LandingAtmosphereCanvas />

      {/* Central Minimalist Glass Card */}
      <main className="loading-card">
        {/* Breathing Logo Emblem */}
        <div className="loading-emblem-wrap">
          <div
            className="loading-emblem-halo"
            style={{
              background: `radial-gradient(circle, ${theme.accent}35 0%, transparent 70%)`,
            }}
            aria-hidden="true"
          />
          <Brand />
        </div>

        {/* Editorial Subtitle */}
        <p className="loading-tagline">
          A little calm. <em>For deep study.</em>
        </p>

        {/* Refined Glass Progress Bar */}
        <div className="loading-progress-box">
          <div className="loading-track">
            <div
              className="loading-fill"
              style={{
                width: `${progress}%`,
                background: `linear-gradient(90deg, #FAF5FF 0%, ${theme.accent} 100%)`,
                boxShadow: `0 0 14px ${theme.accent}aa`,
              }}
            />
          </div>

          <div className="loading-meta-row">
            <span className="loading-stage-label">
              {CALM_STAGES[stageIndex]}
            </span>
            <span className="loading-pct-label tabular-nums">
              {progress}%
            </span>
          </div>
        </div>
      </main>

      {/* Elegant Bottom Footnote */}
      <footer className="loading-footer" aria-hidden="true">
        <span>Private & Encrypted</span>
        <span className="loading-footer-sep">·</span>
        <span>Zero Distractions</span>
        <span className="loading-footer-sep">·</span>
        <span>Free Forever</span>
      </footer>
    </div>
  );
}

export default LoadingScreen;
