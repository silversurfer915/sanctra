import {getCalendarEvents} from '../features/calendar/calendarStorage.ts';
import {activeWorkspace,workspaceSettings} from './workspaces.ts';
import type { StudySession, Subject, UserSettings, TimerDraft, WallpaperPreset, AvatarPreset, TaskItem } from '../types/index.ts';

export const DEFAULT_SUBJECTS: Subject[] = [
  { id: 'sub-1', name: 'Mathematics', color: '#B7CDEA', createdAt: Date.now() - 50000 },
  { id: 'sub-2', name: 'Physics', color: '#B9D6C6', createdAt: Date.now() - 40000 },
  { id: 'sub-3', name: 'Chemistry', color: '#E5BED3', createdAt: Date.now() - 30000 },
  { id: 'sub-4', name: 'Computer Science', color: '#E8CBA9', createdAt: Date.now() - 20000 },
  { id: 'sub-5', name: 'Literature', color: '#CCBDE7', createdAt: Date.now() - 10000 },
];

export {THEME_PALETTES, PRESET_THEME_MAP, getThemeName} from './wallpaperTheme.ts';
export type {ThemeName} from './wallpaperTheme.ts';
export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  {id:'wp-video-lofi-meadow',name:'Sunlit Meadow',category:'Illustrated · Video',type:'motion',isPlusOnly:true,url:'/backgrounds/video/quality-v4/lofi-meadow-poster.jpg',thumbnail:'/backgrounds/video/quality-v4/lofi-meadow-poster.jpg',motionUrl:'/backgrounds/video/quality-v4/lofi-meadow.mp4'},
  {id:'wp-art-rain',name:'Cloudside Study Desk',category:'Illustrated · Blue Mist',type:'scenic',url:'/backgrounds/illustrated-study-desk.v2.webp',thumbnail:'/backgrounds/illustrated-study-desk.thumb.v2.webp'},
  {id:'wp-art-lavender-lake',name:'Lavender Lake',category:'Illustrated · Lavender',type:'scenic',url:'/backgrounds/illustrated-lavender-lake.v2.webp',thumbnail:'/backgrounds/illustrated-lavender-lake.thumb.v2.webp'},
  {id:'wp-art-sand-nook',name:'Golden Reading Nook',category:'Illustrated · Warm Sand',type:'scenic',url:'/backgrounds/illustrated-sand-nook.webp',thumbnail:'/backgrounds/illustrated-sand-nook.thumb.webp'},
  {id:'wp-art-rose-terrace',name:'Rose Garden Terrace',category:'Illustrated · Soft Rose',type:'scenic',url:'/backgrounds/illustrated-rose-terrace.webp',thumbnail:'/backgrounds/illustrated-rose-terrace.thumb.webp'},
  {id:'wp-art-charcoal-library',name:'Moonlit Library',category:'Illustrated · Charcoal',type:'scenic',url:'/backgrounds/illustrated-charcoal-library.webp',thumbnail:'/backgrounds/illustrated-charcoal-library.thumb.webp'},

  // Curated real scenery with matching full-resolution posters.
  {id:'wp-plus-observatory',name:'Cloudline Peaks',category:'Plus+ Sanctuary · Alpine',type:'scenic',url:'/backgrounds/landing-starlit-observatory-v1.webp',thumbnail:'/backgrounds/landing-starlit-observatory-v1.webp',isPlusOnly:true},
  {id:'wp-plus-kyoto',name:'River Retreat',category:'Plus+ Sanctuary · Nature',type:'scenic',url:'/backgrounds/landing-sunlit-sanctuary-v1.webp',thumbnail:'/backgrounds/landing-sunlit-sanctuary-v1.webp',isPlusOnly:true},
  {id:'wp-video-ocean',name:'Ocean Stillness',category:'Plus+ Video · Ocean',type:'motion',url:'/backgrounds/quality-v4/ocean-landing-hd-1920.webp',thumbnail:'/backgrounds/quality-v4/ocean-landing-hd-640.webp',isPlusOnly:true,motionUrl:'/backgrounds/video/quality-v4/ocean-landing-hd.mp4'},
  {id:'wp-motion-nebula',name:'River in the Gorge',category:'Plus+ Video · Nature',type:'motion',url:'/backgrounds/quality-v4/river-still-1920.webp',thumbnail:'/backgrounds/quality-v4/river-still-640.webp',isPlusOnly:true,motionUrl:'/backgrounds/video/quality-v4/river-still.mp4'},
  {id:'wp-motion-rain',name:'Rockpool Stream',category:'Plus+ Video · Nature',type:'motion',url:'/backgrounds/quality-v4/stream-still-1920.webp',thumbnail:'/backgrounds/quality-v4/stream-still-640.webp',isPlusOnly:true,motionUrl:'/backgrounds/video/quality-v4/stream-still.mp4'},

  // Sanctra Plus+ Wallpaper Collection (36 Curated Art & Scenic Presets)
  {id:'wp-plus-abstract-cirrus',name:'Cirrus Dream',category:'Plus+ Abstract · Air',type:'scenic',url:'/backgrounds/plus-collection/abstract-cirrus.webp',thumbnail:'/backgrounds/plus-collection/abstract-cirrus.thumb.webp',isPlusOnly:true},
  {id:'wp-plus-abstract-crt',name:'CRT Luminescence',category:'Plus+ Abstract · Retro',type:'scenic',url:'/backgrounds/plus-collection/abstract-crt.webp',thumbnail:'/backgrounds/plus-collection/abstract-crt.thumb.webp',isPlusOnly:true},
  {id:'wp-plus-abstract-dove',name:'White Dove Serenity',category:'Plus+ Abstract · Minimal',type:'scenic',url:'/backgrounds/plus-collection/abstract-dove.webp',thumbnail:'/backgrounds/plus-collection/abstract-dove.thumb.webp',isPlusOnly:true},
  {id:'wp-plus-abstract-fleur',name:'Fleur Bloom',category:'Plus+ Abstract · Floral',type:'scenic',url:'/backgrounds/plus-collection/abstract-fleur.webp',thumbnail:'/backgrounds/plus-collection/abstract-fleur.thumb.webp',isPlusOnly:true},
  {id:'wp-plus-abstract-lavender',name:'Lavender Fold',category:'Plus+ Abstract · Minimal',type:'scenic',url:'/backgrounds/plus-collection/abstract-lavender.webp',thumbnail:'/backgrounds/plus-collection/abstract-lavender.thumb.webp',isPlusOnly:true},
  {id:'wp-plus-abstract-pink-ripple',name:'Pink Ripple Wave',category:'Plus+ Abstract · Pastel',type:'scenic',url:'/backgrounds/plus-collection/abstract-pink-ripple.webp',thumbnail:'/backgrounds/plus-collection/abstract-pink-ripple.thumb.webp',isPlusOnly:true},
  {id:'wp-plus-abstract-pink-silk',name:'Pink Silk Drapes',category:'Plus+ Abstract · Silk',type:'scenic',url:'/backgrounds/plus-collection/abstract-pink-silk.webp',thumbnail:'/backgrounds/plus-collection/abstract-pink-silk.thumb.webp',isPlusOnly:true},
  {id:'wp-plus-abstract-prism',name:'Prismatic Glow',category:'Plus+ Abstract · Light',type:'scenic',url:'/backgrounds/plus-collection/abstract-prism.webp',thumbnail:'/backgrounds/plus-collection/abstract-prism.thumb.webp',isPlusOnly:true},
  {id:'wp-plus-abstract-rainbow-road',name:'Rainbow Ribbon',category:'Plus+ Abstract · Vibrant',type:'scenic',url:'/backgrounds/plus-collection/abstract-rainbow-road.webp',thumbnail:'/backgrounds/plus-collection/abstract-rainbow-road.thumb.webp',isPlusOnly:true},
  {id:'wp-plus-abstract-ripple',name:'Midnight Ripple',category:'Plus+ Abstract · Water',type:'scenic',url:'/backgrounds/plus-collection/abstract-ripple.webp',thumbnail:'/backgrounds/plus-collection/abstract-ripple.thumb.webp',isPlusOnly:true},
  {id:'wp-plus-abstract-sonar',name:'Sonar Pulse',category:'Plus+ Abstract · Tech',type:'scenic',url:'/backgrounds/plus-collection/abstract-sonar.webp',thumbnail:'/backgrounds/plus-collection/abstract-sonar.thumb.webp',isPlusOnly:true},
  {id:'wp-plus-abstract-sunburst',name:'Golden Sunburst',category:'Plus+ Abstract · Solar',type:'scenic',url:'/backgrounds/plus-collection/abstract-sunburst.webp',thumbnail:'/backgrounds/plus-collection/abstract-sunburst.thumb.webp',isPlusOnly:true},

  {id:'wp-plus-scenic-austrian-alps',name:'Austrian Alps',category:'Plus+ Sanctuary · Alpine',type:'scenic',url:'/backgrounds/plus-collection/scenic-austrian-alps.webp',thumbnail:'/backgrounds/plus-collection/scenic-austrian-alps.thumb.webp',isPlusOnly:true},
  {id:'wp-plus-scenic-autumn-gazebo-park',name:'Autumn Gazebo Park',category:'Plus+ Sanctuary · Autumn',type:'scenic',url:'/backgrounds/plus-collection/scenic-autumn-gazebo-park.webp',thumbnail:'/backgrounds/plus-collection/scenic-autumn-gazebo-park.thumb.webp',isPlusOnly:true},
  {id:'wp-plus-scenic-beach-sunset',name:'Sunset Coastline',category:'Plus+ Sanctuary · Coastal',type:'scenic',url:'/backgrounds/plus-collection/scenic-beach-sunset.webp',thumbnail:'/backgrounds/plus-collection/scenic-beach-sunset.thumb.webp',isPlusOnly:true},
  {id:'wp-plus-scenic-capri-summer',name:'Capri Summer',category:'Plus+ Sanctuary · Mediterranean',type:'scenic',url:'/backgrounds/plus-collection/scenic-capri-summer.webp',thumbnail:'/backgrounds/plus-collection/scenic-capri-summer.thumb.webp',isPlusOnly:true},
  {id:'wp-plus-scenic-coastal-breeze',name:'Coastal Breeze',category:'Plus+ Sanctuary · Ocean',type:'scenic',url:'/backgrounds/plus-collection/scenic-coastal-breeze.webp',thumbnail:'/backgrounds/plus-collection/scenic-coastal-breeze.thumb.webp',isPlusOnly:true},
  {id:'wp-plus-scenic-cotton-candy-sky',name:'Cotton Candy Sky',category:'Plus+ Sanctuary · Twilight',type:'scenic',url:'/backgrounds/plus-collection/scenic-cotton-candy-sky.webp',thumbnail:'/backgrounds/plus-collection/scenic-cotton-candy-sky.thumb.webp',isPlusOnly:true},
  {id:'wp-plus-scenic-dune-night',name:'Desert Night Dunes',category:'Plus+ Sanctuary · Desert',type:'scenic',url:'/backgrounds/plus-collection/scenic-dune-night.webp',thumbnail:'/backgrounds/plus-collection/scenic-dune-night.thumb.webp',isPlusOnly:true},
  {id:'wp-plus-scenic-dune-sunrise',name:'Desert Sunrise',category:'Plus+ Sanctuary · Desert',type:'scenic',url:'/backgrounds/plus-collection/scenic-dune-sunrise.webp',thumbnail:'/backgrounds/plus-collection/scenic-dune-sunrise.thumb.webp',isPlusOnly:true},
  {id:'wp-plus-scenic-dusk-peak',name:'Dusk Ridge Peak',category:'Plus+ Sanctuary · Alpine',type:'scenic',url:'/backgrounds/plus-collection/scenic-dusk-peak.webp',thumbnail:'/backgrounds/plus-collection/scenic-dusk-peak.thumb.webp',isPlusOnly:true},
  {id:'wp-plus-scenic-fall-central-park',name:'Central Park Foliage',category:'Plus+ Sanctuary · Autumn',type:'scenic',url:'/backgrounds/plus-collection/scenic-fall-central-park.webp',thumbnail:'/backgrounds/plus-collection/scenic-fall-central-park.thumb.webp',isPlusOnly:true},
  {id:'wp-plus-scenic-fuji-convenience',name:'Fuji City Lights',category:'Plus+ Sanctuary · Japan',type:'scenic',url:'/backgrounds/plus-collection/scenic-fuji-convenience.webp',thumbnail:'/backgrounds/plus-collection/scenic-fuji-convenience.thumb.webp',isPlusOnly:true},
  {id:'wp-plus-scenic-golden-gate-fog',name:'Pacific Fog Bridge',category:'Plus+ Sanctuary · Coastal',type:'scenic',url:'/backgrounds/plus-collection/scenic-golden-gate-fog.webp',thumbnail:'/backgrounds/plus-collection/scenic-golden-gate-fog.thumb.webp',isPlusOnly:true},
  {id:'wp-plus-scenic-lake-como-path',name:'Lake Como Pathway',category:'Plus+ Sanctuary · Italian Lakes',type:'scenic',url:'/backgrounds/plus-collection/scenic-lake-como-path.webp',thumbnail:'/backgrounds/plus-collection/scenic-lake-como-path.thumb.webp',isPlusOnly:true},
  {id:'wp-plus-scenic-lavender-field',name:'Provence Lavender Field',category:'Plus+ Sanctuary · Fields',type:'scenic',url:'/backgrounds/plus-collection/scenic-lavender-field.webp',thumbnail:'/backgrounds/plus-collection/scenic-lavender-field.thumb.webp',isPlusOnly:true},
  {id:'wp-plus-scenic-lofi-clouds',name:'Lo-Fi Sunset Clouds',category:'Plus+ Sanctuary · Dreamy',type:'scenic',url:'/backgrounds/plus-collection/scenic-lofi-clouds.webp',thumbnail:'/backgrounds/plus-collection/scenic-lofi-clouds.thumb.webp',isPlusOnly:true},
  {id:'wp-plus-scenic-minimalist-desert',name:'Minimal Desert Sands',category:'Plus+ Sanctuary · Desert',type:'scenic',url:'/backgrounds/plus-collection/scenic-minimalist-desert.webp',thumbnail:'/backgrounds/plus-collection/scenic-minimalist-desert.thumb.webp',isPlusOnly:true},
  {id:'wp-plus-scenic-morning-sakura',name:'Morning Sakura Canal',category:'Plus+ Sanctuary · Japan',type:'scenic',url:'/backgrounds/plus-collection/scenic-morning-sakura.webp',thumbnail:'/backgrounds/plus-collection/scenic-morning-sakura.thumb.webp',isPlusOnly:true},
  {id:'wp-plus-scenic-outer-space',name:'Deep Cosmos Nebula',category:'Plus+ Sanctuary · Cosmic',type:'scenic',url:'/backgrounds/plus-collection/scenic-outer-space.webp',thumbnail:'/backgrounds/plus-collection/scenic-outer-space.thumb.webp',isPlusOnly:true},
  {id:'wp-plus-scenic-sakura-street',name:'Cherry Blossom Street',category:'Plus+ Sanctuary · Japan',type:'scenic',url:'/backgrounds/plus-collection/scenic-sakura-street.webp',thumbnail:'/backgrounds/plus-collection/scenic-sakura-street.thumb.webp',isPlusOnly:true},
  {id:'wp-plus-scenic-superbloom',name:'Spring Superbloom',category:'Plus+ Sanctuary · Flowers',type:'scenic',url:'/backgrounds/plus-collection/scenic-superbloom.webp',thumbnail:'/backgrounds/plus-collection/scenic-superbloom.thumb.webp',isPlusOnly:true},
  {id:'wp-plus-scenic-tropical-river',name:'Tropical Rainforest River',category:'Plus+ Sanctuary · Tropical',type:'scenic',url:'/backgrounds/plus-collection/scenic-tropical-river.webp',thumbnail:'/backgrounds/plus-collection/scenic-tropical-river.thumb.webp',isPlusOnly:true},
  {id:'wp-plus-scenic-tuscan-village',name:'Tuscan Hill Village',category:'Plus+ Sanctuary · Italy',type:'scenic',url:'/backgrounds/plus-collection/scenic-tuscan-village.webp',thumbnail:'/backgrounds/plus-collection/scenic-tuscan-village.thumb.webp',isPlusOnly:true},
  {id:'wp-plus-scenic-western-town',name:'Frontier Town Dusk',category:'Plus+ Sanctuary · Western',type:'scenic',url:'/backgrounds/plus-collection/scenic-western-town.webp',thumbnail:'/backgrounds/plus-collection/scenic-western-town.thumb.webp',isPlusOnly:true},
  {id:'wp-plus-scenic-winter-cabin',name:'Snowbound Winter Cabin',category:'Plus+ Sanctuary · Winter',type:'scenic',url:'/backgrounds/plus-collection/scenic-winter-cabin.webp',thumbnail:'/backgrounds/plus-collection/scenic-winter-cabin.thumb.webp',isPlusOnly:true},

  // Subtle weather presets with ambient effects
  {id:'wp-weather-rain',name:'Gentle Rain',category:'Weather · Rain',type:'weather',weatherType:'rain',url:'/backgrounds/quality-v4/rain-still-1920.webp',thumbnail:'/backgrounds/quality-v4/rain-still-640.webp'},
  {id:'wp-weather-mist',name:'Morning Mist',category:'Weather · Mist',type:'weather',weatherType:'mist',url:'/backgrounds/quality-v4/lake-still-1920.webp',thumbnail:'/backgrounds/quality-v4/lake-still-640.webp'},
];

