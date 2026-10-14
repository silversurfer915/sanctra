import type { CSSProperties } from 'react';
import { Brand } from './Brand.tsx';
import './loading.css';
import { THEME_PALETTES, getThemeName } from '../utils/storage.ts';
import type {UserSettings} from '../types/index.ts';

export function LoadingScreen({ wallpaperId, settings }: { wallpaperId: string; settings?: UserSettings }) {
  const palette = THEME_PALETTES[getThemeName(wallpaperId)];
  const image = settings?.customWallpaperUrl || '/backgrounds/landing-screen-poster.jpg';
  return <div className="sanctra-loading" style={{'--sanctra-ink':palette.ink,'--sanctra-surface':palette.surface,'--sanctra-sage':palette.accent,'--sanctra-muted':palette.muted} as CSSProperties}>
    <img className="loading-scene" src={image} alt="" aria-hidden="true" />
    <div className="loading-veil" aria-hidden="true" />
    <div className="loading-arrival"><Brand /><span className="loading-arrival-rule" aria-hidden="true"><i/></span><span role="status" className="loading-arrival-status">Preparing your desk<span aria-hidden="true">…</span></span></div>
  </div>;
}
