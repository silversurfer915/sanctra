import {AdminAiPanel} from '../AdminAiPanel.tsx';
import {AdminIntegrations} from '../AdminIntegrations.tsx';
import {StudyIntegrityPanel} from '../StudyIntegrityPanel.tsx';
import { useEffect, useState } from 'react';
import { Shield, Users, MessagesSquare, Megaphone, Headphones, SlidersHorizontal, Sparkles } from 'lucide-react';
import type { AuthUser } from '../../types/index.ts';
import { subscribeAdmin } from '../../utils/adminService.ts';
import { AdminWorkspace } from '../AdminWorkspace.tsx';
import { AdminGroups } from '../AdminGroups.tsx';
import { SupportTickets } from '../SupportTickets.tsx';
import { PlatformControls } from '../PlatformControls.tsx';
import { AnnouncementEditor } from '../AnnouncementEditor.tsx';

export function AdminView({ user }: { user: AuthUser }) {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<'users' | 'groups' | 'support' | 'announcements' | 'platform' | 'integrity' | 'ai' | 'integrations'>(()=>sessionStorage.getItem('sanctra-admin-open-support')==='true'?'support':'users');
  const [targetGroupId, setTargetGroupId] = useState<string | null>(null);
  const [targetMemberUid, setTargetMemberUid] = useState<string | null>(null);

  useEffect(()=>{const open=()=>{setTab('support');sessionStorage.removeItem('sanctra-admin-open-support');};if(sessionStorage.getItem('sanctra-admin-open-support')==='true')open();window.addEventListener('sanctra-open-support-queue',open);return()=>window.removeEventListener('sanctra-open-support-queue',open);},[]);
  useEffect(() => subscribeAdmin(user.uid, setAllowed), [user.uid]);

  const handleInspectGroup = (groupId: string) => {
    setTargetGroupId(groupId);
    setTab('groups');
  };

  const handleInspectMember = (uid: string) => {
    setTargetMemberUid(uid);
    setTab('users');
  };

  return (
    <section className="workspace-page admin-page space-y-6">
      <header className="workspace-heading">
        <div>
          <p className="workspace-eyebrow flex items-center gap-1.5">
            <Shield size={14} className="text-[var(--sanctra-sage)]" />
            <span>Sanctra Executive Operations</span>
          </p>
          <h1 className="text-2xl sm:text-3xl font-serif">Platform Administration</h1>
          <p className="text-sm text-[var(--sanctra-muted)] max-w-xl">
            Real-time telemetry, comprehensive member analytics, moderation, and community safeguards.
          </p>
        </div>
        <span
          className={`profile-status flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
            allowed
              ? 'bg-[var(--sanctra-sage)]/15 text-[var(--sanctra-sage)] border border-[var(--sanctra-sage)]/30'
              : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
          }`}
        >
          <Shield size={12} />
          <span>{allowed ? 'Platform Administrator' : 'Restricted Sanctuary'}</span>
        </span>
      </header>

      {allowed === null ? (
        <div className="p-12 text-center text-sm text-[var(--sanctra-muted)] animate-pulse">
          Verifying administrator credentials…
        </div>
      ) : !allowed ? (
        <div className="workspace-panel empty-panel p-12 text-center space-y-3">
          <Shield size={36} className="mx-auto text-rose-400 opacity-60" />
          <h2 className="text-xl font-bold text-[var(--sanctra-paper)]">Administrator Access Required</h2>
          <p className="text-sm text-[var(--sanctra-muted)] max-w-md mx-auto">
            This protected space requires an authorized platform administrator account. If you believe this is an error, please reach out via support.
          </p>
        </div>
      ) : (
        <>
          {/* Main Top Navigation Tabs */}
          <nav className="workspace-tabs admin-tabs flex flex-wrap gap-1.5 p-1 bg-black/20 rounded-2xl border border-[var(--sanctra-glass-border)]" aria-label="Admin sections">
            {[
              { id: 'users', label: 'Users & Safety', Icon: Users },
              { id: 'groups', label: 'All Communities', Icon: MessagesSquare },
              {id:'integrity',label:'Time integrity',Icon:Shield},
              {id:'ai',label:'AI',Icon:Sparkles},
              {id:'integrations',label:'Integrations',Icon:SlidersHorizontal},
              { id: 'support', label: 'Support Queue', Icon: Headphones },
              { id: 'announcements', label: 'Broadcasts', Icon: Megaphone },
              { id: 'platform', label: 'System Controls', Icon: SlidersHorizontal, Sparkles },
            ].map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTab(t.id as typeof tab)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                    active
                      ? 'bg-[var(--sanctra-surface)] text-[var(--sanctra-paper)] shadow-md border border-[var(--sanctra-glass-border)]'
                      : 'text-[var(--sanctra-muted)] hover:text-[var(--sanctra-paper)] hover:bg-white/[0.03]'
                  }`}
                >
                  <t.Icon size={16} className={active ? 'text-[var(--sanctra-sage)]' : 'opacity-70'} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </nav>

          {tab === 'users' && (
            <AdminWorkspace
              user={user}
              initialSelectedUid={targetMemberUid}
              onInspectGroup={handleInspectGroup}
            />
          )}

          {tab === 'groups' && (
            <AdminGroups
              user={user}
              selectedGroupId={targetGroupId}
              onInspectMember={handleInspectMember}
            />
          )}

          {tab === 'support' && <SupportTickets user={user} admin />}
          {tab === 'announcements' && <AnnouncementEditor user={user} />}
          {tab==='integrity'&&<StudyIntegrityPanel user={user}/>}
          {tab==='ai'&&<AdminAiPanel/>}
          {tab==='integrations'&&<AdminIntegrations user={user}/>}
          {tab === 'platform' && <PlatformControls user={user} />}
        </>
      )}
    </section>
  );
}
