import '../../features/profile/profile-layout.css';
import {StudyDetails} from '../StudyDetails.tsx';
import {doc,onSnapshot} from 'firebase/firestore';
import {IntegrityBadge} from '../IntegrityBadge.tsx';
import type {IntegrityStatus} from '../../utils/studyIntegrity.ts';
import { useEffect, useState } from 'react';
import { Target, ArrowRight, Clock, Flame, CalendarDays, Crown, Shield, LogOut, Sparkles, Gem, Calendar, ShieldCheck, CheckCircle2, User as UserIcon, Users, Zap, Hash, Palette, Lock } from 'lucide-react';
import type { AuthUser, UserSettings, StudySession, ViewMode, UserSubscription } from '../../types/index.ts';
import { buildPeriodAnalytics } from '../../utils/analytics.ts';
import { calculateStreak, formatDurationHuman } from '../../utils/time.ts';
import { getCloudDatabase } from '../../utils/firebase.ts';
import { watchMemberships, watchGroup, type LiveGroup } from '../../utils/liveGroups.ts';
import { isEntitlementActive } from '../../utils/subscriptionPlans.ts';
import { checkImageSource,checkProfileMedia,validateVipMediaUrl } from '../../utils/vipMedia.ts';
import { VipMedia } from '../VipMedia.tsx';
import {ProfileCollections} from '../ProfileCollections.tsx';
import {PROFILE_COLLECTIONS,collectionSettings} from '../../utils/profileCollections.ts';
import {RankingBackdrop,IdentityTags} from '../RankingIdentity.tsx';
import {ProfilePortraitPicker} from '../ProfilePortraitPicker.tsx';

const PROFILE_SCENES = [
  { id: 'none', label: 'Theme glass' },
  { id: 'cloister', label: 'Champagne silk' },
  { id: 'observatory', label: 'Midnight constellation' },
  { id: 'pavilion', label: 'Jade waters' },
] as const;