export const PLUS_AVATAR_PRESETS: AvatarPreset[] = [
  ...['moonstone','jade','solstice','rosewater'].map(id=>({id:'identity-'+id,name:{moonstone:'Moonstone',jade:'Jade Atelier',solstice:'Solstice',rosewater:'Rosewater'}[id]!,subtitle:'Animated illustrated portrait',url:'/avatars/identity-'+id+'.svg',isPlusOnly:true})),
  { id: 'av-cosmic-astro', name: 'Cosmic Astro', subtitle: 'Starlight explorer', url: '/avatars/plus-cosmic-astro.svg', isPlusOnly: true, mood: 'Cosmic & Focus' },
  { id: 'av-lofi-cat', name: 'Lofi Focus Cat', subtitle: 'Warm tea & lo-fi beats', url: '/avatars/plus-lofi-cat.svg', isPlusOnly: true, mood: 'Cozy & Chill' },
  { id: 'av-mystic-fox', name: 'Mystic Kitsune', subtitle: 'Spirit celestial fox', url: '/avatars/plus-mystic-fox.svg', isPlusOnly: true, mood: 'Mystical & Calm' },
  { id: 'av-zen-lotus', name: 'Sacred Bloom', subtitle: 'Mindful serenity', url: '/avatars/plus-zen-lotus.svg', isPlusOnly: true, mood: 'Serene & Zen' },
  { id: 'av-cyber-scholar', name: 'Chrono Scholar', subtitle: 'Futuristic deep work', url: '/avatars/plus-cyber-scholar.svg', isPlusOnly: true, mood: 'High-Tech & Sharp' },
  { id: 'av-starlight-whale', name: 'Celestial Leviathan', subtitle: 'Constellation swimmer', url: '/avatars/plus-starlight-whale.svg', isPlusOnly: true, mood: 'Vast & Ethereal' },
  { id: 'av-golden-phoenix', name: 'Solar Phoenix', subtitle: 'Radiant ember crest', url: '/avatars/plus-golden-phoenix.svg', isPlusOnly: true, mood: 'Triumphant & Bold' },
  { id: 'av-bonsai-spirit', name: 'Bonsai Sanctuary', subtitle: 'Floating sakura tree', url: '/avatars/plus-bonsai-spirit.svg', isPlusOnly: true, mood: 'Grounded & Nature' },
];

