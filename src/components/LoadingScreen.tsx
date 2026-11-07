import { useState, useEffect, type CSSProperties } from 'react';
import { Brand } from './Brand.tsx';
import { LandingAtmosphereCanvas } from './views/LandingAtmosphereCanvas.tsx';
import './loading.css';
import { THEME_PALETTES, getThemeName } from '../utils/storage.ts';
import type { UserSettings } from '../types/index.ts';

const LOADING_STAGES = [
  'Restoring botanical desk environment…',
  'Calibrating study exposure dial…',
  'Tuning binaural ambient soundscapes…',
  'Opening your focus sanctuary…',
];

export function LoadingScreen({ wallpaperId, settings }: { wallpaperId: string; settings?: UserSettings }) {
  const palette = THEME_PALETTES[getThemeName(wallpaperId)];
  const hasCustomImage = Boolean(settings?.customWallpaperUrl);
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState(24);

  useEffect(() => {
    const stageInterval = setInterval(() => {
      setStageIndex((prev) => (prev < LOADING_STAGES.length - 1 ? prev + 1 : prev));
    }, 700);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 96) return prev;
        const jump = Math.floor(Math.random() * 8) + 5;
        return Math.min(96, prev + jump);
      });
    }, 180);

    return () => {
      clearInterval(stageInterval);
      clearInterval(progressInterval);
    };
  }, []);

  const circumference = 2 * Math.PI * 72; // ~452.39
  const strokeDashoffset = circumference * (1 - progress / 100);
  const indicatorAngle = (progress / 100) * 360 - 90;
  const indRad = (indicatorAngle * Math.PI) / 180;
  const beadX = 80 + 72 * Math.cos(indRad);
  const beadY = 80 + 72 * Math.sin(indRad);

  return (
    <div
      className="sanctra-loading"
      style={{
        '--sanctra-ink': palette.ink,
        '--sanctra-surface': palette.surface,
        '--sanctra-sage': palette.accent,
        '--sanctra-muted': palette.muted,
      } as CSSProperties}
    >
      {hasCustomImage && (
        <img className="loading-scene" src={settings?.customWallpaperUrl} alt="" aria-hidden="true" />
      )}
      <div className="loading-veil" aria-hidden="true" />

      {/* Living Atmospheric Rain Streaks & Ambient Spores Canvas */}
      <LandingAtmosphereCanvas />

      {/* Archival Paper Texture Grain */}
      <div className="loading-grain" aria-hidden="true" />

      {/* Architectural Corner Crosshairs */}
      <span className="loading-crosshair loading-crosshair--tl" aria-hidden="true">+</span>
      <span className="loading-crosshair loading-crosshair--tr" aria-hidden="true">+</span>
      <span className="loading-crosshair loading-crosshair--bl" aria-hidden="true">+</span>
      <span className="loading-crosshair loading-crosshair--br" aria-hidden="true">+</span>

      {/* Top Architectural Ribbon */}
      <header className="loading-topbar" aria-hidden="true">
        <span className="loading-topbar__left">SANCTRA · WORKSPACE</span>
        <span className="loading-topbar__center">CYANOTYPE EXPOSURE // 440nm</span>
        <span className="loading-topbar__right">
          <span className="loading-dot" />
          CALM FOCUS
        </span>
      </header>

      {/* Central Cyanotype Botanical Focal Dial */}
      <main className="loading-stage">
        <div className="loading-dial-wrapper">
          {/* Subtle Outer Caustic Sunlight Core Pulse */}
          <div className="loading-sun-core" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#e5b869] animate-spin-slow" fill="none" stroke="currentColor" strokeWidth="1.75">
              <circle cx="12" cy="12" r="4" fill="rgba(229, 184, 105, 0.25)" />
              <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41" strokeLinecap="round" />
            </svg>
          </div>

          {/* Astronomical Degree Ticks & Exposure Ring */}
          <div className="loading-exposure-ring">
            <svg viewBox="0 0 160 160" className="w-full h-full">
              {/* Outer 12 hour graduation ticks */}
              {Array.from({ length: 24 }).map((_, i) => {
                const angle = (i * 360) / 24;
                const isMajor = i % 2 === 0;
                return (
                  <line
                    key={i}
                    x1="80"
                    y1={isMajor ? '2' : '4'}
                    x2="80"
                    y2={isMajor ? '8' : '6'}
                    stroke={isMajor ? 'rgba(229, 184, 105, 0.45)' : 'rgba(255, 255, 255, 0.12)'}
                    strokeWidth={isMajor ? '1.5' : '1'}
                    transform={`rotate(${angle} 80 80)`}
                  />
                );
              })}

              {/* Background Guide Circle */}
              <circle
                cx="80"
                cy="80"
                r="72"
                fill="none"
                stroke="rgba(255, 255, 255, 0.07)"
                strokeWidth="2"
              />

              {/* Glowing Amber Exposure Progress Arc */}
              <circle
                cx="80"
                cy="80"
                r="72"
                fill="none"
                stroke="#e5b869"
                strokeWidth="2.5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-300 ease-out -rotate-90 origin-center"
                style={{
                  filter: 'drop-shadow(0 0 10px rgba(229, 184, 105, 0.75))',
                }}
              />

              {/* Traveling Indicator Bead */}
              <circle
                cx={beadX}
                cy={beadY}
                r="3.5"
                fill="#fffdf8"
                stroke="#e5b869"
                strokeWidth="1.5"
                style={{
                  filter: 'drop-shadow(0 0 8px rgba(229, 184, 105, 1))',
                }}
              />
            </svg>
          </div>

          {/* Central Brand & Headline */}
          <div className="loading-dial-content">
            <Brand compact />
            <p className="loading-dial-sub">
              A little calm. <em>For deep study.</em>
            </p>
          </div>
        </div>

        {/* Tactile Progress Track & Status */}
        <div className="loading-track-box">
          <div className="loading-track-bar">
            <div
              className="loading-track-fill"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="loading-status-row">
            <span role="status" className="loading-status-text">
              {LOADING_STAGES[stageIndex]}
            </span>
            <span className="loading-status-pct tabular-nums">{progress}%</span>
          </div>
        </div>
      </main>

      {/* Bottom Frame Stamp */}
      <footer className="loading-bottombar" aria-hidden="true">
        <span>SPECIMEN NO. 08</span>
        <span>·</span>
        <span>LAT 13°N ARCHIVE</span>
        <span>·</span>
        <span>ZERO DISTRACTIONS · FREE FOREVER</span>
      </footer>
    </div>
  );
}
