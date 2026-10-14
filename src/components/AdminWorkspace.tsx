import { AdminAccountInspector } from './AdminAccountInspector.tsx';
import { useEffect, useState } from 'react';
import {
  Crown,
  Sparkles,
  Shield,
  ShieldAlert,
  Search,
  X,
  User,
  Users,
  Clock,
  Check,
  Copy,
  History,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Radio,
} from 'lucide-react';
import { isEntitlementActive } from '../utils/subscriptionPlans.ts';
import { cloudErrorMessage } from '../utils/cloudErrors.ts';
import type { AuthUser, UserSubscription, SubscriptionTier } from '../types/index.ts';
import {
  subscribeAdminRoles,
  grantAdminAccess,
  revokeAdminAccess,
  grantTrialMembership,
  type AdminRole,
  subscribeModerationAudit,
  type ModerationEvent,
  subscribePlatformUsers,
  subscribeRestrictions,
  moderateUser,
  isRestricted,
  type PlatformUser,
  type Restriction,
  subscribeSubscriptions,
  grantUserSubscription,
  revokeUserSubscription,
} from '../utils/adminService.ts';

type StatusFilter = 'all' | 'active' | 'plus' | 'restricted' | 'admins';
type ManageTab = 'stats' | 'membership' | 'moderation' | 'admin';

