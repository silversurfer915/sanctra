import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Plus,
  Play,
  ShieldCheck,
  Globe,
  Radio,
  Clock,
  BookOpen,
  Share2,
  Check,
  KeyRound,
  Search,
  Star,
  LogOut,
} from 'lucide-react';
import type { AuthUser, TimerStatus, TimerMode } from '../../types/index.ts';
import type { StudyGroup } from '../../types/groups.ts';
import {
  getAllStudyGroups,
  subscribeAllStudyGroups,
  getStudyGroupById,
  getRoomInviteLink,
  joinOrUpdateRoomMember,
  leaveRoomMember,
  exitGroupMembership,
  resumeGroupMembership,
} from '../../utils/groupsService.ts';
import { loadCommunity,saveCommunity,readLocalCommunity,joinCommunity,leaveCommunity,sortCommunityRooms, type CommunityPreferences } from '../../utils/community.ts';
import { isRoomVisible } from '../../utils/roomAccess.ts';
import { GroupRoomView } from '../groups/GroupRoomView.tsx';
import { CreateRoomModal } from '../modals/CreateRoomModal.tsx';

interface GroupsViewProps {
  currentUser: AuthUser | null;
  timerStatus: TimerStatus;
  activeSubjectName: string;
  todaySeconds: number;
  streakDays: number;
  initialRoomId?: string | null;
  navigationRequest?:number;
  onSyncTimerMode: (mode: TimerMode) => boolean;
  onNavigateToTimer: () => void;
  onOpenAuth: () => void;
}

