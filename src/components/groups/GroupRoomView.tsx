import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  Users,
  MessageSquare,
  Trophy,
  Flame,
  Send,
  Sparkles,
  Radio,
  Clock,
  CheckCircle2,
  BookOpen,
  Play,
  Share2,
  Copy,
  Check,
  UserPlus,
  ShieldCheck,
  Shield,
  X,
  UserX,
} from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { getCloudDatabase } from '../../utils/firebase.ts';
import type { AuthUser, TimerStatus, TimerMode } from '../../types/index.ts';
import type {
  StudyGroup,
  GroupMember,
  GroupChatMessage,
  MemberStudyStatus,
} from '../../types/groups.ts';
import {
  joinOrUpdateRoomMember,
  subscribeRoomMembers,
  subscribeGroupMessages,
  sendGroupMessage,
  getGroupLeaderboard,
  getRoomInviteLink,
  kickRoomMember,
} from '../../utils/groupsService.ts';
import { formatDurationHuman } from '../../utils/time.ts';

interface GroupRoomViewProps {
  room: StudyGroup;
  currentUser: AuthUser | null;
  timerStatus: TimerStatus;
  activeSubjectName: string;
  todaySeconds: number;
  streakDays: number;
  onLeaveRoom: () => void;
  onSyncTimerMode: (mode: TimerMode) => boolean;
  onNavigateToTimer: () => void;
}

const CHEER_PRESETS = [
  { emoji: '🔥', label: 'In The Zone', text: 'Locked in! Let’s keep going 🔥' },
  { emoji: '👏', label: 'Great Job', text: 'Incredible consistency, keep it up! 👏' },
  { emoji: '☕', label: 'Coffee Break', text: 'Stepping out for a quick 5-minute break ☕' },
  { emoji: '🎯', label: 'Target Hit', text: 'Daily milestone conquered! 🎯' },
  { emoji: '📚', label: 'Deep Focus', text: 'Entering distraction-free sprint 📚' },
];

