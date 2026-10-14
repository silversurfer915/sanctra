import {PersonalIntegration} from './PersonalIntegration.tsx';
import {AccountPassword} from '../AccountPassword.tsx';
import {hasGoogleSignIn} from '../../utils/firebase.ts';
import {BackgroundChooser} from '../BackgroundChooser.tsx';
import React, { useState, useEffect, useRef } from 'react';
import './settings-interface.css';
import {
  X,
  AlertTriangle,
  Sliders,
  Volume2,
  VolumeX,
  Layers,
  LogOut,
  Upload,
  Palette,
} from 'lucide-react';
import type { UserSettings, AuthUser, UserSubscription } from '../../types/index.ts';
import { WALLPAPER_PRESETS, resolveWallpaperId } from '../../utils/storage.ts';
import { checkVideoSource } from '../../utils/vipMedia.ts';
import {checkWallpaperImageUrl,prepareWallpaperImage} from '../../utils/customWallpaper.ts';
import { isEntitlementActive } from '../../utils/subscriptionPlans.ts';

interface SettingsModalProps {
  isOpen: boolean;
  currentUser: AuthUser | null;
  settings: UserSettings;
  subscription?: UserSubscription | null;
  initialTab?: 'wallpaper' | 'preferences' | 'danger';
  onUpdateSettings: (updates: Partial<UserSettings>) => void | boolean;
  onResetStudyTimes: () => void;
  onOpenAuth: () => void;
  onSignOut?: () => void;
  onTriggerSync?: () => void;
  onOpenSupport?: () => void;
  isSyncing?: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  currentUser,
  settings,
  subscription,
  initialTab,
  onUpdateSettings,
  onResetStudyTimes,
  onOpenAuth,
  onSignOut,
  onTriggerSync,
  onOpenSupport,
  isSyncing = false,
  onClose,
}) => {
  const dialogRef=useRef<HTMLDivElement>(null);
  const closeRef=useRef(onClose);
  useEffect(()=>{closeRef.current=onClose;},[onClose]);
  const [activeTab, setActiveTab] = useState<'wallpaper' | 'preferences' | 'danger'>(
    initialTab || 'wallpaper'
  );
  const [appearanceSection,setAppearanceSection]=useState<'backgrounds'|'display'|'custom'>('backgrounds');
  const [plusPrompt, setPlusPrompt] = useState<string | null>(null);
  const [motionUrl,setMotionUrl] = useState(settings.plusMotionWallpaperUrl || '');
  const [motionError,setMotionError] = useState('');
  const [motionBusy,setMotionBusy]=useState(false);
  const [imageUrl,setImageUrl]=useState(settings.customWallpaperUrl?.startsWith('https:')?settings.customWallpaperUrl:'');
  const [imageBusy,setImageBusy]=useState(false);
  const [imageError,setImageError]=useState('');
  const mediaRequest=useRef(0);
  useEffect(()=>{mediaRequest.current++;setImageBusy(false);setMotionBusy(false);},[isOpen,settings.activeWallpaperId,settings.customWallpaperUrl,settings.plusMotionWallpaperUrl]);
  useEffect(()=>()=>{mediaRequest.current++;},[]);
  const applyImage=async(source:File|string)=>{
    const token=++mediaRequest.current;
    setImageBusy(true);setImageError('');
    try{const url=typeof source==='string'?await checkWallpaperImageUrl(source):await prepareWallpaperImage(source);if(token!==mediaRequest.current)return;if(onUpdateSettings({customWallpaperUrl:url,plusMotionWallpaperUrl:'',plusMotionWallpaperEnabled:false})===false)throw new Error('This device could not save the image. Free some browser storage and try again.');}
    catch(error){if(token===mediaRequest.current)setImageError(error instanceof Error?error.message:'Unable to load this image. Your current background has been kept.');}
    finally{if(token===mediaRequest.current)setImageBusy(false);}
  };
  const motionPreset=WALLPAPER_PRESETS.find(p=>p.id===resolveWallpaperId(settings.activeWallpaperId));
  const hasVideo=!!(settings.plusMotionWallpaperUrl||motionPreset?.motionUrl||motionPreset?.motionType);
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  useEffect(()=>setMotionUrl(settings.plusMotionWallpaperUrl || ''),[settings.plusMotionWallpaperUrl]);

  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  // Sync active tab when the modal opens with a specific initialTab
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const [present, setPresent] = useState(isOpen);
  useEffect(() => {
    if (isOpen) { setPresent(true); return; }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setPresent(false); return; }
    const timeout = window.setTimeout(() => setPresent(false), 280);
    return () => window.clearTimeout(timeout);
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen) return;
    const trigger=document.activeElement as HTMLElement|null;
    const frame=requestAnimationFrame(()=>dialogRef.current?.querySelector<HTMLElement>('button')?.focus());
    const keydown = (event: KeyboardEvent) => {
      if(event.key==='Escape'){event.preventDefault();closeRef.current();}
      if(event.key!=='Tab')return;
      const controls=Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,[href],[tabindex="0"]')||[]).filter(el=>el.getClientRects().length>0);
      const first=controls[0],last=controls.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    };
    window.addEventListener('keydown', keydown);
    return () => {cancelAnimationFrame(frame);window.removeEventListener('keydown',keydown);if(trigger?.isConnected)trigger.focus();};
  }, [isOpen]);
  if (!present) return null;


  const handleExecuteReset = () => {
    onResetStudyTimes();
    setIsConfirmingReset(false);
    onClose();
  };

  return (
    <div
      role="dialog"
      data-closing={!isOpen}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}
      inert={!isOpen}
      aria-modal="true"
      aria-labelledby="settings-title"
      className="settings-overlay fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in"
    >
      <div ref={dialogRef} className="settings-modal relative w-full max-w-2xl max-h-[90vh] flex flex-col glass-modal rounded-3xl border border-white/15 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="settings-heading flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--sanctra-sage)]/15 border border-[var(--sanctra-sage)]/30 flex items-center justify-center text-[var(--sanctra-sage)]">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 id="settings-title" className="text-base sm:text-lg font-bold text-white tracking-tight">
                Settings
              </h2>
              <p className="text-[11px] text-slate-400">
                Your space, your pace.
              </p>
            </div>
          </div>

          <button
            aria-label="Close settings"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Strip */}
        <div className="settings-tab-strip flex items-center gap-1 px-6 pt-3 pb-2 border-b border-white/5">
          <button
            aria-pressed={activeTab === 'wallpaper'} onClick={() => setActiveTab('wallpaper')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'wallpaper'
                ? 'bg-[var(--sanctra-sage)]/15 text-[var(--sanctra-sage)] border border-[var(--sanctra-sage)]/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Appearance</span>
          </button>

          <button
            aria-pressed={activeTab === 'preferences'} onClick={() => setActiveTab('preferences')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'preferences'
                ? 'bg-[var(--sanctra-sage)]/15 text-[var(--sanctra-sage)] border border-[var(--sanctra-sage)]/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Preferences</span>
          </button>

          <button
            aria-pressed={activeTab === 'danger'} onClick={() => setActiveTab('danger')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'danger'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'text-slate-400 hover:text-rose-300'
            }`}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Account &amp; data</span>
          </button>
        </div>

        {/* Modal Body / Tab Content */}
        <div className="settings-content flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: WALLPAPER & APPEARANCE */}
          {activeTab === 'wallpaper' && (
            <div className="space-y-6">
              <div className="appearance-navigation" aria-label="Appearance sections">{(['backgrounds','display','custom'] as const).map(section=><button key={section} type="button" aria-pressed={appearanceSection===section} onClick={()=>setAppearanceSection(section)}>{{backgrounds:'Backgrounds',display:'Display',custom:'Your own media'}[section]}</button>)}</div>
              {appearanceSection==='backgrounds'&&<>
              <BackgroundChooser settings={settings} isPlus={isEntitlementActive(subscription||null)} onLocked={setPlusPrompt} onSelect={preset=>{setPlusPrompt(null);onUpdateSettings({activeWallpaperId:preset.id,customWallpaperUrl:undefined,plusMotionWallpaperUrl:'',plusMotionWallpaperEnabled:preset.type==='motion'});}}/>
              {plusPrompt&&<div className="background-upgrade" role="status"><p><strong>{plusPrompt}</strong> is included with Plus+.</p>{onOpenSupport&&<button type="button" className="workspace-primary" onClick={()=>{onClose();onOpenSupport();}}>Ask about Plus+</button>}<button type="button" className="analytics-button" onClick={()=>setPlusPrompt(null)}>Dismiss</button></div>}
              </>}
              {appearanceSection==='display'&&<>
              <section className="glass-blur-control glass-card"><div><h3>Glass clarity</h3><p>Adjust the blur behind interface panels. Wallpaper sharpness stays the same.</p></div><label htmlFor="ui-glass-blur">Panel blur <output>{settings.uiGlassBlur??12}px</output></label><input id="ui-glass-blur" className="sanctra-range" type="range" min={0} max={24} step={1} value={settings.uiGlassBlur??12} onChange={e=>onUpdateSettings({uiGlassBlur:Number(e.target.value)})}/><div className="glass-blur-labels"><span>Clear</span><span>Soft glass</span></div></section>
              {/* Background Dimness Slider */}
              <div className="p-4 rounded-2xl glass-card border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium tracking-wide text-slate-300">
                    Background Dimness Overlay
                  </span>
                  <span className="text-xs font-mono font-bold text-[var(--sanctra-sage)]">
                    {settings.backgroundDimness}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="90"
                  step="5"
                  value={settings.backgroundDimness}
                  onChange={(e) => onUpdateSettings({ backgroundDimness: Number(e.target.value) })}
                  className="w-full accent-[var(--sanctra-sage)] cursor-pointer"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Higher dimness increases timer dial contrast for distraction-free focus.
                </span>
              </div>

              {/* Wallpaper Fit Mode */}
              <div className="flex items-center justify-between p-4 rounded-2xl glass-card border border-white/10">
                <div>
                  <span className="text-xs font-medium tracking-wide text-slate-300 block">
                    Wallpaper Scaling
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Cover full screen (fill) or preserve aspect ratio (contain)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10">
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ wallpaperFitMode: 'fill' })}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                      settings.wallpaperFitMode === 'fill'
                        ? 'bg-[var(--sanctra-sage)] text-[var(--sanctra-ink)] font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Cover (Fill)
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ wallpaperFitMode: 'fit' })}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                      settings.wallpaperFitMode === 'fit'
                        ? 'bg-[var(--sanctra-sage)] text-[var(--sanctra-ink)] font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Contain (Fit)
                  </button>
                </div>
              </div>
              </>}
              {appearanceSection==='custom'&&<>
              <section className="custom-image-settings" aria-labelledby="custom-image-heading">
                <div><h3 id="custom-image-heading">Your own background</h3><p>Choose an image from your device or paste an image link.</p></div>
                {settings.customWallpaperUrl&&<img className="custom-image-preview" src={settings.customWallpaperUrl} alt="Your selected custom background"/>}
                <div className="workspace-actions"><label className={`analytics-button custom-image-upload ${imageBusy?'is-busy':''}`}><Upload size={16}/>{imageBusy?'Preparing image…':'Upload image'}<input aria-label="Upload background image" type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={imageBusy} onChange={e=>{const file=e.currentTarget.files?.[0];e.currentTarget.value='';if(file)void applyImage(file);}}/></label>{settings.customWallpaperUrl&&<button type="button" className="analytics-button" disabled={imageBusy} onClick={()=>{setImageUrl('');setImageError('');onUpdateSettings({customWallpaperUrl:undefined,plusMotionWallpaperEnabled:!!motionPreset?.motionUrl});}}>Use selected scene</button>}</div>
                <p className="workspace-footnote">JPEG, PNG, WebP or AVIF · up to 20 MB. Images are resized before saving to your account.</p>
                <details className="custom-wallpaper-details"><summary>Use an image link</summary><label>Image link<input className="inbox-input" type="url" value={imageUrl} maxLength={2048} disabled={imageBusy} onChange={e=>{setImageUrl(e.target.value);setImageError('');}} placeholder="https://example.com/background.jpg"/></label><button type="button" className="workspace-primary" disabled={imageBusy||!imageUrl.trim()} onClick={()=>void applyImage(imageUrl)}>{imageBusy?'Checking image…':'Apply image'}</button></details>
                {imageError&&<p className="custom-background-error" role="alert">{imageError}</p>}
              </section>
              {isEntitlementActive(subscription || null) && <div className="vip-motion-settings">
                <div className="motion-setting-heading"><div><strong>Background playback</strong><p>{settings.customWallpaperUrl?'Your custom image is selected. Choose a video scene to play a background video.':hasVideo ? reducedMotion ? 'Your device’s reduced-motion setting keeps this scene still.' : settings.plusMotionWallpaperEnabled ? 'Playback is enabled. Tap anywhere to resume if your browser pauses it.' : 'Your selected video is paused on its still image.' : 'Choose a video scene above to enable playback.'}</p></div>{hasVideo&&!settings.customWallpaperUrl&&<button type="button" role="switch" aria-label="Play background video" aria-checked={!!settings.plusMotionWallpaperEnabled} disabled={reducedMotion} className="motion-toggle" onClick={()=>onUpdateSettings({plusMotionWallpaperEnabled:!settings.plusMotionWallpaperEnabled})}><span/></button>}</div>
                <details className="custom-wallpaper-details"><summary>Use your own video</summary><label>Video link<input className="inbox-input" type="url" maxLength={2048} value={motionUrl} onChange={e=>{setMotionUrl(e.target.value);setMotionError('');}} placeholder="https://example.com/scene.mp4"/></label><p className="workspace-footnote">Paste a direct MP4 or WebM link. We’ll check that it plays before applying it.</p>{motionError&&<p role="alert">{motionError}</p>}<div className="workspace-actions"><button type="button" className="workspace-primary" disabled={motionBusy||!motionUrl.trim()} onClick={async()=>{const token=++mediaRequest.current;setMotionBusy(true);setMotionError('');try{const url=await checkVideoSource(motionUrl);if(token!==mediaRequest.current)return;if(onUpdateSettings({customWallpaperUrl:undefined,plusMotionWallpaperUrl:url,plusMotionWallpaperEnabled:true})===false)throw new Error('This device could not save the video settings.');}catch(e){if(token===mediaRequest.current)setMotionError(e instanceof Error?e.message:'Unable to play this video.');}finally{if(token===mediaRequest.current)setMotionBusy(false);}}}>{motionBusy?'Checking video…':'Apply video'}</button>{settings.plusMotionWallpaperUrl&&<button type="button" className="analytics-button" disabled={motionBusy} onClick={()=>{setMotionUrl('');setMotionError('');onUpdateSettings({plusMotionWallpaperUrl:'',plusMotionWallpaperEnabled:!!motionPreset?.motionUrl});}}>Use selected scene</button>}</div></details>
              </div>}
              </>}
            </div>
          )}

          {/* TAB 3: PREFERENCES */}
          {activeTab === 'preferences' && (
            <div className="space-y-4">
              {currentUser && !currentUser.isAnonymous && <PersonalIntegration uid={currentUser.uid}/>}

              {/* Daily Goal Hours */}
              <div className="p-4 rounded-2xl glass-card border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium tracking-wide text-slate-300 block">
                    Daily Study Target
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Set your daily focused hours objective
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="18"
                    value={settings.dailyGoalHours}
                    onChange={(e) => onUpdateSettings({ dailyGoalHours: Math.max(1, Number(e.target.value)) })}
                    className="w-16 px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/15 text-center font-mono font-bold text-[var(--sanctra-sage)] focus:outline-none focus:border-[var(--sanctra-sage)]"
                  />
                  <span className="text-xs text-slate-400">hours/day</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl glass-card border border-white/10 flex items-center justify-between gap-4">
                <div><strong className="text-sm">JEE preparation</strong><p className="text-xs text-slate-300">Opt in to JEE Track, chapter tagging and preparation guidance. You can hide it again without deleting data.</p></div>
                <button type="button" className="analytics-button shrink-0" role="switch" aria-label="JEE preparation" aria-checked={settings.jeeTrackOptIn!==false} onClick={()=>onUpdateSettings({jeeTrackOptIn:settings.jeeTrackOptIn===false})}>{settings.jeeTrackOptIn!==false?'On':'Off'}</button>
              </div>

              {/* Sound Alerts */}
              <div className="p-4 rounded-2xl glass-card border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium tracking-wide text-slate-300 block">
                    Audio Chimes on Completion
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Play a gentle chime when a timed focus or break ends
                  </span>
                </div>
                <button
                  type="button"
                  aria-label="Completion chimes" role="switch" aria-checked={settings.soundAlertsEnabled !== false}
                  onClick={() => onUpdateSettings({ soundAlertsEnabled: !settings.soundAlertsEnabled })}
                  className={`p-2 rounded-xl border transition-all cursor-pointer ${
                    settings.soundAlertsEnabled !== false
                      ? 'bg-[var(--sanctra-sage)]/20 text-[var(--sanctra-sage)] border-[var(--sanctra-sage)]/30'
                      : 'bg-white/5 text-slate-400 border-white/10'
                  }`}
                >
                  {settings.soundAlertsEnabled !== false ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </button>
              </div>

              <div className="p-4 rounded-2xl glass-card border border-white/10 flex items-center justify-between gap-4">
                <div><span className="text-xs font-medium text-slate-300 block">Strict Mode</span><p className="text-[10px] text-slate-400 mt-1">Pause study time when you switch apps or tabs. Applies to new sessions; breaks continue.</p></div>
                <button type="button" role="switch" aria-checked={settings.strictMode === true} aria-label="Strict Mode" onClick={() => onUpdateSettings({strictMode: !settings.strictMode})} className="analytics-button shrink-0">{settings.strictMode ? 'On' : 'Off'}</button>
              </div>
              {/* Cloud Account Status */}
              <div className="p-4 rounded-2xl glass-card border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-medium tracking-wide text-slate-300 block">
                    Cloud Synchronization
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {currentUser && !currentUser.isAnonymous ? `Connected to ${currentUser.email || currentUser.displayName || 'your account'}` : 'Sign in to connect your account'}
                  </span>
                </div>
                {currentUser ? (
                  <button
                    type="button"
                    onClick={onTriggerSync}
                    disabled={isSyncing}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white border border-white/10 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSyncing ? 'Syncing...' : 'Sync Now'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAuth();
                    }}
                    className="workspace-primary text-xs font-bold py-2 px-4 shadow-md cursor-pointer"
                  >
                    Connect Google Account
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: DANGER ZONE (RESET STUDY TIMES) */}
          {activeTab === 'danger' && (
            <div className="space-y-4">
              {currentUser && hasGoogleSignIn() && <div className="p-5 rounded-2xl glass-card border border-white/10"><h3 className="text-white font-semibold mb-3">Sign-in methods</h3><AccountPassword/></div>}
              {/* Account Sign Out Section */}
              {onSignOut && (
                <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.02] text-left">
                  <div className="flex items-center gap-2 text-white font-bold text-sm mb-1.5">
                    <LogOut className="w-4 h-4 text-rose-400" />
                    <span>Account Session</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    {`Currently signed in as ${currentUser?.email || 'Scholar'}. Sign out of your account on this device.`}
                  </p>

                  {!confirmSignOut ? (
                    <button
                      type="button"
                      onClick={() => setConfirmSignOut(true)}
                      className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out of Sanctra</span>
                    </button>
                  ) : (
                    <div className="p-4 rounded-xl bg-black/60 border border-rose-500/50 space-y-3">
                      <span className="text-xs font-bold text-white block">
                        Confirm you want to sign out?
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmSignOut(false);
                            onClose();
                            onSignOut();
                          }}
                          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 cursor-pointer"
                        >
                          Yes, Sign Out
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmSignOut(false)}
                          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <h3 className="settings-danger-title">Danger zone</h3>
              <div className="p-5 rounded-2xl border border-rose-500/30 bg-rose-950/20 text-left">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-sm mb-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Reset Study Times & History</span>
                </div>
                <p className="text-xs text-rose-200/80 leading-relaxed mb-4">
                  This will permanently clear all your recorded study sessions, daily progress hours,
                  weekly goals, and streak count in your account. Your customized subjects and target
                  focus settings will be preserved.
                </p>

                {!isConfirmingReset ? (
                  <button
                    type="button"
                    onClick={() => setIsConfirmingReset(true)}
                    className="px-4 py-2 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/40 text-xs font-bold transition-all cursor-pointer"
                  >
                    Reset Study Hours...
                  </button>
                ) : (
                  <div className="p-4 rounded-xl bg-black/60 border border-rose-500/50 space-y-3">
                    <span className="text-xs font-bold text-white block">
                      Are you absolutely sure you want to reset all study time?
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleExecuteReset}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 cursor-pointer"
                      >
                        Yes, Reset All Times
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsConfirmingReset(false)}
                        className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>


            </div>
          )}
        </div>
      </div>
    </div>
  );
};