export function AdminWorkspace({
  user,
  initialSelectedUid,
  onInspectGroup,
}: {
  user: AuthUser;
  initialSelectedUid?: string | null;
  onInspectGroup?: (groupId: string) => void;
}) {
  const [audit, setAudit] = useState<ModerationEvent[]>([]);
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [restrictions, setRestrictions] = useState<Record<string, Restriction>>({});
  const [subscriptions, setSubscriptions] = useState<Record<string, UserSubscription>>({});
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search & Filtering
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<'active' | 'name' | 'uid'>('active');

  // Selected Account & Management
  const [selected, setSelected] = useState<PlatformUser | null>(null);
  const [manageTab, setManageTab] = useState<ManageTab>('stats');
  const [copiedUid, setCopiedUid] = useState<string | null>(null);

  // Moderation state
  const [reason, setReason] = useState('');
  const [hours, setHours] = useState('24');
  const [customHours, setCustomHours] = useState('24');

  // Subscription granting state
  const [trialValue, setTrialValue] = useState(7);
  const [trialUnit, setTrialUnit] = useState<'minutes' | 'hours' | 'days'>('days');
  const [subTier, setSubTier] = useState<SubscriptionTier>('early_yearly');

  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const offRoles = subscribeAdminRoles(setRoles, setError);
    const offAudit = subscribeModerationAudit(setAudit, setError);
    const off = subscribePlatformUsers(setUsers, setError);
    const offRestrictions = subscribeRestrictions(setRestrictions, setError);
    const offSubscriptions = subscribeSubscriptions(setSubscriptions, setError);
    const tick = window.setInterval(() => setNow(Date.now()), 30000);
    return () => {
      offRoles();
      offAudit();
      off();
      offRestrictions();
      offSubscriptions();
      window.clearInterval(tick);
    };
  }, []);

  useEffect(() => {
    if (initialSelectedUid) {
      const match = users.find((u) => u.uid === initialSelectedUid);
      if (match) {
        setSelected(match);
        setManageTab('stats');
      } else {
        // Fallback user object if not yet loaded in list
        setSelected({
          uid: initialSelectedUid,
          displayName: 'Scholar',
          avatarUrl: '',
          isGuest: false,
          lastSeen: { toMillis: () => Date.now(), seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any,
        });
        setManageTab('stats');
      }
    }
  }, [initialSelectedUid, users]);

  const active = users.filter((u) => now - (u.lastSeen?.toMillis() || 0) < 150000);
  const plusUsers = users.filter((u) => roles.some(role=>role.uid===u.uid) || isEntitlementActive(subscriptions[u.uid] || null, now));
  const restrictedUsers = users.filter((u) => isRestricted(restrictions[u.uid] || null, now));
  const adminUids = new Set(roles.map((r) => r.uid));

  // Filtered & sorted users
  const filtered = users
    .filter((u) => !u.isGuest)
    .filter((u) => {
      if (statusFilter === 'active') return now - (u.lastSeen?.toMillis() || 0) < 150000;
      if (statusFilter === 'plus') return adminUids.has(u.uid) || isEntitlementActive(subscriptions[u.uid] || null, now);
      if (statusFilter === 'restricted') return isRestricted(restrictions[u.uid] || null, now);
      if (statusFilter === 'admins') return adminUids.has(u.uid);
      return true;
    })
    .filter((u) => {
      if (!search.trim()) return true;
      const term = search.toLowerCase();
      return u.displayName.toLowerCase().includes(term) || u.uid.toLowerCase().includes(term);
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.displayName.localeCompare(b.displayName);
      if (sortBy === 'uid') return a.uid.localeCompare(b.uid);
      return (b.lastSeen?.toMillis() || 0) - (a.lastSeen?.toMillis() || 0);
    });

  const canManageAdmins = roles.some((r) => r.uid === user.uid && r.canManageAdmins);
  const selectedRole = roles.find((r) => r.uid === selected?.uid);
  const selectedSub = selected ? subscriptions[selected.uid] : null;
  const selectedRestriction = selected ? restrictions[selected.uid] : null;
  const isSelectedRestricted = isRestricted(selectedRestriction || null, now);

  const perform = async (action: () => Promise<void>, successMessage: string) => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await action();
      setSuccess(successMessage);
    } catch (e) {
      setError(cloudErrorMessage(e, 'update this account'));
    } finally {
      setBusy(false);
    }
  };

  const copyUid = (uid: string) => {
    void navigator.clipboard.writeText(uid);
    setCopiedUid(uid);
    setTimeout(() => setCopiedUid(null), 2000);
  };

  // Helper for human-readable relative time
  const formatLastSeen = (millis: number) => {
    const diff = now - millis;
    if (diff < 150000) return 'Active now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return new Date(millis).toLocaleDateString();
  };

  return (
    <section className="admin-workspace space-y-6">
      {/* Platform Overview KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-[var(--sanctra-surface)] border border-[var(--sanctra-glass-border)] space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--sanctra-muted)] font-medium">
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Active Now
            </span>
            <Radio size={14} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-[var(--sanctra-paper)] mt-1">{active.length}</div>
          <div className="text-[11px] text-[var(--sanctra-muted)]">Within last 2½ mins</div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--sanctra-surface)] border border-[var(--sanctra-glass-border)] space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--sanctra-muted)] font-medium">
            <span>Accounts</span>
            <Users size={14} className="text-[var(--sanctra-sage)]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[var(--sanctra-paper)] mt-1">
            {users.filter((u) => !u.isGuest).length}
          </div>
          <div className="text-[11px] text-[var(--sanctra-muted)]">Registered scholars</div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--sanctra-surface)] border border-[var(--sanctra-glass-border)] space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--sanctra-muted)] font-medium">
            <span>Plus+ Members</span>
            <Crown size={14} className="text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-purple-300 mt-1">{plusUsers.length}</div>
          <div className="text-[11px] text-[var(--sanctra-muted)]">Active subscriptions</div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--sanctra-surface)] border border-[var(--sanctra-glass-border)] space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--sanctra-muted)] font-medium">
            <span>Restricted</span>
            <ShieldAlert size={14} className="text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-300 mt-1">{restrictedUsers.length}</div>
          <div className="text-[11px] text-[var(--sanctra-muted)]">Active restrictions</div>
        </div>
      </div>

      {/* Alerts & Toasts */}
      {error && (
        <div role="alert" className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center justify-between gap-3 animate-in fade-in-50">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={18} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError('')} className="p-1 hover:bg-white/10 rounded transition">
            <X size={14} />
          </button>
        </div>
      )}

      {success && (
        <div role="status" className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-center justify-between gap-3 animate-in fade-in-50">
          <div className="flex items-center gap-2.5">
            <CheckCircle size={18} className="flex-shrink-0" />
            <span>{success}</span>
          </div>
          <button type="button" onClick={() => setSuccess('')} className="p-1 hover:bg-white/10 rounded transition">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Directory & Inspector Container */}
      <div className="space-y-4">
        {/* Directory Navigation & Filter Toolbar */}
        <div className="p-4 rounded-2xl bg-[var(--sanctra-surface)] border border-[var(--sanctra-glass-border)] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <strong className="text-sm">Registered accounts</strong>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 text-xs text-[var(--sanctra-muted)]">
              <span>Sort by:</span>
              <select
                aria-label="Sort users list"
                className="inbox-input text-xs py-1 px-2.5 w-auto"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              >
                <option value="active">Last Active</option>
                <option value="name">Name</option>
                <option value="uid">UID</option>
              </select>
            </div>
          </div>

          {/* Search & Status Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--sanctra-glass-border)]">
            {/* Search Input with Clear Button */}
            <div className="relative flex-1 min-w-[240px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sanctra-muted)] pointer-events-none" />
              <input
                type="text"
                className="inbox-input pl-9 pr-8 text-xs py-2 w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, or user ID…"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-white/10 text-[var(--sanctra-muted)]"
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Status Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'All', count: users.length },
                { id: 'active', label: 'Active Now', count: active.filter((u) => !u.isGuest).length },
                { id: 'plus', label: 'Plus+ Only', count: plusUsers.filter((u) => !u.isGuest).length },
                { id: 'restricted', label: 'Restricted', count: restrictedUsers.filter((u) => !u.isGuest).length },
                { id: 'admins', label: 'Admins', count: roles.length },
              ].map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setStatusFilter(chip.id as StatusFilter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                    statusFilter === chip.id
                      ? 'bg-[var(--sanctra-sage)] text-[var(--sanctra-ink)] font-semibold'
                      : 'bg-white/[0.03] text-[var(--sanctra-muted)] hover:text-[var(--sanctra-paper)] hover:bg-white/[0.06] border border-[var(--sanctra-glass-border)]'
                  }`}
                >
                  <span>{chip.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    statusFilter === chip.id ? 'bg-black/20 text-[var(--sanctra-ink)]' : 'bg-white/5'
                  }`}>
                    {chip.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Directory Member List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
          {filtered.map((u) => {
            const userSub = subscriptions[u.uid];
            const hasPlus = adminUids.has(u.uid) || isEntitlementActive(userSub, now);
            const isOnline = now - (u.lastSeen?.toMillis() || 0) < 150000;
            const isUserRestricted = isRestricted(restrictions[u.uid] || null, now);
            const isAdmin = adminUids.has(u.uid);
            const isCurrentlySelected = selected?.uid === u.uid;

            return (
              <div
                key={u.uid}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                  isCurrentlySelected
                    ? 'bg-[var(--sanctra-surface)] border-[var(--sanctra-sage)] shadow-md ring-1 ring-[var(--sanctra-sage)]/30'
                    : 'bg-[var(--sanctra-surface)] hover:bg-white/[0.03] border-[var(--sanctra-glass-border)]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User size={20} className="text-[var(--sanctra-sage)]" />
                      )}
                      {isOnline && (
                        <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[var(--sanctra-surface)]" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <strong className="text-xs font-semibold text-[var(--sanctra-paper)] truncate">
                          {u.displayName || 'Scholar'}
                        </strong>

                        {isAdmin && (
                          <span className="admin-badge text-[10px] py-0 px-1.5">
                            <Shield size={10} /> Admin
                          </span>
                        )}

                        {hasPlus && (
                          <span className="plus-badge text-[10px] py-0 px-1.5">
                            <Crown size={10} /> {userSub?.isTrial ? 'Trial' : 'Plus+'}
                          </span>
                        )}

                        {isUserRestricted && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            Restricted
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[var(--sanctra-muted)]">
                        <span className="font-mono text-[10px] truncate max-w-[140px] opacity-75">{u.uid}</span>
                        <button
                          type="button"
                          onClick={() => copyUid(u.uid)}
                          className="hover:text-[var(--sanctra-paper)] p-0.5 rounded transition"
                          title="Copy UID"
                          aria-label="Copy UID"
                        >
                          {copiedUid === u.uid ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <span className="text-[11px] text-[var(--sanctra-muted)] flex-shrink-0 font-mono">
                    {formatLastSeen(u.lastSeen?.toMillis() || 0)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[var(--sanctra-glass-border)]">
                  <span className="text-[11px] text-[var(--sanctra-muted)]">
                    Registered user
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className={`analytics-button text-xs py-1.5 px-3 flex items-center gap-1.5 ${
                        isCurrentlySelected ? 'bg-[var(--sanctra-sage)] text-[var(--sanctra-ink)] font-semibold' : ''
                      }`}
                      onClick={() => {
                        setSelected(u);
                        setManageTab('stats');
                        setReason('');
                        setSuccess('');
                        setError('');
                      }}
                    >
                      <BarChart3 size={13} />
                      <span>{isCurrentlySelected ? 'Inspecting' : 'Inspect Stats'}</span>
                    </button>

                    <button
                      type="button"
                      className="analytics-button text-xs py-1.5 px-3"
                      disabled={busy || u.uid === user.uid}
                      onClick={() => {
                        setSelected(u);
                        setManageTab('membership');
                        setReason('');
                        setSuccess('');
                        setError('');
                      }}
                    >
                      Manage
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {!filtered.length && (
            <div className="col-span-full p-8 text-center rounded-2xl bg-[var(--sanctra-surface)] border border-[var(--sanctra-glass-border)] text-sm text-[var(--sanctra-muted)]">
              No accounts match the current search and filters.
            </div>
          )}
        </div>

        {/* Selected Member Management Panel */}
        {selected && (
          <div className="admin-manage-drawer p-5 rounded-2xl bg-[var(--sanctra-surface)] border-2 border-[var(--sanctra-sage)]/40 shadow-xl space-y-5 animate-in slide-in-from-bottom-4 duration-300">
            {/* Drawer Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--sanctra-glass-border)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                  {selected.avatarUrl ? (
                    <img src={selected.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User size={20} className="text-[var(--sanctra-sage)]" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-[var(--sanctra-paper)]">
                      {selected.displayName || 'Scholar'}
                    </h3>
                    {isSelectedRestricted && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        Restricted
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--sanctra-muted)]">
                    <span className="font-mono text-[11px]">{selected.uid}</span>
                    <button
                      type="button"
                      onClick={() => copyUid(selected.uid)}
                      className="hover:text-[var(--sanctra-paper)] p-0.5 rounded transition"
                      title="Copy UID"
                    >
                      {copiedUid === selected.uid ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                    <span>·</span>
                    <span>{formatLastSeen(selected.lastSeen?.toMillis() || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                className="analytics-button text-xs py-1.5 px-3 flex items-center gap-1.5 text-[var(--sanctra-muted)] hover:text-white"
                onClick={() => setSelected(null)}
              >
                <X size={14} />
                <span>Close Inspector</span>
              </button>
            </div>

            {/* Management Mode Tabs */}
            <nav className="flex flex-wrap gap-1.5 p-1 bg-black/20 rounded-xl border border-[var(--sanctra-glass-border)]" aria-label="Management options">
              <button
                type="button"
                aria-pressed={manageTab === 'stats'}
                onClick={() => setManageTab('stats')}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                  manageTab === 'stats'
                    ? 'bg-[var(--sanctra-surface)] text-[var(--sanctra-paper)] shadow-sm'
                    : 'text-[var(--sanctra-muted)] hover:text-[var(--sanctra-paper)]'
                }`}
              >
                <BarChart3 size={14} className="text-[var(--sanctra-sage)]" />
                <span>Member Activity & Stats</span>
              </button>

              <button
                type="button"
                aria-pressed={manageTab === 'membership'}
                onClick={() => setManageTab('membership')}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                  manageTab === 'membership'
                    ? 'bg-[var(--sanctra-surface)] text-[var(--sanctra-paper)] shadow-sm'
                    : 'text-[var(--sanctra-muted)] hover:text-[var(--sanctra-paper)]'
                }`}
              >
                <Crown size={14} className="text-purple-400" />
                <span>Plus+ Membership & Trials</span>
              </button>

              <button
                type="button"
                aria-pressed={manageTab === 'moderation'}
                onClick={() => setManageTab('moderation')}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                  manageTab === 'moderation'
                    ? 'bg-[var(--sanctra-surface)] text-[var(--sanctra-paper)] shadow-sm'
                    : 'text-[var(--sanctra-muted)] hover:text-[var(--sanctra-paper)]'
                }`}
              >
                <ShieldAlert size={14} className="text-rose-400" />
                <span>Moderation & Safety</span>
              </button>

              {!selected.isGuest && canManageAdmins && (
                <button
                  type="button"
                  aria-pressed={manageTab === 'admin'}
                  onClick={() => setManageTab('admin')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                    manageTab === 'admin'
                      ? 'bg-[var(--sanctra-surface)] text-[var(--sanctra-paper)] shadow-sm'
                      : 'text-[var(--sanctra-muted)] hover:text-[var(--sanctra-paper)]'
                  }`}
                >
                  <Shield size={14} className="text-indigo-400" />
                  <span>Admin Access</span>
                </button>
              )}
            </nav>

            {/* TAB CONTENT: STATS (INSPECTOR) */}
            {manageTab === 'stats' && (
              <div className="pt-2">
                <AdminAccountInspector key={selected.uid} uid={selected.uid} displayName={selected.displayName} onInspectGroup={onInspectGroup} />
              </div>
            )}

            {/* TAB CONTENT: MEMBERSHIP */}
            {manageTab === 'membership' && (
              <div className="space-y-5 animate-in fade-in-50 duration-200">
                {/* Active Entitlement Status */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-[var(--sanctra-glass-border)] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-amber-400" />
                      <h4 className="text-sm font-semibold text-[var(--sanctra-paper)]">Subscription Status</h4>
                    </div>
                    {isEntitlementActive(selectedSub, now) ? (
                      <span className="plus-badge">
                        <Crown size={12} />
                        Active ({selectedSub?.isTrial ? 'Plus+ Trial' : selectedSub?.tier === 'early_yearly' ? 'Early Believer (₹99)' : selectedSub?.tier === 'yearly' ? 'Annual Plan (₹159)' : 'Monthly Plan (₹59)'})
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--sanctra-muted)]">Standard Member (Free)</span>
                    )}
                  </div>

                  {isEntitlementActive(selectedSub, now) && (
                    <div className="p-3 rounded-lg bg-black/20 text-xs text-[var(--sanctra-paper)] flex flex-wrap items-center justify-between gap-3 border border-white/5">
                      <div>
                        <span className="text-[var(--sanctra-muted)]">Current period ends:</span>{' '}
                        <strong className="font-mono">{new Date(selectedSub!.currentPeriodEnd).toLocaleString()}</strong>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          className="analytics-button text-xs py-1.5 px-3"
                          onClick={() => void perform(() => grantUserSubscription(selected.uid, subTier), 'Subscription extended.')}
                        >
                          Extend Membership
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          className="analytics-button text-xs py-1.5 px-3 text-rose-300 hover:text-rose-200"
                          onClick={() => void perform(() => revokeUserSubscription(selected.uid), 'Plus+ access revoked.')}
                        >
                          Revoke Plus+
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Trial Presets */}
                {!selected.isGuest && (
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-[var(--sanctra-glass-border)] space-y-3">
                    <h4 className="text-sm font-semibold text-[var(--sanctra-paper)] flex items-center gap-2">
                      <Clock size={16} className="text-amber-400" />
                      <span>Instant Trial Membership</span>
                    </h4>
                    <p className="text-xs text-[var(--sanctra-muted)]">
                      Grant temporary full Plus+ perks. The trial automatically expires at the scheduled end timestamp.
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {[
                        { label: '24 Hours', val: 24, unit: 'hours' as const },
                        { label: '3 Days', val: 3, unit: 'days' as const },
                        { label: '7 Days', val: 7, unit: 'days' as const },
                        { label: '14 Days', val: 14, unit: 'days' as const },
                        { label: '30 Days', val: 30, unit: 'days' as const },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          disabled={busy}
                          className="analytics-button text-xs py-1.5 px-3"
                          onClick={() => void perform(() => grantTrialMembership(selected.uid, preset.val, preset.unit), `${preset.label} trial activated.`)}
                        >
                          + {preset.label}
                        </button>
                      ))}
                    </div>

                    {/* Custom Trial Duration */}
                    <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[var(--sanctra-glass-border)]">
                      <span className="text-xs text-[var(--sanctra-muted)]">Custom:</span>
                      <input
                        aria-label="Trial duration"
                        type="number"
                        min="1"
                        className="inbox-input text-xs py-1 px-2.5 w-20"
                        value={trialValue}
                        onChange={(e) => setTrialValue(Number(e.target.value))}
                      />
                      <select
                        aria-label="Trial unit"
                        className="inbox-input text-xs py-1 px-2.5 w-auto"
                        value={trialUnit}
                        onChange={(e) => setTrialUnit(e.target.value as typeof trialUnit)}
                      >
                        <option value="minutes">Minutes</option>
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                      </select>
                      <button
                        type="button"
                        disabled={busy || trialValue <= 0}
                        className="workspace-primary text-xs py-1.5 px-3"
                        onClick={() => void perform(() => grantTrialMembership(selected.uid, trialValue, trialUnit), `Custom trial activated.`)}
                      >
                        Activate Custom Trial
                      </button>
                    </div>
                  </div>
                )}

                {/* Manual Paid Plan Grant */}
                {!selected.isGuest && (
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-[var(--sanctra-glass-border)] space-y-3">
                    <h4 className="text-sm font-semibold text-[var(--sanctra-paper)] flex items-center gap-2">
                      <Crown size={16} className="text-purple-400" />
                      <span>Manual Full Membership Grant</span>
                    </h4>
                    <p className="text-xs text-[var(--sanctra-muted)]">
                      Assign a direct full subscription term for payment assistance, manual invoices, or community awards.
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <select
                        aria-label="Select subscription plan"
                        className="inbox-input text-xs py-1.5 px-3 w-auto"
                        value={subTier}
                        onChange={(e) => setSubTier(e.target.value as SubscriptionTier)}
                      >
                        <option value="early_yearly">Early Believer Offer (₹99 · 1 Year)</option>
                        <option value="yearly">Standard Annual Plan (₹159 · 1 Year)</option>
                        <option value="monthly">Monthly Plan (₹59 · 30 Days)</option>
                      </select>

                      <button
                        type="button"
                        disabled={busy}
                        className="workspace-primary text-xs py-1.5 px-3"
                        onClick={() => void perform(() => grantUserSubscription(selected.uid, subTier), `Plus+ granted (${subTier}).`)}
                      >
                        Grant Sanctra Plus+
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: MODERATION */}
            {manageTab === 'moderation' && (
              <form
                className="space-y-4 animate-in fade-in-50 duration-200"
                onSubmit={(e) => {
                  e.preventDefault();
                  void perform(
                    () =>
                      moderateUser(
                        user.uid,
                        selected.uid,
                        reason,
                        hours === 'forever' ? null : Number(hours === 'custom' ? customHours : hours)
                      ),
                    `Moderation action applied for ${selected.displayName}.`
                  );
                }}
              >
                <div className="p-4 rounded-xl bg-white/[0.02] border border-[var(--sanctra-glass-border)] space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-[var(--sanctra-paper)] flex items-center gap-2">
                      <ShieldAlert size={16} className="text-rose-400" />
                      <span>Account Restriction & Access Control</span>
                    </h4>
                    {isSelectedRestricted && (
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        Currently Restricted
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--sanctra-muted)]">
                    Restricting an account pauses sync and community access. Saved local sessions and records remain safe.
                  </p>

                  {isSelectedRestricted && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 space-y-1">
                      <div>
                        <strong>Reason:</strong> {selectedRestriction?.reason}
                      </div>
                      <div>
                        <strong>Expires:</strong>{' '}
                        {selectedRestriction?.permanent ? 'Permanent Ban' : new Date(selectedRestriction!.expiresAt).toLocaleString()}
                      </div>
                    </div>
                  )}

                  <label className="block text-xs font-medium text-[var(--sanctra-paper)]">
                    Moderation Reason
                    <textarea
                      required
                      maxLength={1000}
                      rows={3}
                      className="inbox-input mt-1.5 text-xs w-full"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Explain the reason for restriction (community violation, spam, etc.)"
                    />
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block text-xs font-medium text-[var(--sanctra-paper)]">
                      Duration
                      <select
                        className="inbox-input mt-1.5 text-xs w-full"
                        value={hours}
                        onChange={(e) => setHours(e.target.value)}
                      >
                        <option value="1">1 hour timeout</option>
                        <option value="24">24 hours cooldown</option>
                        <option value="168">7 days suspension</option>
                        <option value="720">30 days suspension</option>
                        <option value="custom">Custom hours</option>
                        <option value="forever">Permanent ban</option>
                      </select>
                    </label>

                    {hours === 'custom' && (
                      <label className="block text-xs font-medium text-[var(--sanctra-paper)]">
                        Custom Hours
                        <input
                          type="number"
                          min="0.1"
                          max="87600"
                          step="0.1"
                          required
                          value={customHours}
                          onChange={(e) => setCustomHours(e.target.value)}
                          className="inbox-input mt-1.5 text-xs w-full"
                        />
                      </label>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <button type="submit" disabled={busy || !reason.trim()} className="workspace-primary text-xs py-2 px-4">
                      Apply Restriction
                    </button>

                    {isSelectedRestricted && (
                      <button
                        type="button"
                        disabled={busy}
                        className="analytics-button text-xs py-2 px-4 text-emerald-300 hover:text-emerald-200"
                        onClick={() =>
                          void perform(
                            () => moderateUser(user.uid, selected.uid, reason || 'Lifted by administrator', null, false),
                            `Restriction lifted for ${selected.displayName}.`
                          )
                        }
                      >
                        Lift Restriction
                      </button>
                    )}
                  </div>
                </div>
              </form>
            )}

            {/* TAB CONTENT: ADMIN ACCESS */}
            {manageTab === 'admin' && !selected.isGuest && canManageAdmins && (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-[var(--sanctra-glass-border)] space-y-4 animate-in fade-in-50 duration-200">
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-indigo-400" />
                  <h4 className="text-sm font-semibold text-[var(--sanctra-paper)]">Administrator Roles</h4>
                </div>
                <p className="text-xs text-[var(--sanctra-muted)]">
                  Platform administrators have full access to inspect accounts, grant trials, respond to support tickets, and moderate community groups.
                </p>

                <div className="p-3 rounded-xl bg-black/20 text-xs border border-white/5 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[var(--sanctra-muted)]">Current role:</span>{' '}
                    <strong className="text-[var(--sanctra-paper)]">
                      {selectedRole ? 'Platform Administrator' : 'Standard Scholar'}
                    </strong>
                  </div>

                  <button
                    type="button"
                    disabled={busy || selectedRole?.canManageAdmins}
                    className="analytics-button text-xs py-1.5 px-3"
                    onClick={() =>
                      void perform(
                        () => (selectedRole ? revokeAdminAccess(selected.uid) : grantAdminAccess(user.uid, selected.uid)),
                        selectedRole ? 'Administrator access revoked.' : 'Administrator access granted.'
                      )
                    }
                  >
                    {selectedRole ? 'Revoke Admin Access' : 'Grant Admin Access'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Moderation Audit Log Accordion */}
      <details className="border-t border-[var(--sanctra-glass-border)] pt-4 group">
        <summary className="cursor-pointer text-xs font-semibold text-[var(--sanctra-muted)] hover:text-[var(--sanctra-paper)] flex items-center gap-2 select-none">
          <History size={14} className="text-[var(--sanctra-sage)]" />
          <span>Recent Moderation Audit Records ({audit.length})</span>
        </summary>
        <div className="space-y-2.5 mt-3 max-h-72 overflow-y-auto pr-1">
          {audit.map((a) => (
            <article key={a.id} className="p-3 rounded-xl bg-white/[0.02] border border-[var(--sanctra-glass-border)] text-xs space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <strong className={a.active ? 'text-rose-300' : 'text-emerald-300'}>
                  {a.active ? (a.permanent ? 'Permanent Ban' : 'Timed Restriction') : 'Restriction Lifted'}
                </strong>
                <span className="text-[var(--sanctra-muted)] font-mono">
                  {a.updatedAt?.toDate().toLocaleString() || 'Recent'}
                </span>
              </div>
              <p className="text-[11px] text-[var(--sanctra-muted)] font-mono break-all">
                Target UID: {a.targetUid}
              </p>
              {a.reason && <p className="text-xs text-[var(--sanctra-paper)] mt-1 whitespace-pre-wrap">{a.reason}</p>}
            </article>
          ))}
          {!audit.length && (
            <p className="text-xs text-[var(--sanctra-muted)] italic">No moderation events recorded yet.</p>
          )}
        </div>
      </details>
    </section>
  );
}