export const GroupRoomView: React.FC<GroupRoomViewProps> = ({
  room,
  currentUser,
  timerStatus,
  activeSubjectName,
  todaySeconds,
  streakDays,
  onLeaveRoom,
  onSyncTimerMode,
  onNavigateToTimer,
}) => {
  const [activeTab, setActiveTab] = useState<'desks' | 'chat' | 'leaderboard'>('desks');
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [messages, setMessages] = useState<GroupChatMessage[]>([]);
  const [connection, setConnection] = useState<'local' | 'connecting' | 'connected' | 'offline'>('connecting');
  const [chatInput, setChatInput] = useState('');
  const [mentionPicker,setMentionPicker]=useState(false);
  const [mentionMembers,setMentionMembers]=useState<GroupMember[]>([]);
  const [syncedTimerToast, setSyncedTimerToast] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [adminUids, setAdminUids] = useState<Set<string>>(new Set());
  const [kickingMember, setKickingMember] = useState<GroupMember | null>(null);
  const [kickError, setKickError] = useState('');
  const [isKicking, setIsKicking] = useState(false);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const currentUid = currentUser?.uid || '';
  const isOwner = room.createdById === currentUid;
  const isUserAdmin = isOwner || adminUids.has(currentUid);
  const roomCode = room.roomCode || room.id;
  const inviteLink = getRoomInviteLink(room.id);

  const profileUidKey=useMemo(()=>[...new Set([...members.map(m=>m.uid),...messages.map(m=>m.senderUid),currentUser?.uid,room.createdById].filter((uid):uid is string=>!!uid))].sort().join('|'),[members,messages,currentUser?.uid,room.createdById]);
  useEffect(()=>{
    const db=getCloudDatabase();let closed=false;setAdminUids(new Set());
    if(!db||!profileUidKey)return;
    const unsubs=profileUidKey.split('|').map(uid=>onSnapshot(doc(db,'global_profiles',uid),snap=>{
      if(closed)return;const isAdmin=snap.data()?.publicStyle?.admin===true;
      setAdminUids(prev=>{if(prev.has(uid)===isAdmin)return prev;const next=new Set(prev);if(isAdmin)next.add(uid);else next.delete(uid);return next;});
    },()=>{}));
    return()=>{closed=true;unsubs.forEach(off=>off());};
  },[profileUidKey]);

  // Map timer status to member study status
  const memberStatus: MemberStudyStatus =
    timerStatus === 'running'
      ? 'focusing'
      : timerStatus === 'break-running' || timerStatus === 'break-ready'
      ? 'break'
      : 'idle';

  const presenceRef = useRef({ currentUser, memberStatus, activeSubjectName, todaySeconds, streakDays, timerMode: room.timerMode });
  presenceRef.current = { currentUser, memberStatus, activeSubjectName, todaySeconds, streakDays, timerMode: room.timerMode };
  useEffect(() => {
    let cancelled = false;
    let unsubscribe = () => {};
    let reconnect = true;
    const trackConnection = (state: 'local' | 'connecting' | 'connected' | 'offline') => {
      reconnect = state === 'offline';
      if (!cancelled) setConnection(state);
    };
    const update = async () => {
      const p = presenceRef.current;
      await joinOrUpdateRoomMember(room.id, p.currentUser, p.memberStatus, p.activeSubjectName, p.todaySeconds, p.streakDays, p.timerMode, roomCode);
      if (!cancelled && reconnect) {
        unsubscribe();
        reconnect = false;
        unsubscribe = subscribeRoomMembers(room.id, currentUid, setMembers, trackConnection);
      }
    };
    void update().catch(() => { reconnect = true; if (!cancelled) setConnection('offline'); });
    const interval = setInterval(() => { void update().catch(() => { reconnect = true; if (!cancelled) setConnection('offline'); }); }, 20000);
    return () => { cancelled = true; clearInterval(interval); unsubscribe(); };
  }, [room.id, currentUid, roomCode]);
  useEffect(() => {
    void joinOrUpdateRoomMember(room.id, currentUser, memberStatus, activeSubjectName, todaySeconds, streakDays, room.timerMode, roomCode).catch(() => setConnection('offline'));
  }, [room.id, currentUser, memberStatus, activeSubjectName, todaySeconds, streakDays, room.timerMode, roomCode]);
  const [sendError, setSendError] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Join must finish before subscribing to private-room messages.
  useEffect(() => {
    if (connection !== 'connected' && connection !== 'local') return;
    const unsubscribe = subscribeGroupMessages(room.id, (msgs) => {
      setMessages(msgs);
      const marker = chatBottomRef.current;
      if (marker?.parentElement) marker.parentElement.scrollTop = marker.parentElement.scrollHeight;
    });

    return () => {
      unsubscribe();
    };
  }, [room.id, connection]);

  useEffect(() => {
    if (activeTab === 'chat') {
      const scroll = () => {
        const marker = chatBottomRef.current;
        if (marker?.parentElement) marker.parentElement.scrollTop = marker.parentElement.scrollHeight;
      };
      scroll();
      const raf = requestAnimationFrame(scroll);
      const timer = setTimeout(scroll, 60);
      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(timer);
      };
    }
  }, [activeTab]);

  useEffect(() => {
    const parent = chatBottomRef.current?.parentElement;
    if (!parent) return;
    const observer = new ResizeObserver(() => {
      if (parent.clientHeight > 0) parent.scrollTop = parent.scrollHeight;
    });
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isSending) return;

    const text = chatInput.trim();
    setIsSending(true);
    setSendError('');
    try {
      await sendGroupMessage(room.id, currentUser, text, 'chat', undefined, mentionMembers.filter(member=>text.includes('@'+member.displayName)).slice(0,20).map(member=>member.uid));
      setMentionMembers([]);
      setChatInput(prev => prev.trim() === text ? '' : prev);
    } catch (error) { setSendError(error instanceof Error ? error.message : 'Unable to send message.'); }
    finally { setIsSending(false); }
  };

  const handleSendCheer = async (cheer: typeof CHEER_PRESETS[0]) => {
    try { await sendGroupMessage(room.id, currentUser, cheer.text, 'cheer', cheer.emoji); } catch { setSendError('Unable to send encouragement. Please try again.'); }
  };

  const handleSyncTimer = () => {
    if (!onSyncTimerMode(room.timerMode)) return;
    setSyncedTimerToast(true);
    setTimeout(() => setSyncedTimerToast(false), 3000);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      console.warn('Copy link notice:', err);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch (err) {
      console.warn('Copy code notice:', err);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Sanctra Study Room: ${room.name}`,
          text: `Join my live study room "${room.name}" on Sanctra! Room Code: ${roomCode}`,
          url: inviteLink,
        });
        return;
      } catch (e) {
        // Fallback to modal
      }
    }
    setIsShareModalOpen(true);
  };

  const onlineMembers = members.filter(member => member.status !== 'offline');
  const leaderboardEntries = getGroupLeaderboard(room.id, members);

  return (
    <div className="group-room w-full max-w-6xl mx-auto py-4 sm:py-6 px-3 sm:px-6 flex flex-col space-y-5 animate-fade-in text-slate-100">
      {/* 1. Room Stage Header */}
      <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={onLeaveRoom}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>All Rooms</span>
              </button>

              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${room.badgeColor}`}
              >
                {room.category}
              </span>

              {/* Room Code Badge */}
              <div
                onClick={handleCopyCode}
                title="Click to copy Room Code"
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 border border-white/15 text-[10px] font-mono font-bold text-amber-300 hover:border-amber-400/50 cursor-pointer transition-colors"
              >
                <span>Code: {roomCode}</span>
                {copiedCode ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3 opacity-60" />
                )}
              </div>

              <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{connection === 'local' ? 'Local preview' : connection === 'offline' ? 'Connection unavailable' : connection === 'connecting' ? 'Connecting…' : `${onlineMembers.length} online`}</span>
              </div>
            </div>

            <div>
              <h1 className="font-display text-2xl sm:text-3xl text-white flex items-center gap-2">
                <span>{room.name}</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                {room.description}
              </p>
              {room.topic && (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-300 font-medium mt-1">
                  <BookOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Current Focus Topic: {room.topic}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions (Share & Sync Timer) */}
          <div className="flex flex-col sm:items-end gap-2 shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleNativeShare}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/15 transition-all cursor-pointer shadow-sm"
                title="Invite real peers to this study room"
              >
                <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Invite Friends</span>
              </button>

              <button
                onClick={handleSyncTimer}
                className="btn-sheen flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 cursor-pointer hover:brightness-110 transition-all"
              >
                <Clock className="w-4 h-4" />
                <span>Sync Timer ({room.timerMode})</span>
              </button>

              <button
                onClick={onNavigateToTimer}
                className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/15 transition-all cursor-pointer flex items-center"
                title="Go to main timer dial"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
              </button>
            </div>

            {syncedTimerToast && (
              <span className="text-[11px] text-emerald-300 font-semibold flex items-center gap-1 animate-fade-in">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Timer synced with room mode!</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Interactive Navigation Tabs */}
      <div className="flex xl:hidden items-center gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('desks')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'desks'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Members ({onlineMembers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer relative ${
            activeTab === 'chat'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Chat ({messages.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'leaderboard'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Rankings</span>
        </button>
      </div>

      {/* 3. Tab Content */}
      <div className="group-panels">
      <div className="group-left space-y-5">

      {/* TAB 1: LIVE DESKS */}
        <div className={`group-desks space-y-4 animate-fade-in ${activeTab === 'desks' ? '' : 'hidden xl:block'}`}>
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Room members</span>
            <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 font-mono">
              <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
              {connection === 'local' ? 'Local preview' : connection === 'connected' ? 'Connected' : 'Waiting for connection'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-3.5">
            {onlineMembers.map((member) => {
              const isFocusing = member.status === 'focusing';
              const isBreak = member.status === 'break';

              return (
                <div
                  key={member.uid}
                  className={`p-4 rounded-2xl glass-card border transition-all flex flex-col justify-between ${
                    member.isCurrentUser
                      ? 'border-emerald-500/40 bg-emerald-500/[0.04] ring-1 ring-emerald-500/20 shadow-lg shadow-emerald-500/5'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={member.avatarUrl}
                          alt={member.displayName}
                          className="w-10 h-10 rounded-xl object-cover border border-white/20 bg-slate-900"
                        />
                        <span
                          className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-950 ${
                            isFocusing
                              ? 'bg-emerald-400 animate-pulse'
                              : isBreak
                              ? 'bg-teal-400'
                              : 'bg-slate-500'
                          }`}
                        />
                      </div>

                      <div className="overflow-hidden">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-white truncate">
                            {member.displayName}
                          </span>
                          {(adminUids.has(member.uid) || member.isAdmin) && (
                            <span className="admin-badge text-[10px] py-0.5 px-2 inline-flex items-center gap-1">
                              <Shield size={10} />
                              Admin
                            </span>
                          )}
                          {member.isCurrentUser && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                              YOU
                            </span>
                          )}
                          {(isOwner || isUserAdmin) && !member.isCurrentUser && member.uid !== room.createdById && (isOwner || !adminUids.has(member.uid)) && (
                            <button
                              type="button"
                              className="text-[10px] font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer bg-rose-500/10 hover:bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/20 transition-colors"
                              onClick={() => setKickingMember(member)}
                              title={`Kick ${member.displayName}`}
                            >
                              <UserX className="w-2.5 h-2.5" />
                              <span>Kick</span>
                            </button>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {member.currentSubject}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                        isFocusing
                          ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                          : isBreak
                          ? 'bg-teal-500/15 border border-teal-500/30 text-teal-300'
                          : 'bg-slate-700/40 border border-slate-600 text-slate-400'
                      }`}
                    >
                      {isFocusing ? 'Focusing ●' : isBreak ? 'Break ☕' : 'Idle 💤'}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                    <div className="text-slate-400">
                      Today:{' '}
                      <span className="font-semibold text-slate-200 tabular-nums">
                        {formatDurationHuman(member.todaySeconds)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-amber-400 font-semibold text-[11px]">
                      <Flame className="w-3 h-3 fill-current" />
                      <span>{member.streakDays}d streak</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Empty Desk Invite Card if alone or small room */}
            {members.length <= 1 && (
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-dashed border-white/15 flex flex-col justify-between text-center space-y-3">
                <div className="space-y-1 py-2">
                  <div className="w-10 h-10 mx-auto rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
                    <UserPlus className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h4 className="text-xs font-bold text-white pt-1">Quiet Hall Desk</h4>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    No other scholars at desks right now. Invite your study circle to join!
                  </p>
                </div>

                <button
                  onClick={() => setIsShareModalOpen(true)}
                  className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/15 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Share Room Invite</span>
                </button>
              </div>
            )}
          </div>
        </div>


      {/* TAB 3: ROOM LEADERBOARD */}
        <div className={`group-rankings space-y-4 animate-fade-in ${activeTab === 'leaderboard' ? '' : 'hidden xl:block'}`}>
          <div className="glass-panel p-5 rounded-3xl border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>Today's focus</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ranked by actual focused hours logged today by scholars in this hall
                </p>
              </div>

              <span className="text-[11px] text-slate-400 px-3 py-1 rounded-xl bg-white/5 border border-white/10">
                Today’s recorded time
              </span>
            </div>

            {leaderboardEntries.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No session times logged yet in this room today.
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {leaderboardEntries.map((entry) => {
                  const isFirst = entry.rank === 1;
                  const isSecond = entry.rank === 2;
                  const isThird = entry.rank === 3;

                  return (
                    <div
                      key={entry.uid}
                      className={`py-3.5 px-3 flex items-center justify-between rounded-xl transition-all ${
                        entry.isCurrentUser
                          ? 'bg-emerald-500/10 border border-emerald-500/30'
                          : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 text-center font-bold text-sm">
                          <span className={isFirst || isSecond || isThird ? 'text-emerald-200 tabular-nums' : 'text-slate-400 tabular-nums'}>#{entry.rank}</span>
                        </div>

                        <img
                          src={entry.avatarUrl}
                          alt={entry.displayName}
                          className="w-9 h-9 rounded-xl object-cover border border-white/20 bg-slate-900"
                        />

                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-white">{entry.displayName}</span>
                            {(adminUids.has(entry.uid) || entry.isAdmin) && (
                              <span className="admin-badge text-[10px] py-0.5 px-2 inline-flex items-center gap-1">
                                <Shield size={10} />
                                Admin
                              </span>
                            )}
                            {entry.isCurrentUser && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                                YOU
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Studying: {entry.currentSubject}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-5 text-right">
                        <div className="flex items-center gap-1 text-xs text-amber-400 font-semibold">
                          <Flame className="w-3.5 h-3.5 fill-current" />
                          <span>{entry.streakDays}d</span>
                        </div>

                        <div className="w-20">
                          <div className="text-sm font-bold text-emerald-300 tabular-nums">
                            {formatDurationHuman(entry.todaySeconds)}
                          </div>
                          <span className="text-[9px] uppercase tracking-wider text-slate-400">
                            Focused
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* TAB 2: LIVE CHAT */}
        <div className={`group-chat glass-panel rounded-3xl border border-white/10 p-4 sm:p-5 flex-col h-[520px] animate-fade-in ${activeTab === 'chat' ? 'flex' : 'hidden xl:flex'}`}>
          <div className="flex items-center justify-between gap-3 mb-3"><h2 className="font-semibold text-lg">Group chat</h2><span className="text-xs text-slate-300">{onlineMembers.length} online</span></div>
          {/* Quick Cheer Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-2 border-b border-white/10 shrink-0">
            <span className="text-[11px] text-slate-400 mr-1 flex items-center gap-1 shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Quick Cheer:</span>
            </span>
            {CHEER_PRESETS.map((cheer, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendCheer(cheer)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 hover:bg-emerald-500/20 text-slate-200 hover:text-emerald-300 text-xs font-medium border border-white/10 transition-all cursor-pointer shrink-0"
              >
                <span>{cheer.emoji}</span>
                <span className="text-[11px]">{cheer.label}</span>
              </button>
            ))}
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-600" />
                <p className="text-xs text-slate-400">
                  A quiet room. Say hello or share what you’re working on.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderUid === currentUid;
                const isSystem = msg.type === 'system';
                const isCheer = msg.type === 'cheer';

                if (isSystem) {
                  return (
                    <div key={msg.id} className="text-center my-2">
                      <span className="inline-block text-[11px] px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400">
                        {msg.text}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <img
                      src={msg.senderAvatar}
                      alt={msg.senderName}
                      className="w-7 h-7 rounded-lg object-cover border border-white/20 shrink-0 mt-0.5 bg-slate-900"
                    />

                    <div
                      className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs ${
                        isMe
                          ? 'bg-emerald-500 text-slate-950 font-medium rounded-tr-sm'
                          : isCheer
                          ? 'bg-amber-400/15 border border-amber-400/30 text-amber-200 rounded-tl-sm'
                          : 'bg-white/10 text-slate-200 rounded-tl-sm border border-white/10'
                      }`}
                    >
                      {!isMe && (
                        <div className="text-[10px] font-bold text-slate-400 mb-0.5 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{msg.senderName}</span>
                            {(adminUids.has(msg.senderUid) || msg.senderIsAdmin) && (
                              <span className="admin-badge text-[9px] py-0 px-1.5 inline-flex items-center gap-0.5">
                                <Shield size={9} />
                                Admin
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] opacity-70">
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      )}

                      <div className="break-words leading-relaxed">{msg.text}</div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatBottomRef} />
          </div>

          {sendError && <p role="alert" className="text-xs text-amber-200 py-2">{sendError}</p>}
          <div className="relative"><button className="analytics-button text-xs" onClick={()=>setMentionPicker(!mentionPicker)} aria-expanded={mentionPicker}>@ Mention a member</button>{mentionPicker&&<div className="analytics-card p-2 absolute bottom-full mb-2 left-0 right-0 max-h-48 overflow-y-auto z-20">{members.filter(member=>member.uid!==currentUid&&member.joined!==false).length?members.filter(member=>member.uid!==currentUid&&member.joined!==false).map(member=><button key={member.uid} className="block text-left p-2 w-full hover:bg-white/5 rounded-lg" onClick={()=>{setChatInput(value=>`${value} @${member.displayName} `);setMentionMembers(value=>[...value.filter(m=>m.uid!==member.uid),member]);setMentionPicker(false);}}>{member.displayName}</button>):<p className="text-xs p-2 text-slate-300">No other members to mention yet.</p>}</div>}</div>
          {/* Chat Composer */}
          <form
            onSubmit={handleSendMessage}
            className="pt-3 mt-2 border-t border-white/10 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              aria-label="Message to group"
              placeholder="Write a message…"
              maxLength={200}
              className="flex-1 px-4 py-2.5 rounded-2xl bg-black/40 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
            />

            <button
              type="submit"
              disabled={!chatInput.trim() || isSending}
              className="btn-sheen px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 disabled:opacity-40 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 cursor-pointer flex items-center gap-1.5 transition-all"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>


      </div>

      {/* 4. Share & Invite Friends Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-white/15 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 text-slate-100 relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Invite Peers to Desk</h3>
                  <p className="text-[11px] text-slate-400">Share your live study room with friends</p>
                </div>
              </div>

              <button
                onClick={() => setIsShareModalOpen(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Direct Link Section */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Direct Invite Link
              </label>
              <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-950 border border-white/15">
                <input
                  type="text"
                  readOnly
                  value={inviteLink}
                  className="flex-1 bg-transparent px-2.5 text-xs text-slate-200 select-all focus:outline-none"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Room Code Section */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Room Code (for Sanctra App)
              </label>
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-white/15">
                <span className="font-mono text-base font-extrabold tracking-wider text-amber-300">
                  {roomCode}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white font-semibold text-xs flex items-center gap-1 cursor-pointer transition-all"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 text-[11px] text-slate-300 space-y-1">
              <p className="font-semibold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>How to Join:</span>
              </p>
              <p>
                Friends who open the link will automatically enter this study hall with their own desk, live timer status, and presence.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 5. Kick Member Confirmation Dialog */}
      {kickingMember && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isKicking) setKickingMember(null);
          }}
        >
          <div className="glass-panel p-6 rounded-3xl border border-white/10 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="font-bold text-lg text-white">Kick {kickingMember.displayName}?</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              This will remove them from the study room. They can rejoin if they have the room code or link.
            </p>
            {kickError && <p className="text-xs text-rose-400">{kickError}</p>}
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
                disabled={isKicking}
                onClick={() => setKickingMember(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                disabled={isKicking}
                onClick={async () => {
                  setIsKicking(true);
                  setKickError('');
                  try {
                    await kickRoomMember(room.id, kickingMember.uid);
                    setKickingMember(null);
                  } catch (err) {
                    setKickError(err instanceof Error ? err.message : 'Failed to kick member.');
                  } finally {
                    setIsKicking(false);
                  }
                }}
              >
                {isKicking ? 'Kicking…' : 'Kick member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
