import { useEffect, useRef, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  writeBatch,
} from 'firebase/firestore';
import {
  ArrowLeft,
  Lock,
  Globe,
  Trash2,
  Search,
  Users,
  MessageSquare,
  Copy,
  Check,
  AlertTriangle,
  X,
  ExternalLink,
} from 'lucide-react';
import { getCloudDatabase } from '../utils/firebase.ts';
import { watchLiveChat, watchLiveMembers, type LiveGroup } from '../utils/liveGroups.ts';
import type { LiveGroupMember } from '../utils/groupInsights.ts';
import type { GroupChatMessage } from '../types/groups.ts';
import type { AuthUser } from '../types/index.ts';

interface AdminGroupsProps {
  user: AuthUser;
  selectedGroupId?: string | null;
  onInspectMember?: (uid: string) => void;
}

export function AdminGroups({ user, selectedGroupId, onInspectMember }: AdminGroupsProps) {
  const [groups, setGroups] = useState<LiveGroup[]>([]);
  const [selected, setSelected] = useState<string | null>(selectedGroupId || null);
  const [messages, setMessages] = useState<GroupChatMessage[]>([]);
  const [members, setMembers] = useState<LiveGroupMember[]>([]);
  const [search, setSearch] = useState('');
  const [chatSearch, setChatSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'public' | 'private' | 'deleted'>('all');
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedUid, setCopiedUid] = useState<string | null>(null);

  // Pagination for chat
  const [pages, setPages] = useState<Record<number, GroupChatMessage[]>>({});
  const [hasOlder, setHasOlder] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const olderOff = useRef<(() => void)[]>([]);
  const loadVersion = useRef(0);

  useEffect(() => {
    if (selectedGroupId) {
      setSelected(selectedGroupId);
    }
  }, [selectedGroupId]);

  useEffect(() => {
    const db = getCloudDatabase();
    if (!db) return;
    return onSnapshot(
      query(collection(db, 'study_groups'), limit(1000)),
      (s) => setGroups(s.docs.map((d) => ({ ...d.data(), id: d.id } as LiveGroup))),
      () => setError('Owner access to groups could not be loaded.')
    );
  }, []);

  useEffect(() => {
    loadVersion.current++;
    setLoadingOlder(false);
    setMessages([]);
    setMembers([]);
    setConfirm(false);
    setPages({});
    setHasOlder(true);
    olderOff.current.forEach((f) => f());
    olderOff.current = [];
    if (!selected) return;

    const off = [
      watchLiveChat(selected, setMessages, (e) => setError(e.message)),
      watchLiveMembers(selected, setMembers, (e) => setError(e.message)),
    ];

    return () => {
      loadVersion.current++;
      off.forEach((f) => f());
      olderOff.current.forEach((f) => f());
      olderOff.current = [];
    };
  }, [selected]);

  const group = groups.find((g) => g.id === selected);

  const allMessages = [...new Map([...Object.values(pages).flat(), ...messages].map((m) => [m.id, m])).values()].sort(
    (a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id)
  );

  const filteredChatMessages = allMessages.filter((m) => {
    if (!chatSearch.trim()) return true;
    const term = chatSearch.toLowerCase();
    return m.text.toLowerCase().includes(term) || m.senderName.toLowerCase().includes(term);
  });

  const loadOlder = async () => {
    const db = getCloudDatabase(),
      oldest = allMessages[0];
    if (!db || !selected || !oldest) return;
    const version = loadVersion.current;
    setLoadingOlder(true);
    setError('');
    try {
      const anchor = await getDoc(doc(db, 'study_groups', selected, 'messages', oldest.id));
      if (version !== loadVersion.current) return;
      if (!anchor.exists()) {
        setError('The conversation changed. Retry loading earlier messages.');
        setLoadingOlder(false);
        return;
      }
      const page = olderOff.current.length;
      const off = onSnapshot(
        query(
          collection(db, 'study_groups', selected, 'messages'),
          orderBy('timestamp', 'desc'),
          startAfter(anchor),
          limit(100)
        ),
        (snapshot) => {
          setPages((v) => ({
            ...v,
            [page]: snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as GroupChatMessage)),
          }));
          if (page === olderOff.current.length - 1) setHasOlder(snapshot.size === 100);
          setLoadingOlder(false);
        },
        () => {
          setError('Earlier messages could not be loaded.');
          setLoadingOlder(false);
        }
      );
      olderOff.current.push(off);
    } catch {
      setError('Earlier messages could not be loaded.');
      setLoadingOlder(false);
    }
  };

  const removeGroup = async () => {
    const db = getCloudDatabase();
    if (!db || !group) return;
    setBusy(true);
    setError('');
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'study_groups', group.id), { deleted: true });
      batch.set(doc(db, 'group_moderation_audit', crypto.randomUUID()), {
        groupId: group.id,
        groupName: group.name,
        actorUid: user.uid,
        reason: reason.trim(),
        action: 'delete',
        createdAt: serverTimestamp(),
      });
      await batch.commit();
      setConfirm(false);
      setReason('');
    } catch {
      setError('Could not delete this group. Retry when connected.');
    } finally {
      setBusy(false);
    }
  };

  const copyRoomCode = (code: string) => {
    void navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyUid = (uid: string) => {
    void navigator.clipboard.writeText(uid);
    setCopiedUid(uid);
    setTimeout(() => setCopiedUid(null), 2000);
  };

  // Group directory filters
  const publicCount = groups.filter((g) => !g.deleted && g.isPublic).length;
  const privateCount = groups.filter((g) => !g.deleted && !g.isPublic).length;
  const deletedCount = groups.filter((g) => g.deleted).length;

  const filteredGroups = groups
    .filter((g) => {
      if (filter === 'public') return !g.deleted && g.isPublic;
      if (filter === 'private') return !g.deleted && !g.isPublic;
      if (filter === 'deleted') return g.deleted;
      return !g.deleted;
    })
    .filter((g) => {
      if (!search.trim()) return true;
      const term = search.toLowerCase();
      return (
        g.name.toLowerCase().includes(term) ||
        (g.createdByName && g.createdByName.toLowerCase().includes(term)) ||
        (g.roomCode && g.roomCode.toLowerCase().includes(term)) ||
        g.id.toLowerCase().includes(term)
      );
    });

  return (
    <section className="admin-groups space-y-6">
      {/* Top Group Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-[var(--sanctra-surface)] border border-[var(--sanctra-glass-border)] space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--sanctra-muted)] font-medium">
            <span>Total Active Groups</span>
            <Users size={14} className="text-[var(--sanctra-sage)]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[var(--sanctra-paper)] mt-1">
            {groups.filter((g) => !g.deleted).length}
          </div>
          <div className="text-[11px] text-[var(--sanctra-muted)]">Across platform</div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--sanctra-surface)] border border-[var(--sanctra-glass-border)] space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--sanctra-muted)] font-medium">
            <span>Public Sanctuaries</span>
            <Globe size={14} className="text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-sky-300 mt-1">{publicCount}</div>
          <div className="text-[11px] text-[var(--sanctra-muted)]">Open to anyone</div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--sanctra-surface)] border border-[var(--sanctra-glass-border)] space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--sanctra-muted)] font-medium">
            <span>Private Circles</span>
            <Lock size={14} className="text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-300 mt-1">{privateCount}</div>
          <div className="text-[11px] text-[var(--sanctra-muted)]">Code-protected</div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--sanctra-surface)] border border-[var(--sanctra-glass-border)] space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--sanctra-muted)] font-medium">
            <span>Moderation Archive</span>
            <Trash2 size={14} className="text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-300 mt-1">{deletedCount}</div>
          <div className="text-[11px] text-[var(--sanctra-muted)]">Deleted groups</div>
        </div>
      </div>

      {error && (
        <div role="alert" className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center justify-between gap-3">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} className="p-1 hover:bg-white/10 rounded transition">
            <X size={14} />
          </button>
        </div>
      )}

      {group ? (
        /* INSPECTING A SINGLE GROUP */
        <div className="space-y-5 animate-in fade-in-50 duration-200">
          {/* Group Header Banner */}
          <div className="p-5 rounded-2xl bg-[var(--sanctra-surface)] border border-[var(--sanctra-glass-border)] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                className="analytics-button text-xs py-1.5 px-3 flex items-center gap-1.5"
                onClick={() => setSelected(null)}
              >
                <ArrowLeft size={14} />
                <span>All Groups</span>
              </button>

              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                    group.deleted
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : group.isPublic
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {group.deleted ? <Trash2 size={12} /> : group.isPublic ? <Globe size={12} /> : <Lock size={12} />}
                  <span>{group.deleted ? 'Deleted Archive' : group.isPublic ? 'Public Group' : 'Private Group'}</span>
                </span>

                {!group.deleted && (
                  <button
                    type="button"
                    className="analytics-button text-xs py-1.5 px-3 text-rose-300 hover:text-rose-200 flex items-center gap-1.5"
                    onClick={() => setConfirm(true)}
                  >
                    <Trash2 size={13} />
                    <span>Delete Group</span>
                  </button>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold text-[var(--sanctra-paper)]">{group.name}</h3>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/20 text-xs font-mono border border-white/5">
                  <span className="text-[var(--sanctra-muted)]">Code:</span>
                  <span className="font-bold text-[var(--sanctra-paper)]">{group.roomCode}</span>
                  <button
                    type="button"
                    onClick={() => copyRoomCode(group.roomCode || '')}
                    className="hover:text-white p-0.5 rounded transition"
                    title="Copy Room Code"
                  >
                    {copiedCode ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                  </button>
                </div>
              </div>

              {group.description && (
                <p className="text-xs text-[var(--sanctra-muted)] mt-1.5 max-w-2xl">{group.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-[var(--sanctra-muted)] pt-2 border-t border-[var(--sanctra-glass-border)]">
                <span>
                  Owner:{' '}
                  <strong className="text-[var(--sanctra-paper)]">{group.createdByName || 'Scholar'}</strong>
                </span>
                <span className="font-mono text-[11px] opacity-75 flex items-center gap-1">
                  {group.createdById}
                  <button
                    type="button"
                    onClick={() => copyUid(group.createdById)}
                    className="hover:text-[var(--sanctra-paper)] p-0.5 rounded transition"
                    title="Copy Owner UID"
                  >
                    {copiedUid === group.createdById ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                  </button>
                </span>
                {onInspectMember && (
                  <button
                    type="button"
                    className="text-[var(--sanctra-sage)] hover:underline flex items-center gap-1"
                    onClick={() => onInspectMember(group.createdById)}
                  >
                    <span>Inspect Owner Account</span>
                    <ExternalLink size={11} />
                  </button>
                )}
              </div>
            </div>

            {/* Delete Confirmation Form */}
            {confirm && (
              <form
                className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-3 animate-in fade-in-50"
                onSubmit={(e) => {
                  e.preventDefault();
                  void removeGroup();
                }}
              >
                <div className="flex items-center gap-2 text-rose-300 font-semibold text-sm">
                  <AlertTriangle size={16} />
                  <span>Confirm deletion of “{group.name}”</span>
                </div>
                <p className="text-xs text-[var(--sanctra-muted)]">
                  The group closes for all members immediately. Conversation history is retained in the moderation archive.
                </p>

                <label className="block text-xs font-medium text-[var(--sanctra-paper)]">
                  Moderation Reason
                  <textarea
                    required
                    maxLength={1000}
                    rows={2}
                    className="inbox-input mt-1 text-xs w-full"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Enter the violation or moderation reason..."
                  />
                </label>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={busy || !reason.trim()}
                    className="workspace-primary text-xs py-1.5 px-3 bg-rose-600 hover:bg-rose-500 border-rose-500"
                  >
                    {busy ? 'Deleting…' : 'Confirm Group Deletion'}
                  </button>
                  <button
                    type="button"
                    className="analytics-button text-xs py-1.5 px-3"
                    onClick={() => setConfirm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Members Roster & Chat Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Member Roster (1/3 width) */}
            <div className="p-4 rounded-2xl bg-[var(--sanctra-surface)] border border-[var(--sanctra-glass-border)] space-y-3 flex flex-col max-h-[600px]">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--sanctra-glass-border)]">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-[var(--sanctra-sage)]" />
                  <h4 className="text-sm font-semibold text-[var(--sanctra-paper)]">
                    Members ({members.filter((m) => m.joined !== false).length})
                  </h4>
                </div>
              </div>

              <div className="space-y-2 overflow-y-auto flex-1 pr-1">
                {members.map((m) => {
                  const isOwner = m.uid === group.createdById;
                  const isAdmin = group.adminIds?.includes(m.uid);
                  const role = isOwner ? 'Owner' : isAdmin ? 'Admin' : 'Member';

                  return (
                    <div
                      key={m.uid}
                      className="p-3 rounded-xl bg-white/[0.02] border border-[var(--sanctra-glass-border)] space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <strong className="text-xs font-semibold text-[var(--sanctra-paper)] truncate block">
                            {m.displayName}
                            {m.joined === false && ' (Left)'}
                          </strong>
                          <span
                            className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-medium mt-0.5 ${
                              isOwner
                                ? 'bg-amber-400/20 text-amber-300'
                                : isAdmin
                                ? 'bg-sky-400/20 text-sky-300'
                                : 'bg-white/5 text-[var(--sanctra-muted)]'
                            }`}
                          >
                            {role}
                          </span>
                        </div>

                        {onInspectMember && (
                          <button
                            type="button"
                            className="analytics-button text-[10px] py-1 px-2 flex items-center gap-1"
                            onClick={() => onInspectMember(m.uid)}
                            title="Inspect member activity"
                          >
                            <span>Inspect</span>
                            <ExternalLink size={10} />
                          </button>
                        )}
                      </div>

                      {m.currentSubject && (
                        <div className="text-[11px] text-[var(--sanctra-sage)] truncate">
                          Focusing: {m.currentSubject}
                        </div>
                      )}

                      {m.statusMessage && (
                        <div className="text-[11px] text-[var(--sanctra-muted)] italic truncate">
                          “{m.statusMessage}”
                        </div>
                      )}
                    </div>
                  );
                })}

                {!members.length && (
                  <p className="text-xs text-[var(--sanctra-muted)] text-center py-6">No member records loaded.</p>
                )}
              </div>
            </div>

            {/* Moderated Group Chat (2/3 width) */}
            <div className="lg:col-span-2 p-4 rounded-2xl bg-[var(--sanctra-surface)] border border-[var(--sanctra-glass-border)] space-y-3 flex flex-col max-h-[600px]">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[var(--sanctra-glass-border)]">
                <div className="flex items-center gap-2">
                  <MessageSquare size={16} className="text-[var(--sanctra-sage)]" />
                  <h4 className="text-sm font-semibold text-[var(--sanctra-paper)]">
                    Live Chat Stream ({filteredChatMessages.length})
                  </h4>
                </div>

                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--sanctra-muted)] pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search messages…"
                    value={chatSearch}
                    onChange={(e) => setChatSearch(e.target.value)}
                    className="inbox-input text-xs py-1 pl-7 pr-3 w-44"
                  />
                </div>
              </div>

              {allMessages.length >= 100 && hasOlder && (
                <button
                  type="button"
                  disabled={loadingOlder}
                  onClick={() => void loadOlder()}
                  className="analytics-button text-xs py-1.5 px-3 self-center"
                >
                  {loadingOlder ? 'Loading earlier messages…' : 'Load earlier messages'}
                </button>
              )}

              <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
                {filteredChatMessages.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl bg-white/[0.02] border border-[var(--sanctra-glass-border)] space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <strong className="text-[var(--sanctra-paper)] font-semibold">{m.senderName}</strong>
                        <span className="text-[10px] text-[var(--sanctra-muted)] font-mono">
                          {new Date(m.timestamp).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>

                      <button
                        type="button"
                        aria-label={`Remove message by ${m.senderName}`}
                        className="analytics-button text-[11px] py-0.5 px-2 text-rose-300 hover:text-rose-200"
                        onClick={async () => {
                          const db = getCloudDatabase();
                          if (db) {
                            try {
                              await deleteDoc(doc(db, 'study_groups', group.id, 'messages', m.id));
                            } catch {
                              setError('Message could not be removed.');
                            }
                          }
                        }}
                      >
                        Remove
                      </button>
                    </div>

                    <p className="text-xs text-[var(--sanctra-paper)] whitespace-pre-wrap break-words">{m.text}</p>
                  </div>
                ))}

                {!filteredChatMessages.length && (
                  <div className="text-center py-12 text-xs text-[var(--sanctra-muted)]">
                    No chat messages in this group.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* GROUPS DIRECTORY LIST */
        <div className="p-4 rounded-2xl bg-[var(--sanctra-surface)] border border-[var(--sanctra-glass-border)] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sanctra-muted)] pointer-events-none" />
              <input
                type="text"
                className="inbox-input pl-9 pr-8 text-xs py-2 w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by group name, room code, or owner name…"
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

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'Active', count: groups.filter((g) => !g.deleted).length },
                { id: 'public', label: 'Public', count: publicCount },
                { id: 'private', label: 'Private', count: privateCount },
                { id: 'deleted', label: 'Deleted Archive', count: deletedCount },
              ].map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setFilter(chip.id as typeof filter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                    filter === chip.id
                      ? 'bg-[var(--sanctra-sage)] text-[var(--sanctra-ink)] font-semibold'
                      : 'bg-white/[0.03] text-[var(--sanctra-muted)] hover:text-[var(--sanctra-paper)] hover:bg-white/[0.06] border border-[var(--sanctra-glass-border)]'
                  }`}
                >
                  <span>{chip.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    filter === chip.id ? 'bg-black/20 text-[var(--sanctra-ink)]' : 'bg-white/5'
                  }`}>
                    {chip.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Group Row Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1">
            {filteredGroups.map((g) => (
              <div
                key={g.id}
                className="p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-[var(--sanctra-glass-border)] transition flex flex-col justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {g.isPublic ? (
                        <Globe size={16} className="text-sky-400 flex-shrink-0" />
                      ) : (
                        <Lock size={16} className="text-amber-400 flex-shrink-0" />
                      )}
                      <strong className="text-sm font-semibold text-[var(--sanctra-paper)] truncate">{g.name}</strong>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        g.deleted
                          ? 'bg-rose-500/20 text-rose-300'
                          : g.isPublic
                          ? 'bg-sky-500/20 text-sky-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {g.deleted ? 'Deleted' : g.isPublic ? 'Public' : 'Private'}
                    </span>
                  </div>

                  {g.description && (
                    <p className="text-xs text-[var(--sanctra-muted)] line-clamp-2">{g.description}</p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[var(--sanctra-glass-border)] text-xs text-[var(--sanctra-muted)]">
                  <div>
                    <span>Owner: {g.createdByName || 'Scholar'} · </span>
                    <span className="font-mono text-[11px] text-[var(--sanctra-paper)] font-semibold">{g.roomCode}</span>
                  </div>

                  <button
                    type="button"
                    className="analytics-button text-xs py-1.5 px-3"
                    onClick={() => setSelected(g.id)}
                  >
                    Inspect Group
                  </button>
                </div>
              </div>
            ))}

            {!filteredGroups.length && (
              <div className="col-span-full p-8 text-center text-sm text-[var(--sanctra-muted)]">
                No study groups found for this selection.
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