export function ProfileView({
  user,
  settings,
  sessions,
  subscription,
  initialEditing = false,
  initialEditorSection = 'identity',
  onUpdate,
  onNavigate,
  onAuth,
  onSignOut,
}: {
  user: AuthUser;
  settings: UserSettings;
  sessions: StudySession[];
  subscription?: UserSubscription | null;
  initialEditing?: boolean;
  initialEditorSection?: 'identity'|'portrait'|'signature'|'details';
  onUpdate: (p: Partial<UserSettings>) => void;
  onNavigate: (v: ViewMode) => void;
  onAuth: () => void;
  onSignOut: () => void;
}) {
  const [editing, setEditing] = useState(initialEditing);
  const [editorSection,setEditorSection]=useState<'identity'|'portrait'|'signature'|'details'>(initialEditorSection);
  const [integrityStatus,setIntegrityStatus]=useState<IntegrityStatus>('clear');
  useEffect(()=>{const db=getCloudDatabase();if(!db||user.uid.startsWith('guest-'))return;return onSnapshot(doc(db,'study_integrity',user.uid),snap=>setIntegrityStatus(snap.data()?.integrityStatus||'clear'),()=>{});},[user.uid]);
  const [name, setName] = useState(settings.customDisplayName || user.displayName || '');
  const [avatar, setAvatar] = useState(settings.avatarUrl ?? user.photoURL ?? '');
  const [bio, setBio] = useState(settings.bio || '');
  const [statusMessage, setStatusMessage] = useState(settings.statusMessage || '');
  
  const [weekly, setWeekly] = useState(settings.weeklyTargetHours || 0);
  const [profileScene, setProfileScene] = useState<UserSettings['plusProfileScene']>(settings.plusProfileScene || 'none');
  const [showBadge, setShowBadge] = useState(settings.showPlusBadge !== false);
  const [animatedAvatar,setAnimatedAvatar] = useState(settings.plusAnimatedAvatarUrl || '');
  const [profileCover,setProfileCover] = useState(settings.plusProfileCoverUrl || '');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [saving,setSaving]=useState(false);
  const [groups, setGroups] = useState<Record<string, LiveGroup>>({});

  useEffect(() => {
    if (!getCloudDatabase() || user.uid.startsWith('guest-')) return;
    let roomOff: (() => void)[] = [];
    const off = watchMemberships(
      user.uid,
      (ids) => {
        roomOff.forEach((f) => f());
        setGroups({});
        roomOff = ids.map((id) =>
          watchGroup(
            id,
            (g) => {
              if (g) setGroups((v) => ({ ...v, [id]: g }));
            },
            () => {}
          )
        );
      },
      () => {}
    );
    return () => {
      off();
      roomOff.forEach((f) => f());
    };
  }, [user.uid]);

  const week = buildPeriodAnalytics(sessions, [], new Date(), 'week');
  const streak = calculateStreak(sessions);
  const intentLabel = 'Focused work';
  const progress = settings.weeklyTargetHours
    ? Math.min(100, (week.totalSeconds / (settings.weeklyTargetHours * 3600)) * 100)
    : 0;

  const isPlus = isEntitlementActive(subscription || null) || subscription?.adminAccess===true;

  const edit = () => {
    setName(settings.customDisplayName || user.displayName || '');
    setAvatar(settings.avatarUrl ?? user.photoURL ?? '');
    setBio(settings.bio || '');
    setStatusMessage(settings.statusMessage || '');

    setWeekly(settings.weeklyTargetHours || 0);
    setProfileScene(settings.plusProfileScene || 'none');
    setShowBadge(settings.showPlusBadge !== false);
    setAnimatedAvatar(settings.plusAnimatedAvatarUrl || '');
    setProfileCover(settings.plusProfileCoverUrl || '');
    setEditorSection('identity');
    setEditing(!editing);
    setError('');
    setSaved(false);
  };

  const save = async () => {
    if(saving)return;
    setError('');
    if(!name.trim()){setError('Add a display name before saving.');setEditorSection('identity');return;}
    if(!Number.isFinite(weekly)||weekly<0||weekly>168){setError('Choose a weekly target between 0 and 168 hours.');setEditorSection('details');return;}
    if(isPlus) {try {validateVipMediaUrl(animatedAvatar);validateVipMediaUrl(profileCover);} catch(e) {setError(e instanceof Error?e.message:'Check your media links.');setEditorSection('signature');return;}}
    if (avatar.trim() && !/^https:\/\//i.test(avatar.trim()) && !avatar.trim().startsWith('/backgrounds/') && !avatar.trim().startsWith('/avatars/')) {
      setError('Use a secure HTTPS image URL or select an included avatar.');
      return;
    }
    setSaving(true);
    try {await Promise.all([checkImageSource(avatar),...(isPlus?[checkProfileMedia(animatedAvatar),checkProfileMedia(profileCover)]:[])]);
    onUpdate({
      customDisplayName: name.trim().slice(0, 80),
      avatarUrl: avatar.trim(),
      bio: bio.trim(),
      statusMessage: statusMessage.trim(),
      rankingOptIn: !user.isAnonymous,
      weeklyTargetHours: weekly,
      ...(isPlus ? {plusProfileScene:profileScene,showPlusBadge:showBadge,plusAnimatedAvatarUrl:animatedAvatar.trim(),plusProfileCoverUrl:profileCover.trim()} : {}),
    });
    setEditing(false);
    setSaved(true);
    }catch(e){setError(e instanceof Error?e.message:'Could not save appearance.');}finally{setSaving(false);}
  };

  const activeAvatarEffect = 'none';
  const activeProfileFrame = 'none';
  const activeProfileScene = isPlus ? (editing ? profileScene : (settings.plusProfileScene || 'none')) : 'none';
  const activeShowBadge = isPlus ? (editing ? showBadge : (settings.showPlusBadge !== false)) : false;
  const activeAnimatedAvatar = isPlus ? (editing ? animatedAvatar : (settings.plusAnimatedAvatarUrl || '')) : '';
  const activeProfileCover = isPlus ? (editing ? profileCover : (settings.plusProfileCoverUrl || '')) : '';
  const activeDisplayName = editing ? name : (settings.customDisplayName || user.displayName || '');
  const activeAvatar = editing ? avatar : (settings.avatarUrl ?? user.photoURL ?? '');
  const activeBio = editing ? bio : settings.bio;
  const activeStatus = editing ? statusMessage : settings.statusMessage;

  const frameClass = isPlus ? 'sanctra-plus-ring' : '';
  const effectClass = '';
  const sceneClass = isPlus && activeProfileScene && activeProfileScene !== 'none'
    ? `profile-scene-${activeProfileScene}`
    : '';

  return (
    <section className="workspace-page profile-page">
      <header className="workspace-heading">
        <div>
          
          <h1>{editing?'Edit your profile':'Your profile'}</h1>
          <p>A personal place for learning, meaningful work and mindful time.</p>
        </div>
        <button className="analytics-button" disabled={saving} onClick={edit}>
          {editing ? 'Close editor' : 'Edit profile'}
        </button>
      </header>

      {!editing && <article className="workspace-panel profile-hero">
        <div className={`profile-hero-wash ${sceneClass}`} />
        {isPlus && activeProfileCover && <VipMedia url={activeProfileCover} motion className="vip-profile-cover" decorative />}
        <div className="profile-identity">
          <div className={`profile-avatar ${frameClass} ${effectClass}`}>
            {(activeAvatar || (isPlus && activeAnimatedAvatar)) ? (
              <VipMedia url={isPlus && activeAnimatedAvatar ? activeAnimatedAvatar : activeAvatar} fallback={activeAvatar} motion={!!(isPlus && activeAnimatedAvatar)} name="Your profile" />
            ) : (
              <span className="profile-initial-fallback">{(activeDisplayName || 'You').slice(0, 1).toUpperCase()}</span>
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="profile-intent-tag">{intentLabel}</span>
              {subscription?.adminAccess && <span className="admin-badge"><Shield size={12} />Admin</span>}
              {isPlus && !subscription?.adminAccess && activeShowBadge && (
                <span className="plus-badge">
                  <Crown size={12} />
                  {subscription?.adminAccess ? 'Admin access' : subscription?.isTrial ? 'Plus+ · Trial' : subscription?.tier === 'early_yearly'
                    ? 'Plus+ · Early Backer'
                    : subscription?.tier === 'yearly'
                    ? 'Plus+ · Annual'
                    : 'Plus+ · Monthly'}
                </span>
              )}
            </div>
            <h2>{activeDisplayName || 'Welcome, friend'}</h2>
            <p>{activeBio || 'One meaningful moment at a time.'}</p>
            {activeStatus && <span className="profile-status">{activeStatus}</span>}
          </div>
        </div>

        <div className="profile-stats">
          {[
            { Icon: Clock, label: 'This week', value: formatDurationHuman(week.totalSeconds) },
            { Icon: Flame, label: 'Current streak', value: `${streak.currentStreak} days` },
            { Icon: CalendarDays, label: 'Active days', value: String(streak.activeDays) },
            { Icon: Target, label: 'Best streak', value: `${streak.bestStreak} days` },
          ].map((s) => (
            <div key={s.label}>
              <s.Icon size={18} />
              <strong>{s.value}</strong>
              <small>{s.label}</small>
            </div>
          ))}
        </div>
      </article>}

      {!editing && !isPlus && <ProfileCollections cover="" isPlus={false} onChoose={() => {}} onUpgrade={() => onNavigate('support')} />}
      {integrityStatus !== 'clear' && (
        <div className="workspace-note">
          <IntegrityBadge status={integrityStatus} />
          <p>{integrityStatus === 'confirmed' ? 'Competitive ranks are unavailable after an administrator confirmed time manipulation.' : 'A timer mismatch needs review. This is not a confirmed cheating finding.'} Your personal study records remain available.</p>
          <button className="analytics-button" onClick={() => onNavigate('support')}>Ask support to review</button>
        </div>
      )}
      {saved && <p role="status" className="workspace-note">Profile saved. Changes sync with your account when connected.</p>}

      {editing && (
        <form noValidate className="workspace-panel profile-editor profile-studio" onSubmit={e => { e.preventDefault(); void save(); }}>
          <header className="studio-heading">
            <div>
              <h2>Make yourself at home.</h2>
              <p>A familiar face, wherever you study.</p>
            </div>
            <span className="studio-draft">Draft · changes previewed live</span>
          </header>
          <div className="studio-layout">
            <div className="studio-controls">
              <nav className="studio-nav" aria-label="Profile editor sections">
                {(['identity', 'portrait', 'signature', 'details'] as const).map((tab) => {
                  const Icon = tab === 'identity' ? UserIcon : tab === 'portrait' ? UserIcon : tab === 'signature' ? Sparkles : Shield;
                  const label = tab === 'identity' ? 'About you' : tab === 'portrait' ? 'Portrait' : tab === 'signature' ? 'Style' : 'Study & privacy';
                  return (
                    <button
                      type="button"
                      key={tab}
                      aria-current={editorSection === tab ? 'page' : undefined}
                      aria-controls={`studio-${tab}`}
                      onClick={() => setEditorSection(tab)}
                    >
                      <Icon size={14} />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </nav>
              <section id="studio-identity" className="studio-section" hidden={editorSection !== 'identity'}>
                <h3>The essentials</h3>
                <p className="studio-description">How your study community knows you.</p>
                <label>Display name<input className="inbox-input" maxLength={80} value={name} onChange={e => setName(e.target.value)} autoComplete="nickname" /></label>
                <label>Status message<input className="inbox-input" maxLength={160} value={statusMessage} onChange={e => setStatusMessage(e.target.value)} placeholder="What are you working towards?" /></label>
                <label>About you<textarea className="inbox-input" rows={3} maxLength={500} value={bio} onChange={e => setBio(e.target.value)} placeholder="A little of your story…" /><small>{bio.length}/500</small></label>
              </section>
              <section id="studio-portrait" className="studio-section" hidden={editorSection !== 'portrait'}>
                <ProfilePortraitPicker avatar={avatar} animatedAvatar={animatedAvatar} isPlus={isPlus} accountPhoto={user.photoURL||''} onAvatar={setAvatar} onAnimated={setAnimatedAvatar} onUpgrade={()=>onNavigate('support')}/>
              </section>
              <section id="studio-signature" className="studio-section" hidden={editorSection !== 'signature'}>
                <ProfileCollections cover={PROFILE_COLLECTIONS.some(c => c.cover === profileCover && c.avatar === animatedAvatar && c.scene === profileScene) ? profileCover : ''} isPlus={isPlus} onUpgrade={() => onNavigate('support')} onChoose={id => { const c = collectionSettings(id); setAnimatedAvatar(c.plusAnimatedAvatarUrl || ''); setProfileCover(c.plusProfileCoverUrl || ''); setProfileScene(c.plusProfileScene || 'none'); }} />
                {isPlus && (
                  <>
                    <div className="signature-ring-note"><Crown size={20}/><div><h3>The Sanctra signature</h3><p>One softly animated ring for every Plus+ member. It follows your portrait across your profile, groups and rankings.</p></div></div>
                    <div className="studio-finetune">
                      <h3>Your backdrop</h3>
                      <div>
                        <label className="studio-subheading">Profile atmosphere</label>
                        <div className="flex flex-wrap gap-2.5">
                          {PROFILE_SCENES.map((scn) => (
                            <button
                              key={scn.id}
                              type="button"
                              aria-pressed={profileScene === scn.id}
                              className="profile-option-pill"
                              onClick={() => setProfileScene(scn.id as UserSettings['plusProfileScene'])}
                            >
                              <span className={`profile-style-swatch scene-swatch-${scn.id}`} aria-hidden="true" />
                              <span>{scn.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <details className="identity-advanced">
                      <summary>Use a personal banner</summary>

                      <label>Profile banner<input className="inbox-input" inputMode="url" maxLength={2048} value={profileCover} onChange={e => setProfileCover(e.target.value)} placeholder="https://…/banner.webp" /><small>Direct image or video links. External media hosts receive display requests.</small></label>
                    </details>
                    <div className="studio-preferences">
                      <label className="checkbox-label"><input type="checkbox" checked={showBadge} onChange={e => setShowBadge(e.target.checked)} />Show Plus+ on profile card</label>
                      <button className="analytics-button" type="button" onClick={() => { setProfileScene('none'); setAnimatedAvatar(''); setProfileCover(''); setShowBadge(true); }}>Reset signature</button>
                    </div>
                  </>
                )}
              </section>
              <section id="studio-details" className="studio-section" hidden={editorSection !== 'details'}>
                <h3>Your study rhythm</h3>
                <label>Weekly focus target · hours<input className="inbox-input" type="number" min={0} max={168} step={0.5} value={weekly} onChange={e => setWeekly(Number(e.target.value))} /></label>
                <h3>What others see</h3>
                <p className="studio-description">Your name, portrait and signature appear in your groups and rankings. Your email and session notes stay private.</p>
                {user.isAnonymous && <p className="workspace-footnote">Connect an account to join global rankings.</p>}
              </section>
            </div>
            <aside className="studio-preview" aria-label="Live profile preview">
              <div className="profile-live-preview-box">
                <div className="profile-live-preview-header">
                  <div className="flex items-center gap-2">
                    <Sparkles size={15} className="text-[var(--sanctra-sage)]" />
                    <strong>Live Profile Preview</strong>
                  </div>
                  <span>Visible in groups & rankings</span>
                </div>

                <div className={`profile-live-preview-card ${sceneClass}`}>
                  {isPlus && activeProfileCover && (
                    <VipMedia url={activeProfileCover} motion className="vip-profile-cover" decorative />
                  )}
                  <div className="preview-identity">
                    <div className={`profile-avatar ${frameClass} ${effectClass}`}>
                      {(activeAvatar || (isPlus && activeAnimatedAvatar)) ? (
                        <VipMedia
                          url={isPlus && activeAnimatedAvatar ? activeAnimatedAvatar : activeAvatar}
                          fallback={activeAvatar}
                          motion={!!(isPlus && activeAnimatedAvatar)}
                          name={activeDisplayName || 'You'}
                        />
                      ) : (
                        <span className="profile-initial-fallback">{(activeDisplayName || 'You').slice(0, 1).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="profile-intent-tag">{intentLabel}</span>
                        {isPlus && activeShowBadge && (
                          <span className="plus-badge">
                            <Crown size={12} />
                            {subscription?.isTrial ? 'Plus+ · Trial' : 'Plus+'}
                          </span>
                        )}
                      </div>
                      <h2 className="preview-name">{activeDisplayName || 'Welcome, friend'}</h2>
                      <p className="preview-bio">{activeBio || 'One meaningful moment at a time.'}</p>
                      {activeStatus && <span className="profile-status text-xs mt-2">{activeStatus}</span>}
                    </div>
                  </div>

                  <div className="identity-context-previews">
                    <p>Across your study community</p>
                    {['Global ranking', 'Group conversation'].map((context, i) => (
                      <div className={`identity-context-row ${i ? 'is-conversation' : ''}`} key={context}>
                        <RankingBackdrop
                          style={{
                            plusUntil: isPlus ? 4102444800000 : 0,
                            cover: activeProfileCover,
                            scene: activeProfileScene || 'none',
                            frame: activeProfileFrame || 'none',
                            aura: activeAvatarEffect || 'none',
                            trial: false,
                            admin: false,
                          }}
                        />
                        <div className={`profile-avatar small ${frameClass} ${effectClass}`}>
                          <VipMedia
                            url={activeAnimatedAvatar || activeAvatar}
                            fallback={activeAvatar}
                            name={activeDisplayName || 'You'}
                            motion={!!activeAnimatedAvatar}
                          />
                        </div>
                        <div>
                          <small>{context}</small>
                          <strong>{activeDisplayName || 'Your name'}</strong>
                          <IdentityTags
                            style={{
                              plusUntil: isPlus ? 4102444800000 : 0,
                              cover: '',
                              scene: 'none',
                              frame: 'none',
                              aura: 'none',
                              trial: false,
                              admin: false,
                            }}
                          />
                        </div>
                        <span>{i ? 'A little progress, every day.' : 'Sample time'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <p className="studio-preview-note">Your signature follows you. Banners stay subtle in rankings; your portrait carries the detail.</p>
            </aside>
          </div>
          <footer className="studio-savebar">
            <div>{error ? <p role="alert" className="studio-error">{error}</p> : <p>Changes appear after you save.</p>}</div>
            <div className="workspace-actions">
              <button className="analytics-button" type="button" disabled={saving} onClick={() => setEditing(false)}>Cancel</button>
              <button className="workspace-primary" type="submit" disabled={saving}>{saving ? 'Checking appearance…' : 'Save profile'}</button>
            </div>
          </footer>
        </form>
      )}

      <div className="profile-planning-grid">
      <StudyDetails settings={settings} onUpdate={onUpdate}/>
      {!editing && <article className="workspace-panel profile-week-panel">
          <h2>Your week, at your pace.</h2>
          <div className="profile-goal-number">
            {formatDurationHuman(week.totalSeconds)}
            <span>{settings.weeklyTargetHours ? ` / ${settings.weeklyTargetHours}h` : ' · No target set'}</span>
          </div>
          <progress max={100} value={progress} />
          <p>
            {settings.weeklyTargetHours
              ? `${Math.round(progress)}% of your weekly target. Small moments count.`
              : 'A target is optional. Set one in Edit profile if it helps.'}
          </p>
          <div className="week-spark">
            {week.days.map((d) => (
              <div key={d.day} title={`${d.date.toLocaleDateString()}: ${formatDurationHuman(d.seconds)}`}>
                <span
                  style={{
                    height: `${Math.max(4, (d.seconds / Math.max(1, ...week.days.map((x) => x.seconds))) * 48)}px`,
                  }}
                />
                <small>{d.date.toLocaleDateString(undefined, { weekday: 'narrow' })}</small>
              </div>
            ))}
          </div>
          <button className="analytics-button" onClick={() => onNavigate('analytics')}>
            Explore your insights <ArrowRight size={14} />
          </button>
        </article>}
      </div>

      {!editing && <>
      <div className="workspace-grid">


        <article className="workspace-panel">
          <h2>Your focus groups</h2>
          {Object.values(groups).length ? (
            Object.values(groups).map((g) => {
              const role = g.createdById === user.uid ? 'Owner' : g.adminIds?.includes(user.uid) ? 'Admin' : 'Member';
              return (
                <div className="profile-group" key={g.id}>
                  <div className="profile-group-info">
                    <strong>{g.name}</strong>
                    <small>{g.isPublic ? 'Public group' : 'Private circle'}</small>
                  </div>
                  <div className="profile-group-badges">
                    <span className={`profile-group-badge ${role === 'Owner' ? 'is-owner' : ''}`}>{role}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <p>No groups joined. Solo focus is just as welcome here.</p>
          )}
          <button className="analytics-button" onClick={() => onNavigate('groups')}>
            Open groups <ArrowRight size={14} />
          </button>
        </article>
      </div>

      {/* Sanctra Plus+ Section: VIP Membership Dashboard */}
      {(() => {
        const isAdmin = !!subscription?.adminAccess;
        const periodEndMs = subscription?.currentPeriodEnd || 0;
        const daysRemaining = isAdmin
          ? null
          : Math.max(0, Math.ceil((periodEndMs - Date.now()) / (1000 * 60 * 60 * 24)));

        const periodStartMs =
          subscription?.currentPeriodStart ||
          (periodEndMs ? periodEndMs - (subscription?.tier === 'monthly' ? 30 * 86400000 : 365 * 86400000) : Date.now());
        const totalPeriodDuration = Math.max(1, periodEndMs - periodStartMs);
        const periodElapsed = Math.max(0, Math.min(totalPeriodDuration, Date.now() - periodStartMs));
        const remainingPercent = isAdmin
          ? 100
          : Math.min(100, Math.max(4, Math.round(((totalPeriodDuration - periodElapsed) / totalPeriodDuration) * 100)));

        const validUntilFormatted = isAdmin
          ? 'Lifetime Active'
          : periodEndMs
          ? new Date(periodEndMs).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : 'Active';

        const planTitle = subscription?.adminAccess
          ? 'Admin Lifetime'
          : subscription?.isTrial
          ? 'Plus+ · Trial'
          : subscription?.tier === 'early_yearly'
          ? 'Early Backer (₹99/yr)'
          : subscription?.tier === 'yearly'
          ? 'Annual Sanctuary (₹159/yr)'
          : 'Monthly Pro (₹59/mo)';

        const VIP_SUPERPOWERS = [
          {
            id: 'ai-allowance',
            title: 'Extra AI allowance',
            subtitle: 'Higher daily AI allowance than Free',
            icon: Sparkles,
          },
          {
            id: 'avatar',
            title: 'Animated Avatar',
            subtitle: isPlus ? 'Five GIFs & your own GIF / MP4' : 'GIF & video portraits',
            icon: UserIcon,
          },
          {
            id: 'groups',
            title: 'More Study Groups',
            subtitle: isPlus ? 'Create up to 15 groups' : 'Create up to 15 groups',
            icon: Users,
          },
          {
            id: 'chat',
            title: '500 Msgs / Day',
            subtitle: isPlus ? '2x Free Chat Allowance' : 'Double Daily Allowance',
            icon: Zap,
          },
          {
            id: 'aura',
            title: 'Signature profile ring',
            subtitle: 'One subtle animated ring for Plus+',
            icon: Sparkles,
          },
          {
            id: 'codes',
            title: 'Custom Group Codes',
            subtitle: isPlus ? 'Custom Codes Unlocked' : 'Bespoke Room Passwords',
            icon: Hash,
          },
          {
            id: 'motion',
            title: 'Motion Wallpapers',
            subtitle: isPlus ? 'Animated focus backgrounds' : 'Living Focus Backgrounds',
            icon: Palette,
          },
          {
            id: 'concierge',
            title: 'Priority Support',
            subtitle: isPlus ? 'Priority support tickets' : 'Direct Support Channel',
            icon: ShieldCheck,
          },
        ];

        return isPlus ? (
          <article className="workspace-panel vip-membership-panel">
            <div className="vip-membership-top">
              <div className="vip-crown-badge-wrap">
                <Crown size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2>Premium Member</h2>
                  <span className="plus-badge">
                    <Crown size={11} /> Plus+
                  </span>
                </div>
                <p>Your Plus+ features are active</p>
              </div>
            </div>

            <div className="vip-status-box">
              <div className="vip-status-pills">
                <span className="vip-pill-plan">
                  <Gem size={13} />
                  {planTitle}
                </span>
                <span className="vip-pill-valid">
                  <Calendar size={13} />
                  {isAdmin ? 'Never expires' : `Valid until ${validUntilFormatted}`}
                </span>
              </div>

              {!isAdmin && <>
              <div className="vip-days-remaining">
                <div className="vip-days-number">
                  {isAdmin ? '∞' : daysRemaining}
                </div>
                <div className="vip-days-meta">
                  <strong>{isAdmin ? 'Lifetime Access' : daysRemaining === 1 ? 'Day Remaining' : 'Days Remaining'}</strong>
                  <span>{isAdmin ? 'Included with administrator privileges · Never expires' : `Active on ${planTitle}`}</span>
                </div>
              </div>

              <div className="vip-progress-wrap">
                <div className="vip-progress-bar">
                  <div
                    className="vip-progress-fill"
                    style={{ width: `${remainingPercent}%` }}
                  />
                </div>
                <div className="vip-progress-labels">
                  <span>{isAdmin ? 'Administrative entitlement active' : 'Subscription active'}</span>
                  <span>{isAdmin ? 'Never expires' : subscription?.cancelAtPeriodEnd ? 'Expires on period end' : 'Renew manually through support'}</span>
                </div>
              </div>
              </>}
            </div>

            <div className="vip-superpowers-wrap">
              <div className="vip-superpowers-heading">
                <Sparkles size={15} />
                <span>Included features</span>
              </div>
              <div className="vip-superpowers-grid">
                {VIP_SUPERPOWERS.map((sp) => {
                  const Icon = sp.icon;
                  return (
                    <div key={sp.id} className="vip-superpower-card">
                      <div className="vip-sp-icon">
                        <Icon size={17} />
                      </div>
                      <div className="vip-sp-info">
                        <strong>{sp.title}</strong>
                        <span>
                          <CheckCircle2 size={12} className="text-[var(--sanctra-sage)]" />
                          {sp.subtitle}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="vip-membership-footer">
              <p>
                {isAdmin
                  ? 'All Plus+ privileges are bundled with your administrator access.'
                  : 'Need assistance or changes? Reach out anytime to our support team.'}
              </p>
              <button
                className="analytics-button"
                onClick={() => onNavigate(isAdmin ? 'admin' : 'support')}
              >
                {isAdmin ? 'Open admin panel' : 'Contact support'} <ArrowRight size={14} />
              </button>
            </div>
          </article>
        ) : (
          <article className="workspace-panel vip-membership-panel">
            <div className="vip-membership-top">
              <div className="vip-crown-badge-wrap">
                <Crown size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2>Sanctra Plus+</h2>
                  <span className="plus-badge">
                    <Crown size={11} /> Elevate
                  </span>
                </div>
                <p>A more personal, distraction-free sanctuary with Plus+ personalization.</p>
              </div>
            </div>

            <div className="vip-status-box">
              <div className="vip-status-pills">
                <span className="vip-pill-plan">
                  <Gem size={13} />
                  Available Plans
                </span>
                <span className="vip-pill-valid">
                  <Calendar size={13} />
                  Direct UPI activation · no card required
                </span>
              </div>
              <div className="vip-prices">
                <div className="vip-price-pill">
                  <strong>₹59</strong> <span>/ month</span>
                </div>
                <div className="vip-price-pill">
                  <strong>₹159</strong> <span>/ year</span>
                </div>
                <div className="vip-price-pill is-highlight">
                  <strong>₹99</strong> <span>/ year · early backer</span>
                </div>
              </div>
            </div>

            <div className="vip-superpowers-wrap">
              <div className="vip-superpowers-heading">
                <Sparkles size={15} />
                <span>Plus+ features</span>
              </div>
              <div className="vip-superpowers-grid">
                {VIP_SUPERPOWERS.map((sp) => {
                  const Icon = sp.icon;
                  return (
                    <div key={sp.id} className="vip-superpower-card is-locked">
                      <div className="vip-sp-icon">
                        <Icon size={17} />
                      </div>
                      <div className="vip-sp-info">
                        <strong>{sp.title}</strong>
                        <span>
                          <Lock size={11} className="text-[var(--sanctra-muted)]" />
                          {sp.subtitle}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="vip-membership-footer">
              <p>
                Open a ticket for payment details. The team confirms UPI receipt and activates your membership directly. No recurring charges.
              </p>
              <button
                className="workspace-primary"
                onClick={() => onNavigate('support')}
              >
                Enquire via Support <ArrowRight size={14} />
              </button>
            </div>
          </article>
        );
      })()}

      <div className="workspace-panel profile-account">
        <div className="profile-account-info">
          <div className="profile-account-icon">
            <Shield size={20} />
          </div>
          <div>
            <strong>{user.isAnonymous ? 'Save your sanctuary' : 'Your account'}</strong>
            <p>{user.isAnonymous ? 'Link an account to keep your focus history across devices.' : user.email || 'Your account is connected.'}</p>
          </div>
        </div>
        <div className="workspace-actions">
          {user.isAnonymous && (
            <button className="workspace-primary" onClick={onAuth}>
              Link account
            </button>
          )}
          <button className="analytics-button" onClick={() => onNavigate(subscription?.adminAccess ? 'admin' : 'support')}>
            {subscription?.adminAccess ? 'Administration' : 'Help & feedback'}
          </button>
          <button className="analytics-button" onClick={onSignOut}>
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </div>
      </>}
    </section>
  );
}