export const GroupsView: React.FC<GroupsViewProps> = ({
  currentUser,
  timerStatus,
  activeSubjectName,
  todaySeconds,
  streakDays,
  initialRoomId,
  navigationRequest,
  onSyncTimerMode,
  onNavigateToTimer,
  onOpenAuth: _onOpenAuth,
}) => {
  const [activeTab, setActiveTab] = useState<'public' | 'my-rooms'>('public');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeRoomId, setActiveRoomId] = useState<string | null>(initialRoomId || null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [rooms, setRooms] = useState<StudyGroup[]>(() => getAllStudyGroups());
  const [codeOrUrlInput, setCodeOrUrlInput] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [copiedRoomId, setCopiedRoomId] = useState<string | null>(null);

  const uid=currentUser?.uid || '';
  const [community,setCommunity]=useState<CommunityPreferences>(()=>readLocalCommunity(uid));
  const [membershipReady,setMembershipReady]=useState(false);
  const [membershipBusy,setMembershipBusy]=useState(false);
  const [switcherOpen,setSwitcherOpen]=useState(false);
  const joinedIds=community.joinedIds;
  const joinedRef=useRef(joinedIds);joinedRef.current=joinedIds;
  useEffect(()=>()=>{for(const id of joinedRef.current)void leaveRoomMember(id,uid);},[uid]);
  useEffect(()=>{const refresh=()=>setCommunity(readLocalCommunity(uid));window.addEventListener('sanctra-community',refresh);return()=>window.removeEventListener('sanctra-community',refresh);},[uid]);
  useEffect(()=>{let cancelled=false; loadCommunity(uid).then(value=>{if(!cancelled){setCommunity(value);setMembershipReady(true);}}).catch(()=>setJoinError('Your memberships could not be loaded. Refresh to retry.'));return()=>{cancelled=true;};},[uid]);
  const commitMembership=async(next:CommunityPreferences)=>{await saveCommunity(uid,next);setCommunity(next);};
  const enterRoom=async(room:StudyGroup)=>{
    if(!membershipReady || membershipBusy)return;
    if(!joinedIds.includes(room.id)&&joinedIds.length>=100){setJoinError('You have reached the 100-group limit. Leave a group before joining another.');return;}
    setMembershipBusy(true);setJoinError(null);
    try {
      if(!joinedIds.includes(room.id)){
        resumeGroupMembership(room.id,uid);
        await joinOrUpdateRoomMember(room.id,currentUser,'idle',activeSubjectName,todaySeconds,streakDays,room.timerMode,room.roomCode);
        await commitMembership(joinCommunity(community,room.id));
      }
      setRooms(prev=>[...prev.filter(r=>r.id!==room.id),room]);setActiveRoomId(room.id);setSwitcherOpen(false);
    } catch {setJoinError('Could not join this group. Check your connection and try again.');}
    finally {setMembershipBusy(false);}
  };
  const leaveGroup=async(room:StudyGroup)=>{
    if(membershipBusy)return;setMembershipBusy(true);
    try {
      await exitGroupMembership(room.id,uid);
      await commitMembership(leaveCommunity(community,room.id));
      if(activeRoomId===room.id)setActiveRoomId(null);
    }catch {setJoinError('Could not leave this group. Please retry.');}finally{setMembershipBusy(false);}
  };
  // Membership outlives the open chat. All joined groups receive current focus presence.
  useEffect(()=>{
    if(!membershipReady)return;
    const update=()=>{for(const id of joinedIds){const room=rooms.find(r=>r.id===id);if(room)void joinOrUpdateRoomMember(id,currentUser,timerStatus==='running'?'focusing':timerStatus.startsWith('break-')?'break':'idle',activeSubjectName,todaySeconds,streakDays,room.timerMode,room.roomCode).catch(()=>{});}};
    update();const interval=setInterval(update,20000);
    return()=>{clearInterval(interval);};
  },[joinedIds.join(','),membershipReady,currentUser,timerStatus,activeSubjectName,todaySeconds,streakDays,rooms]);

  // Subscribe to real-time rooms updates from Firestore
  useEffect(() => {
    const unsubscribe = subscribeAllStudyGroups((updatedRooms) => {
      setRooms(prev => [...updatedRooms, ...prev.filter(room => !updatedRooms.some(r => r.id === room.id))]);
    }, currentUser?.uid);
    return () => {
      unsubscribe();
    };
  }, [currentUser?.uid]);

  useEffect(() => {
    let cancelled = false;
    Promise.all(joinedIds.map(id => getStudyGroupById(id))).then(found => {
      if (!cancelled) setRooms(prev => [...prev, ...found.filter((room): room is StudyGroup => Boolean(room) && !prev.some(r => r.id === room?.id))]);
    }).catch(()=>{if(!cancelled)setJoinError('Some joined groups could not be loaded. Refresh to retry.');});
    return () => { cancelled = true; };
  }, [joinedIds]);

  // Handle incoming initialRoomId
  useEffect(() => {
    if (initialRoomId) {
      // Find room or fetch it
      getStudyGroupById(initialRoomId).then((r) => {
        if (r) {
          void enterRoom(r);
        } else setJoinError('This invitation could not be found. Check the link.');
      }).catch(()=>setJoinError('Could not load this invitation. Check your connection.'));
    }
  }, [initialRoomId,membershipReady,navigationRequest]);

  const activeRoom = rooms.find((r) => r.id === activeRoomId);

  const yourRooms=sortCommunityRooms(rooms.filter(r=>joinedIds.includes(r.id)),community.primaryId);
  // Switching chats does not leave any membership.
  if(activeRoom && joinedIds.includes(activeRoom.id))return <div className="w-full max-w-6xl mx-auto">
    <div className="group-switcher-bar flex flex-wrap items-center gap-2 mb-4 relative">
      <button className="analytics-button" aria-expanded={switcherOpen} onClick={()=>setSwitcherOpen(!switcherOpen)}><Users size={16}/>{activeRoom.name}<span aria-hidden="true">⌄</span></button>
      <button className="analytics-button" onClick={()=>{setActiveRoomId(null);setActiveTab('my-rooms');}}>Browse groups</button>
      <button className="analytics-icon" aria-label={community.primaryId===activeRoom.id?'Primary group':'Make primary group'} aria-pressed={community.primaryId===activeRoom.id} onClick={()=>{void commitMembership({...community,primaryId:activeRoom.id}).catch(()=>setJoinError('Could not save primary group.'));}}><Star size={18} fill={community.primaryId===activeRoom.id?'currentColor':'none'}/></button>
      <button className="analytics-button ml-auto" disabled={membershipBusy} onClick={()=>void leaveGroup(activeRoom)}><LogOut size={15}/>Leave group</button>
      {switcherOpen && <div className="group-switcher-menu analytics-card absolute top-full left-0 mt-2 p-2 w-full sm:w-80 z-40" role="region" aria-label="Your groups">{yourRooms.map(room=><button key={room.id} className="w-full flex items-center gap-3 text-left p-3 rounded-xl hover:bg-white/5" onClick={()=>{setActiveRoomId(room.id);setSwitcherOpen(false);}}><span className="flex-1">{room.name}</span>{community.primaryId===room.id&&<Star size={14}/>} {activeRoomId===room.id&&<Check size={15}/>}</button>)}<button className="analytics-button w-full mt-2" onClick={()=>{setActiveRoomId(null);setSwitcherOpen(false);}}>Create / join group</button></div>}
    </div>
    {joinError&&<p role="alert" className="text-rose-300 text-sm mb-3">{joinError}</p>}
    <GroupRoomView key={activeRoom.id} room={activeRoom} currentUser={currentUser} timerStatus={timerStatus} activeSubjectName={activeSubjectName} todaySeconds={todaySeconds} streakDays={streakDays} onLeaveRoom={()=>setActiveRoomId(null)} onSyncTimerMode={onSyncTimerMode} onNavigateToTimer={onNavigateToTimer}/>
  </div>;

  // Filter rooms based on tab and category
  const filteredRooms = sortCommunityRooms(rooms.filter((room) => {
    if (!isRoomVisible(room, activeTab, currentUser?.uid, joinedIds)) return false;

    if (selectedCategory !== 'all') {
      return room.category.toLowerCase().includes(selectedCategory.toLowerCase());
    }

    return true;
  }),community.primaryId);

  const categories = [
    { id: 'all', label: 'All Fields' },
    { id: 'engineering', label: 'Engineering / STEM' },
    { id: 'medical', label: 'Medical & Bio' },
    { id: 'civil', label: 'Civil Services' },
    { id: 'standardized', label: 'Standardized Tests' },
    { id: 'deep work', label: 'Deep Work' },
  ];

  const handleRoomCreated = (newRoom: StudyGroup) => {
    setRooms(getAllStudyGroups());
    void enterRoom(newRoom);
  };

  const handleJoinByCodeOrUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    const raw = codeOrUrlInput.trim();
    if (!raw) return;

    let targetCode = raw;
    // Accept a full invite URL as well as a short room code.
    try {
      if (raw.includes('?') && (raw.includes('room=') || raw.includes('code='))) {
        const url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
        const param = url.searchParams.get('room') || url.searchParams.get('code');
        if (param) targetCode = param;
      }
    } catch (e) {
      // not a full url, treat as code
    }

    let found:StudyGroup|undefined;
    try {found = await getStudyGroupById(targetCode);}catch{setJoinError('Could not look up this group. Check your connection.');return;}
    if (found) {
      setCodeOrUrlInput('');
      await enterRoom(found);
    } else {
      setJoinError(`No study room found matching "${raw}". Please check the code or link.`);
    }
  };

  const handleCopyInviteLink = async (room: StudyGroup) => {
    try {
      const link = getRoomInviteLink(room.id);
      await navigator.clipboard.writeText(link);
      setCopiedRoomId(room.id);
      setTimeout(() => setCopiedRoomId(null), 2500);
    } catch (err) {
      console.warn('Copy link error:', err);
    }
  };

  return (
    <div className="groups-directory w-full max-w-5xl mx-auto py-6 sm:py-8 px-3 sm:px-6 flex flex-col space-y-6 animate-fade-in text-slate-100">
      {/* 1. View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-white/10 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-emerald-300/90 mb-1.5 font-medium">
            <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
            <span>A little company for your focus</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl text-white">
            Study rooms
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Find a quiet room, bring your friends, and study together.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-sheen flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 cursor-pointer hover:brightness-110 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Study Room</span>
          </button>
        </div>
      </div>

      {/* 2. Join with Code or Invite Link Card */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white">Join with Room Code or Link</h3>
            <p className="text-[11px] text-slate-400">
              Have a code from a peer (e.g. SANCTRA-STEM) or an invite URL?
            </p>
          </div>
        </div>

        <form
          onSubmit={handleJoinByCodeOrUrl}
          className="flex items-center gap-2 w-full sm:w-auto min-w-0"
        >
          <div className="relative flex-1 min-w-0 sm:w-56">
            <input
              type="text"
              aria-label="Group code or invitation link"
              placeholder="e.g. SANCTRA-STEM or URL"
              value={codeOrUrlInput}
              onChange={(e) => {
                setCodeOrUrlInput(e.target.value);
                if (joinError) setJoinError(null);
              }}
              className="w-full pl-3 pr-8 py-2 rounded-xl bg-slate-950/80 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 uppercase tracking-wider font-mono"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            type="submit"
            disabled={!codeOrUrlInput.trim()}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold text-xs cursor-pointer transition-all shadow-md shadow-emerald-500/20 shrink-0"
          >
            Join group
          </button>
        </form>
      </div>

      {joinError && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 animate-fade-in">
          {joinError}
        </div>
      )}

      {/* 3. Tabs & Category Filters */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('public')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'public'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Discover groups</span>
            </button>

            <button
              onClick={() => setActiveTab('my-rooms')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'my-rooms'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Your groups</span>
            </button>
          </div>

          <span className="text-[11px] text-slate-400 hidden sm:inline">
            {filteredRooms.length} available {filteredRooms.length === 1 ? 'room' : 'rooms'}
          </span>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-white/20 text-white border border-white/30'
                  : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 border border-white/5'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Rooms Grid */}
      {filteredRooms.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-3xl border border-white/10 space-y-3">
          <Users className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-white">No rooms here yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            You haven't created any custom study circles yet. Launch your own room to study with friends or classmates.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-sheen inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create your room</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRooms.map((room) => {
            const isCopied = copiedRoomId === room.id;
            return (
              <div
                key={room.id}
                className="glass-specular p-5 rounded-3xl border border-white/10 hover:border-emerald-400/40 transition-all flex flex-col justify-between group relative overflow-hidden space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${room.badgeColor}`}
                    >
                      {room.category}
                    </span>

                    <div className="flex items-center gap-2">
                      {room.roomCode && (
                        <span className="font-mono text-[10px] font-bold text-[var(--sanctra-sage)] px-2 py-0.5 rounded-md bg-slate-900 border border-white/10">
                          {room.roomCode}
                        </span>
                      )}
                      <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>{joinedIds.includes(room.id) ? (community.primaryId===room.id ? 'Primary group' : 'Joined') : 'Open study group'}</span>
                      </div>
                    </div>
                  </div>

                  <h3 className="font-display text-lg text-white mb-1.5 group-hover:text-emerald-300 transition-colors">
                    {room.name}
                  </h3>
                  <p className="text-xs text-slate-300/80 leading-relaxed mb-3">
                    {room.description}
                  </p>

                  {room.topic && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-300 font-medium">
                      <BookOpen className="w-3 h-3 text-[var(--sanctra-sage)] shrink-0" />
                      <span className="truncate">Topic: {room.topic}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-[var(--sanctra-sage)]" />
                      <span className="capitalize">{room.timerMode.replace('-', ' ')}</span>
                    </div>

                    <button
                      onClick={() => handleCopyInviteLink(room)}
                      title="Copy Shareable Invite Link"
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-medium"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 font-semibold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3 h-3" />
                          <span>Invite</span>
                        </>
                      )}
                    </button>
                  </div>

                  <button
                    disabled={!membershipReady || membershipBusy}
                  onClick={() => void enterRoom(room)}
                    className="btn-sheen flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 hover:bg-emerald-500 hover:text-slate-950 text-white font-semibold text-xs border border-white/15 transition-all cursor-pointer"
                  >
                    <span>{joinedIds.includes(room.id) ? 'Open group' : 'Join group'}</span>
                    <Play className="w-3 h-3 fill-current ml-0.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Mutual Accountability Banner */}
      <div className="p-4 rounded-2xl glass-card border border-white/10 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Bring a friend, share your focus, and keep each other company.
          </span>
        </div>
      </div>

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={isCreateModalOpen}
        currentUser={currentUser}
        onCreated={handleRoomCreated}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
};