// Upgrade retired appearance IDs without touching any study records or other settings.
export function resolveWallpaperId(id: string): string {
  if (WALLPAPER_PRESETS.some(p => p.id === id)) return id;
  const legacy: Record<string, string> = {
    'wp-art-forest':'wp-weather-mist',
    'wp-plus-solarium':'wp-plus-scenic-tropical-river',
    'wp-motion-aurora':'wp-video-ocean',
    'wp-motion-embers':'wp-art-sand-nook',
    'wp-motion-sakura':'wp-motion-rain',
    'wp-video-rain-still':'wp-weather-rain',
    'wp-weather-lake':'wp-art-rain',

    'wp-grad-pine':'wp-weather-mist', 'wp-grad-zen':'wp-weather-mist',
    'wp-grad-amber':'wp-art-sand-nook', 'wp-grad-aurora':'wp-art-rain',
    'wp-grad-twilight':'wp-art-lavender-lake', 'wp-grad-obsidian':'wp-art-charcoal-library',
    'wp-sanctra-nordic':'wp-weather-mist', 'wp-sanctra-rain':'wp-art-rain',
    'wp-sanctra-library':'wp-art-rain', 'wp-sanctra-zen':'wp-weather-mist',
    'wp-sanctra-dawn':'wp-art-lavender-lake', 'wp-sanctra-solitude':'wp-art-lavender-lake',
    'wp-plus-aurora-spire':'wp-motion-rain',
    'wp-plus-grand-archive':'wp-motion-nebula',
    'wp-video-rain':'wp-motion-rain',
    'wp-plus-haven':'wp-plus-observatory',
    'wp-plus-library':'wp-motion-nebula',
    'wp-plus-rainy-lake':'wp-plus-kyoto',

    'wp-abstract-sage':'wp-weather-mist',
    'wp-abstract-warm':'wp-art-sand-nook',
    'wp-theme-sage':'wp-weather-mist',
    'wp-theme-sand':'wp-art-sand-nook',
    'wp-theme-blue':'wp-art-rain',
    'wp-theme-lavender':'wp-art-lavender-lake',
    'wp-theme-rose':'wp-art-rose-terrace',
    'wp-theme-charcoal':'wp-art-charcoal-library',
  };
  return legacy[id] || 'wp-art-rain';
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  jeeTrackOptIn:false,
  uiGlassBlur: 12,
  dailyGoalHours: 5,
  weeklyTargetHours: 30,
  subjectTrackingEnabled: true,
  activeSubjectId: 'sub-1',
  activeWallpaperId: 'wp-art-rain',
  wallpaperFitMode: 'fill',
  backgroundDimness: 25,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  avatarUrl: '',
  customDisplayName: '',
  soundAlertsEnabled: true,
  updatedAt: 0,
};

