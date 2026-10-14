import {SelectControl} from './ui/SelectControl.tsx';
import { useEffect, useRef, useState } from 'react';
import {
  Eye,
  RotateCcw,
  Save,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  Radio,
  X,
  RefreshCw,
} from 'lucide-react';
import {
  DEFAULT_PLATFORM_CONFIG,
  savePlatformConfig,
  watchPlatformConfig,watchPlatformAudit,type PlatformAudit,
  type PlatformConfig,
} from '../utils/platformConfig.ts';
import type { AuthUser } from '../types/index.ts';
import { MaintenanceView } from './views/MaintenanceView.tsx';

export function PlatformControls({ user }: { user: AuthUser }) {
  const [audit,setAudit]=useState<PlatformAudit[]>([]),[auditError,setAuditError]=useState('');
  useEffect(()=>watchPlatformAudit(setAudit,setAuditError),[]);
  const [value, setValue] = useState(DEFAULT_PLATFORM_CONFIG);
  const [live, setLive] = useState(DEFAULT_PLATFORM_CONFIG);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [confirmed,setConfirmed]=useState(false);
  const [preview, setPreview] = useState(false);
  const [retry, setRetry] = useState(0);
  const dirtyRef = useRef(false);

  useEffect(() => {
    setLoading(true);
    return watchPlatformConfig(
      (next) => {
        setLive(next);
        if (!dirtyRef.current) setValue(next);
        setLoading(false);
        setError('');
      },
      (message) => {
        setError(message);
        setLoading(false);
      }
    );
  }, [retry]);

  const edit = (patch: Partial<PlatformConfig>) => {
    dirtyRef.current = true;
    setDirty(true);
    setSaved('');setConfirmed(false);
    setValue((previous) => ({ ...previous, ...patch }));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if(value.pauseEndsAt&&value.pauseEndsAt<=Math.max(Date.now(),value.pauseStartsAt)){setError('Choose a pause end after the start and in the future.');return;}
    if(value.sitePaused&&!live.sitePaused&&!confirmed){setError('Review the site pause impact and confirm below before saving.');return;}
    setBusy(true);
    setError('');
    setSaved('');
    try {
      await savePlatformConfig(user.uid, value);
      dirtyRef.current = false;
      setDirty(false);
      setLive(value);
      setSaved('Platform controls saved successfully. All connected users receive the configuration in real-time.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save controls.');
    } finally {
      setBusy(false);
    }
  };

  const flags = [
    {key:'jeeTrackEnabled',label:'JEE Track',description:'Enable only when preparation tracking is ready. Pausing hides unfinished screens and sample values without deleting saved data.',danger:false},
    {key:'sitePaused',label:'Pause the entire site',description:'Replaces the landing and all member screens with maintenance. Admins keep access. Existing server timers and saved data are preserved.',danger:true},
    {key:'chatEnabled',label:'Group message sending',description:'Pause new messages while keeping conversations readable.',danger:false},
    {key:'chatAttachmentsEnabled',label:'Chat image & GIF attachments',description:'Accept media in group chat. Text messages stay available when this is off.',danger:false},
    {key:'groupCreationEnabled',label:'New group creation',description:'Pause new groups while keeping existing rooms available.',danger:false},
    {key:'announcementPopupsEnabled',label:'Announcement popups',description:'Pause popup interruptions. Published updates remain in the inbox.',danger:false},
    {
      key: 'maintenanceMode',
      label: 'Maintenance Mode',
      description: 'Pauses public and community services across the app while keeping personal timers and owner access active.',
      danger: true,
    },
    {
      key: 'groupsEnabled',
      label: 'Study Groups',
      description: 'Allows members to discover, join, create study groups, and chat in real-time.',
      danger: false,
    },
    {
      key: 'rankingsEnabled',
      label: 'Global Rankings',
      description: 'Enables daily, weekly, and monthly shared competitive leaderboards across workspaces.',
      danger: false,
    },
    {
      key: 'supportEnabled',
      label: 'Support Ticket Creation',
      description: 'Accepts new incoming inquiries. Disabling pauses new ticket submissions while keeping replies open.',
      danger: false,
    },
  ] as const;

  return (
    <section className="platform-controls space-y-6">
      {/* Header Info */}
      <div className="p-5 rounded-2xl bg-[var(--sanctra-surface)] border border-[var(--sanctra-glass-border)] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={18} className="text-[var(--sanctra-sage)]" />
            <h2 className="text-xl font-bold text-[var(--sanctra-paper)]">Live System Operations</h2>
          </div>
          <p className="text-xs text-[var(--sanctra-muted)] mt-1 max-w-xl">
            Configure system-wide feature flags, emergency maintenance, and global service notifications.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {live.maintenanceMode && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 animate-pulse">
              <AlertTriangle size={13} />
              <span>Maintenance Mode Active</span>
            </span>
          )}

          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
              dirty
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            <Radio size={12} className={dirty ? 'text-amber-400' : 'text-emerald-400'} />
            <span>{dirty ? 'Unsaved Modifications' : 'Live Sync Active'}</span>
          </span>
        </div>
      </div>

      {error && (
        <div role="alert" className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            className="analytics-button text-xs py-1 px-2.5 flex items-center gap-1"
            onClick={() => setRetry((v) => v + 1)}
          >
            <RefreshCw size={12} />
            <span>Reconnect</span>
          </button>
        </div>
      )}

      {saved && (
        <div role="status" className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="flex-shrink-0" />
            <span>{saved}</span>
          </div>
          <button type="button" onClick={() => setSaved('')} className="p-1 hover:bg-white/10 rounded transition">
            <X size={14} />
          </button>
        </div>
      )}

      <form onSubmit={(e) => void save(e)} className="space-y-6">
        <fieldset disabled={loading || busy} className="space-y-6">
          {/* Quick Presets */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-[var(--sanctra-glass-border)] space-y-3">
            <div className="text-xs font-semibold text-[var(--sanctra-paper)]">Operational Presets:</div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="analytics-button text-xs py-1.5 px-3"
                onClick={() => edit({ ...DEFAULT_PLATFORM_CONFIG })}
              >
                Restore Standard Operations
              </button>
              <button
                type="button"
                className="analytics-button text-xs py-1.5 px-3 text-amber-300"
                onClick={() =>
                  edit({
                    groupsEnabled: false,
                    rankingsEnabled: false,
                    supportEnabled: true,
                    maintenanceMode: false,
                  })
                }
              >
                Pause Community Features
              </button>
              <button
                type="button"
                className="analytics-button text-xs py-1.5 px-3 text-rose-300"
                onClick={() => edit({ sitePaused: true, noticeType: 'maintenance' })}
              >
                Prepare Entire-Site Pause
              </button>
            </div>
          </div>

          {/* Feature Flag Switches */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {flags.map((flag) => {
              const checked = value[flag.key];
              return (
                <label
                  key={flag.key}
                  className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 cursor-pointer select-none ${
                    checked
                      ? flag.danger
                        ? 'bg-rose-500/10 border-rose-500/30'
                        : 'bg-[var(--sanctra-surface)] border-[var(--sanctra-sage)]/50 ring-1 ring-[var(--sanctra-sage)]/20'
                      : 'bg-[var(--sanctra-surface)] border-[var(--sanctra-glass-border)] opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <strong className="text-sm font-semibold text-[var(--sanctra-paper)]">{flag.label}</strong>
                      {flag.danger && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-rose-500/20 text-rose-300">
                          Critical
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--sanctra-muted)] leading-relaxed">{flag.description}</p>
                  </div>

                  <div className="relative inline-flex items-center flex-shrink-0 mt-1">
                    <input
                      type="checkbox"
                      role="switch"
                      checked={checked}
                      onChange={(e) => edit({ [flag.key]: e.target.checked })}
                      className="sr-only"
                    />
                    <div
                      className={`w-11 h-6 rounded-full transition-colors ${
                        checked
                          ? flag.danger
                            ? 'bg-rose-500'
                            : 'bg-[var(--sanctra-sage)]'
                          : 'bg-white/15'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform mt-1 ml-1 ${
                          checked ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </div>
                </label>
              );
            })}
          </div>

          {/* Global Notice & Maintenance Banner Config */}
          <div className="p-5 rounded-2xl bg-[var(--sanctra-surface)] border border-[var(--sanctra-glass-border)] space-y-4">
            <h3 className="text-sm font-semibold text-[var(--sanctra-paper)]">Broadcast Notice & Maintenance Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-xs font-medium text-[var(--sanctra-muted)]">
                  Global Service Notice (Visible across the app banner)
                </label>
                <textarea
                  className="inbox-input text-xs w-full"
                  maxLength={300}
                  rows={2}
                  value={value.notice}
                  onChange={(e) => edit({ notice: e.target.value })}
                  placeholder="Optional brief notification banner shown to all scholars..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[var(--sanctra-muted)]">Notice Banner Style</label>
                <SelectControl label="Notice banner style" value={value.noticeType} onChange={v=>edit({noticeType:v as PlatformConfig['noticeType']})} options={[{value:'info',label:'Information'},{value:'warning',label:'Warning'},{value:'maintenance',label:'Maintenance'}]}/>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-xs font-medium text-[var(--sanctra-muted)]">
                  Maintenance Screen Message
                </label>
                <textarea
                  className="inbox-input text-xs w-full"
                  maxLength={2000}
                  rows={3}
                  value={value.maintenanceMessage}
                  onChange={(e) => edit({ maintenanceMessage: e.target.value })}
                  placeholder="Detailed explanation shown on the dedicated maintenance screen..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[var(--sanctra-muted)]">Expected Return (ETA)</label>
                <input
                  className="inbox-input text-xs py-2 w-full"
                  maxLength={150}
                  value={value.maintenanceEta}
                  onChange={(e) => edit({ maintenanceEta: e.target.value })}
                  placeholder="e.g. Around 9:30 PM IST"
                />
              </div>
            </div>
          </div>

          <div className="workspace-panel p-5 space-y-4"><h3>Scheduling & automatic recovery</h3><div className="studio-fields"><label>Site pause starts<input className="inbox-input" type="datetime-local" value={value.pauseStartsAt?new Date(value.pauseStartsAt-new Date(value.pauseStartsAt).getTimezoneOffset()*60000).toISOString().slice(0,16):''} onChange={e=>edit({pauseStartsAt:e.target.value?new Date(e.target.value).getTime():0})}/></label><label>Site pause ends<input className="inbox-input" type="datetime-local" value={value.pauseEndsAt?new Date(value.pauseEndsAt-new Date(value.pauseEndsAt).getTimezoneOffset()*60000).toISOString().slice(0,16):''} onChange={e=>edit({pauseEndsAt:e.target.value?new Date(e.target.value).getTime():0})}/></label><label>Banner expires<input className="inbox-input" type="datetime-local" value={value.noticeEndsAt?new Date(value.noticeEndsAt-new Date(value.noticeEndsAt).getTimezoneOffset()*60000).toISOString().slice(0,16):''} onChange={e=>edit({noticeEndsAt:e.target.value?new Date(e.target.value).getTime():0})}/></label></div><p className="workspace-footnote">Blank start = immediately. Blank end = manual resume. Scheduled times use your local timezone. Users receive live configuration updates.</p>{value.sitePaused&&<label className="checkbox-label"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I understand that all member screens and the public landing will be unavailable during this pause. Admin sign-in remains available.</label>}</div>
          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              className="workspace-primary text-xs py-2.5 px-4 flex items-center gap-2"
              disabled={!dirty || busy}
            >
              <Save size={15} />
              <span>{busy ? 'Saving Configuration…' : 'Save Operations Configuration'}</span>
            </button>

            <button
              type="button"
              className="analytics-button text-xs py-2.5 px-4 flex items-center gap-2"
              onClick={() => setPreview(true)}
            >
              <Eye size={15} />
              <span>Preview Maintenance Screen</span>
            </button>

            <button
              type="button"
              className="analytics-button text-xs py-2.5 px-4 flex items-center gap-2"
              disabled={!dirty}
              onClick={() => {
                dirtyRef.current = false;
                setDirty(false);
                setValue(live);
                setError('');
                setSaved('');
              }}
            >
              <RotateCcw size={15} />
              <span>Discard Changes</span>
            </button>
          </div>
        </fieldset>
      </form>

      <section className="workspace-panel p-5 space-y-4"><h3>Recent operations</h3>{auditError&&<p role="alert">{auditError}</p>}{audit.length?audit.map(entry=><div key={entry.id} className="studio-history-row"><span>{entry.changed.length?entry.changed.map(key=>key.replace(/([A-Z])/g,' $1').toLowerCase()).join(', '):'Configuration saved'}</span><time>{entry.createdAt?new Date(entry.createdAt.toMillis()).toLocaleString():'Saving…'}</time></div>):<p className="workspace-footnote">New operations will be recorded here. Saved changes cannot erase this history.</p>}</section>
      {/* Maintenance Preview Modal */}
      {preview && (
        <div
          className="modal-backdrop fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreview(false);
          }}
        >
          <div
            className="workspace-panel platform-preview max-w-2xl w-full p-6 rounded-3xl bg-[var(--sanctra-surface)] border border-[var(--sanctra-glass-border)] shadow-2xl space-y-4"
            role="dialog"
            aria-modal="true"
            aria-label="Maintenance preview"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--sanctra-glass-border)]">
              <span className="text-xs font-semibold text-[var(--sanctra-muted)] uppercase tracking-wider">
                Maintenance View Mockup
              </span>
              <button
                className="analytics-button text-xs py-1 px-3"
                type="button"
                onClick={() => setPreview(false)}
              >
                Close Preview
              </button>
            </div>

            <MaintenanceView
              featureTitle="Sanctra"
              customMessage={value.maintenanceMessage}
              eta={value.maintenanceEta}
              noticeType={value.noticeType}
              onBackToTimer={() => setPreview(false)}
            />
          </div>
        </div>
      )}
    </section>
  );
}