const STORAGE_KEYS = {
  SESSIONS: 'sanctra_sessions_v1',
  SUBJECTS: 'sanctra_subjects_v1',
  SETTINGS: 'sanctra_settings_v1',
  DRAFT: 'sanctra_timer_draft_v1',
};

export function getSessions(): StudySession[] {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEYS.SESSIONS) ||
      localStorage.getItem('groupstudytimer_sessions_v1') ||
      localStorage.getItem('aetherfocus_sessions_v1');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load sessions from storage', err);
    return [];
  }
}

export function saveSession(session: StudySession): void {
  try {
    const current = getSessions();
    const updated = [session, ...current];
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(updated));
  } catch (err) {
    throw new Error('Failed to save this study session.', { cause: err });
  }
}

export function persistSessions(sessions: StudySession[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  } catch (err) {
    console.error('Failed to persist sessions to storage', err);
  }
}

export function updateSession(session: StudySession): void {
  try {
    const current = getSessions();
    const updated = current.map(s => s.id === session.id ? session : s);
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to update session', err);
  }
}

export function deleteSession(id: string): void {
  try {
    const current = getSessions();
    const updated = current.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to delete session', err);
  }
}

export function clearAllSessions(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.SESSIONS);
    localStorage.removeItem('groupstudytimer_sessions_v1');
    localStorage.removeItem('aetherfocus_sessions_v1');
  } catch (err) {
    console.error('Failed to clear all sessions', err);
  }
}

export const STORAGE_KEYS_EXTRA = {
  TASKS: 'sanctra_tasks_v1',
};

export function getTasks(): TaskItem[] {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEYS_EXTRA.TASKS) ||
      localStorage.getItem('groupstudytimer_tasks_v1') ||
      localStorage.getItem('aetherfocus_tasks_v1');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

export function saveTasks(tasks: TaskItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS_EXTRA.TASKS, JSON.stringify(tasks));
  } catch (err) {
    console.error('Failed to save tasks', err);
  }
}

export function clearTasks(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS_EXTRA.TASKS);
    localStorage.removeItem('groupstudytimer_tasks_v1');
    localStorage.removeItem('aetherfocus_tasks_v1');
  } catch (err) {
    console.error('Failed to clear tasks', err);
  }
}

export function getSubjects(): Subject[] {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEYS.SUBJECTS) ||
      localStorage.getItem('groupstudytimer_subjects_v1') ||
      localStorage.getItem('aetherfocus_subjects_v1');
    if (!raw) {
      saveSubjects(DEFAULT_SUBJECTS);
      return DEFAULT_SUBJECTS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load subjects', err);
    return DEFAULT_SUBJECTS;
  }
}

export function saveSubjects(subjects: Subject[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects));
  } catch (err) {
    console.error('Failed to save subjects', err);
  }
}

export function resetSubjects(): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(DEFAULT_SUBJECTS));
    localStorage.removeItem('groupstudytimer_subjects_v1');
    localStorage.removeItem('aetherfocus_subjects_v1');
  } catch (err) {
    console.error('Failed to reset subjects', err);
  }
}

export function getSettingsStorageKey(userId?: string | null): string {
  if (userId) return `sanctra_settings_${userId}_v1`;
  return STORAGE_KEYS.SETTINGS;
}

export function getUserSettings(userId?: string | null): UserSettings {
  try {
    const userKey = getSettingsStorageKey(userId);
    const raw =
      localStorage.getItem(userKey) ||
      localStorage.getItem(STORAGE_KEYS.SETTINGS) ||
      localStorage.getItem('groupstudytimer_settings_v1') ||
      localStorage.getItem('aetherfocus_settings_v1');
    if (!raw) {
      saveUserSettings(DEFAULT_USER_SETTINGS, userId);
      return DEFAULT_USER_SETTINGS;
    }
    const parsed = JSON.parse(raw);
    // A legacy shared theme fallback must not inherit another account's Pomodoro rhythm.
    if (userId && !localStorage.getItem(userKey)) { delete parsed.pomodoroConfig; delete parsed.strictMode; delete parsed.jeeTrackOptIn; }

    const activeWallpaperId = resolveWallpaperId(parsed.activeWallpaperId || 'wp-weather-mist');

    const restored = {
      ...DEFAULT_USER_SETTINGS,
      ...parsed,
      jeeTrackOptIn:parsed.jeeTrackOptIn===true,
      uiGlassBlur: typeof parsed.uiGlassBlur === 'number' && Number.isFinite(parsed.uiGlassBlur) ? Math.max(0, Math.min(24, parsed.uiGlassBlur)) : 12,
      activeWallpaperId,
    };
    return restored.workspaces?.length ? workspaceSettings(restored,activeWorkspace(restored)) : restored;
  } catch (err) {
    console.error('Failed to load settings', err);
    return DEFAULT_USER_SETTINGS;
  }
}

export function saveUserSettings(settings: UserSettings, userId?: string | null): boolean {
  try {
    const withTimestamp = {
      ...settings,
      updatedAt: settings.updatedAt || Date.now(),
    };
    const userKey = getSettingsStorageKey(userId);
    localStorage.setItem(userKey, JSON.stringify(withTimestamp));
    // The account key is authoritative; the shared first-paint cache is best effort.
    if(userKey!==STORAGE_KEYS.SETTINGS){try{localStorage.setItem(STORAGE_KEYS.SETTINGS,JSON.stringify(withTimestamp));}catch{}}
    return true;
  } catch (err) {
    console.error('Failed to save settings', err);
    return false;
  }
}

export function resetUserSettings(): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_USER_SETTINGS));
    localStorage.removeItem('groupstudytimer_settings_v1');
    localStorage.removeItem('aetherfocus_settings_v1');
  } catch (err) {
    console.error('Failed to reset settings', err);
  }
}

export function getTimerDraft(): TimerDraft | null {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEYS.DRAFT) ||
      localStorage.getItem('groupstudytimer_timer_draft_v1') ||
      localStorage.getItem('aetherfocus_timer_draft_v1');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

export function saveTimerDraft(draft: TimerDraft): void {
  try {
    localStorage.setItem(STORAGE_KEYS.DRAFT, JSON.stringify(draft));
  } catch (err) {
    // Non-blocking
  }
}

export function clearTimerDraft(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.DRAFT);
  } catch (err) {
    // Non-blocking
  }
}

export function purgeSharedDeviceState(): void {
  clearAllSessions();
  clearTasks();
  clearTimerDraft();
  resetSubjects();
  resetUserSettings();
  try {
    localStorage.removeItem('sanctra_data_owner_v1');
  } catch {
    // Non-blocking
  }
}

export function persistAccountCache(
  userId: string,
  data: { sessions: StudySession[]; subjects: Subject[]; tasks: TaskItem[] },
  timerDraft?: TimerDraft | null,
  settings?: UserSettings
): void {
  if (!userId || localStorage.getItem('sanctra_signing_out') === 'true') return;
  try {
    localStorage.setItem(`sanctra_account_data_${userId}`, JSON.stringify({...data,calendarEvents:getCalendarEvents(userId)}));
    if (timerDraft) {
      localStorage.setItem(`sanctra_account_timer_${userId}`, JSON.stringify(timerDraft));
    }
    if (settings) {
      saveUserSettings(settings, userId);
    }
  } catch (err) {
    console.error('Failed to persist account cache', err);
  }
}

export function getAccountCache(userId: string): { sessions: StudySession[]; subjects: Subject[]; tasks: TaskItem[] } | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(`sanctra_account_data_${userId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
