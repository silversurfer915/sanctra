import {validImageAttachment,type ImageAttachment} from './imageAttachments.ts';
import { appendRoomMessage } from './roomMessages.ts';
import { normalizePresence } from './presence.ts';
import { getLocalDateString } from './time.ts';
import { createChannel } from './channel.ts';
import { getCloudDatabase } from './firebase.ts';
import { validateMessageRate } from './groupQuotas.ts';
import { chatDay, nextChatUsage } from './chatAllowance.ts';
import { commitGroupMessage } from './groupMessageWrite.ts';
import { isEntitlementActive } from './subscriptionPlans.ts';
import type { UserSubscription } from '../types/subscription.ts';
import {
  collection,
  doc,
  setDoc,
  writeBatch,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  limit,
  where,
} from 'firebase/firestore';
import type {
  StudyGroup,
  GroupMember,
  GroupChatMessage,
  GroupLeaderboardEntry,
  MemberStudyStatus,
} from '../types/groups.ts';
import type { AuthUser, TimerMode } from '../types/index.ts';

const STORAGE_KEYS = {
  CUSTOM_ROOMS: 'sanctra_custom_rooms_v1',
  ROOM_MESSAGES_PREFIX: 'sanctra_room_msgs_',
  LAST_ROOM_ID: 'sanctra_last_room_id_v1',
};

// Official Sanctra Study Halls
export const OFFICIAL_STUDY_GROUPS: StudyGroup[] = [
  {
    id: 'room-jee',
    name: 'STEM problem lab',
    description: 'Quiet sprints for calculus, mechanics, chemistry and technical problem solving.',
    category: 'Engineering / STEM',
    activeCount: 0,
    timerMode: 'pomodoro-50',
    badgeColor: 'border-[var(--sanctra-sage)]/40 text-[var(--sanctra-sage)] bg-[var(--sanctra-sage)]/10',
    isPublic: true,
    createdById: 'sanctra-official',
    createdByName: 'Sanctra Official',
    createdAt: 1700000000000,
    topic: 'Mathematics and physics problem sprint',
    roomCode: 'SANCTRA-STEM',
  },
  {
    id: 'room-neet',
    name: 'Biology study room',
    description: 'Biology active recall, careful reading and organic chemistry practice.',
    category: 'Medical / Biology',
    activeCount: 0,
    timerMode: 'pomodoro-50',
    badgeColor: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10',
    isPublic: true,
    createdById: 'sanctra-official',
    createdByName: 'Sanctra Official',
    createdAt: 1700000000000,
    topic: 'Human physiology and biology',
    roomCode: 'SANCTRA-BIO',
  },
  {
    id: 'room-upsc',
    name: 'Writing and research',
    description: 'Long-form writing, source review, editorial synthesis and research focus.',
    category: 'Writing & Research',
    activeCount: 0,
    timerMode: 'countup',
    badgeColor: 'border-purple-500/40 text-purple-300 bg-purple-500/10',
    isPublic: true,
    createdById: 'sanctra-official',
    createdByName: 'Sanctra Official',
    createdAt: 1700000000000,
    topic: 'Deep reading and structured writing',
    roomCode: 'SANCTRA-WRITE',
  },
  {
    id: 'room-sat',
    name: 'Math and reading',
    description: 'Collaborative math practice, critical reading and vocabulary building.',
    category: 'Languages & Reading',
    activeCount: 0,
    timerMode: 'pomodoro-25',
    badgeColor: 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10',
    isPublic: true,
    createdById: 'sanctra-official',
    createdByName: 'Sanctra Official',
    createdAt: 1700000000000,
    topic: 'Math practice and critical reading',
    roomCode: 'SANCTRA-READ',
  },
  {
    id: 'room-deepwork',
    name: 'Quiet focus',
    description: 'Zero audio clutter, ambient flow state, coding, deep writing, thesis research & self-mastery.',
    category: 'Deep Work / Flow',
    activeCount: 0,
    timerMode: 'countup',
    badgeColor: 'border-indigo-500/40 text-indigo-300 bg-indigo-500/10',
    isPublic: true,
    createdById: 'sanctra-official',
    createdByName: 'Sanctra Official',
    createdAt: 1700000000000,
    topic: 'Late Night Distraction-Free Flow',
    roomCode: 'SANCTRA-DEEP',
  },
  {
    id: 'room-ap',
    name: 'School and university study',
    description: 'A welcoming room for coursework, assignments and subject revision.',
    category: 'School & University',
    activeCount: 0,
    timerMode: 'pomodoro-50',
    badgeColor: 'border-rose-500/40 text-rose-300 bg-rose-500/10',
    isPublic: true,
    createdById: 'sanctra-official',
    createdByName: 'Sanctra Official',
    createdAt: 1700000000000,
    topic: 'Coursework and subject review',
    roomCode: 'SANCTRA-COURSE',
  },
];

// In-memory cache
let cachedRemoteRooms: StudyGroup[] = [];
const memberChannel = createChannel<GroupMember[]>();
const messageChannel = createChannel<GroupChatMessage[]>();
const revokedMemberships = new Set<string>();
const pendingMemberWrites = new Map<string,Set<Promise<void>>>();
export function resumeGroupMembership(roomId:string,uid:string):void {revokedMemberships.delete(`${roomId}:${uid}`);}
const inMemoryMembers: Record<string, GroupMember[]> = {};
const inMemoryMessages: Record<string, GroupChatMessage[]> = {};

// Generate shareable invite URL
export function getRoomInviteLink(roomIdOrCode: string): string {
  const base =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://sanctrastudy.live';
  return `${base}/?room=${encodeURIComponent(roomIdOrCode)}`;
}

// Generate a random clean room code for custom rooms (e.g. SANCT-7R2D)
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return `SANCT-${Array.from(crypto.getRandomValues(new Uint8Array(20)), value => chars[value % chars.length]).join('')}`;
}

// Get all study groups (combining official presets, local custom rooms, and cached remote rooms)
export function getAllStudyGroups(): StudyGroup[] {
  const customLocal = getAllCustomStudyRooms();
  const map = new Map<string, StudyGroup>();

  // 1. Add official groups
  for (const g of OFFICIAL_STUDY_GROUPS) {
    map.set(g.id, g);
  }

  // 2. Add local custom groups
  for (const g of customLocal) {
    map.set(g.id, g);
  }

  // 3. Add remote groups
  for (const g of cachedRemoteRooms) {
    map.set(g.id, g);
  }

  return Array.from(map.values());
}

// Get a single group by ID or Room Code
export async function getStudyGroupById(groupIdOrCode: string): Promise<StudyGroup | undefined> {
  const trimmed = groupIdOrCode.trim();
  const upper = trimmed.toUpperCase();

  // Search existing known groups
  const all = getAllStudyGroups();
  const found = all.find(
    (g) =>
      g.id.toLowerCase() === trimmed.toLowerCase() ||
      (g.roomCode && g.roomCode.toUpperCase() === upper)
  );
  if (found) return found;

  // Search Firestore if not found locally
  const db = getCloudDatabase();
  if (db) {
    try {
      // 1. Check direct doc ID
      const docRef = doc(db, 'study_groups', trimmed);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as StudyGroup;
        return { ...data, id: snap.id };
      }

      // Private codes resolve through exact invitation lookups, never a collection scan.
      const invite = await getDoc(doc(db, 'room_invites', upper));
      if (invite.exists()) {
        const target = await getDoc(doc(db, 'study_groups', invite.data().groupId));
        if (target.exists()) return { ...(target.data() as StudyGroup), id: target.id };
      }
      const publicMatches = await getDocs(query(collection(db, 'study_groups'), where('isPublic', '==', true), where('roomCode', '==', upper), limit(1)));
      if (publicMatches.docs[0]) return { ...(publicMatches.docs[0].data() as StudyGroup), id: publicMatches.docs[0].id };
    } catch (err) {
      console.warn('Error fetching group from Firestore:', err);
    }
  }

  return undefined;
}

// Real-time listener for all study groups in Firestore
export function subscribeAllStudyGroups(onGroups: (groups: StudyGroup[]) => void, currentUid?: string): () => void {
  onGroups(getAllStudyGroups());
  const db = getCloudDatabase();
  if (!db) return () => {};
  const publicRooms = new Map<string, StudyGroup>();
  const ownedRooms = new Map<string, StudyGroup>();
  const subscribe = (field: string, value: string | boolean, destination: Map<string, StudyGroup>) => onSnapshot(
    query(collection(db, 'study_groups'), where(field, '==', value)),
    snapshot => {
      destination.clear();
      snapshot.forEach(d => destination.set(d.id, {...d.data(), id:d.id} as StudyGroup));
      cachedRemoteRooms = [...publicRooms.values(), ...ownedRooms.values()];
      onGroups(getAllStudyGroups());
    }, error => console.warn('Room listing unavailable:', error)
  );
  const offPublic = subscribe('isPublic', true, publicRooms);
  const offOwned = currentUid ? subscribe('createdById', currentUid, ownedRooms) : () => {};
  return () => { offPublic(); offOwned(); };
}

// Create a custom study room with shareable code and link
export async function createCustomStudyRoom(
  data: {
    name: string;
    description: string;
    category: string;
    timerMode: TimerMode;
    isPublic: boolean;
    topic?: string;
  },
  currentUser: AuthUser | null
): Promise<StudyGroup> {
  if(!currentUser||currentUser.isAnonymous)throw new Error('Sign in to use study groups.');
  const roomId = `room-${crypto.randomUUID()}`;
  const roomCode = generateRoomCode();

  const newRoom: StudyGroup = {
    id: roomId,
    name: data.name.trim(),
    description:
      data.description.trim() || 'Private study circle for focused peer sprints.',
    category: data.category || 'General Study',
    activeCount: 1,
    timerMode: data.timerMode || 'pomodoro-50',
    badgeColor: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10',
    isPublic: data.isPublic,
    createdById: currentUser.uid,
    createdByName:
      currentUser?.displayName || 'Scholar Host',
    createdAt: Date.now(),
    topic: data.topic?.trim() || 'Deep Work Session',
    roomCode,
  };

  const db = getCloudDatabase();
  if (db) {
    const batch = writeBatch(db);
    batch.set(doc(db, 'study_groups', newRoom.id), newRoom);
    batch.set(doc(db, 'room_invites', roomCode), {groupId: newRoom.id, createdById: newRoom.createdById});
    await batch.commit();
  }
  const current = getAllCustomStudyRooms();
  localStorage.setItem(STORAGE_KEYS.CUSTOM_ROOMS, JSON.stringify([newRoom, ...current]));

  return newRoom;
}

export function getAllCustomStudyRooms(): StudyGroup[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_ROOMS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // ignore
  }
  return [];
}

// -------------------------------------------------------------
// Real Live Presence System (No fake bots, 100% real members)
// -------------------------------------------------------------

export async function joinOrUpdateRoomMember(
  roomId: string,
  currentUser: AuthUser | null,
  status: MemberStudyStatus,
  currentSubject: string,
  todaySeconds: number,
  streakDays: number,
  timerMode?: TimerMode,
  inviteCode?: string
): Promise<void> {
  if(!currentUser||currentUser.isAnonymous)throw new Error('Sign in to use study groups.');
  const currentUid = currentUser.uid;
  const membershipKey=`${roomId}:${currentUid}`;
  if(revokedMemberships.has(membershipKey))return;
  const displayName =
    currentUser?.displayName || 'Scholar';
  const avatarUrl =
    currentUser?.photoURL ||
    `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(currentUid)}`;

  const memberData: GroupMember = {
    uid: currentUid,
    joined: true,
    displayName,
    avatarUrl,
    status,
    currentSubject: currentSubject || 'Focused Study',
    todaySeconds: Math.max(0, todaySeconds),
    streakDays: Math.max(0, streakDays),
    joinedAt: inMemoryMembers[roomId]?.find(m => m.uid === currentUid)?.joinedAt || Date.now(),
    lastActiveAt: Date.now(),
    lastHeartbeat: Date.now(),
    studyDate: getLocalDateString(),
    ...(inviteCode ? { inviteCode } : {}),
    ...(timerMode ? { timerMode } : {}),
    isCurrentUser: true,
  };

  // Immediate local update
  if (!inMemoryMembers[roomId]) {
    inMemoryMembers[roomId] = [];
  }
  const existingIdx = inMemoryMembers[roomId].findIndex((m) => m.uid === currentUid);
  if (existingIdx >= 0) {
    inMemoryMembers[roomId][existingIdx] = memberData;
  } else {
    inMemoryMembers[roomId].unshift(memberData);
  }

  memberChannel.publish(roomId, [...inMemoryMembers[roomId]]);

  // Firestore update
  const db = getCloudDatabase();
  if (db) {
    try {
      const memberRef = doc(db, 'study_groups', roomId, 'members', currentUid);
      const write=setDoc(memberRef, memberData, { merge: true });
      const pending=pendingMemberWrites.get(membershipKey)||new Set<Promise<void>>();pending.add(write);pendingMemberWrites.set(membershipKey,pending);
      try{await write;}finally{pending.delete(write);}
    } catch (err) {
      throw new Error('Unable to connect to this room.', { cause: err });
    }
  }
}

export async function leaveRoomMember(roomId: string, currentUid: string): Promise<void> {
  if (inMemoryMembers[roomId]) {
    inMemoryMembers[roomId] = inMemoryMembers[roomId].map(m => m.uid === currentUid ? {...m, status: 'offline', lastHeartbeat: 0} : m);
  }

  memberChannel.publish(roomId, [...(inMemoryMembers[roomId] || [])]);
  const db = getCloudDatabase();
  if (db) {
    try {
      const memberRef = doc(db, 'study_groups', roomId, 'members', currentUid);
      await setDoc(memberRef, { status: 'offline', lastHeartbeat: 0 }, { merge: true });
    } catch (err) {
      console.warn('Failed to remove member from room:', err);
    }
  }
}

// Subscribe to real members in a room (Firestore with local fallback)
export function subscribeRoomMembers(
  roomId: string,
  currentUid: string,
  onMembers: (members: GroupMember[]) => void,
  onConnection?: (state: 'local' | 'connecting' | 'connected' | 'offline') => void
): () => void {
  // Initial local list
  const initial = (inMemoryMembers[roomId] || []).map((m) => ({
    ...m,
    isCurrentUser: m.uid === currentUid,
  }));
  onMembers(initial);
  const expiryInterval = setInterval(() => onMembers((inMemoryMembers[roomId] || []).map(m => normalizePresence(m, currentUid, Date.now(), getLocalDateString()) as GroupMember)), 15000);
  const offChannel = memberChannel.subscribe(roomId, members => onMembers(members.map(m => normalizePresence(m, currentUid, Date.now(), getLocalDateString()) as GroupMember)));

  const offLocal = () => { clearInterval(expiryInterval); offChannel(); };
  const db = getCloudDatabase();
  if (!db) { onConnection?.('local'); return offLocal; }
  onConnection?.('connecting');

  try {
    const membersRef = collection(db, 'study_groups', roomId, 'members');
    const unsubscribe = onSnapshot(
      membersRef,
      (snapshot) => {
        onConnection?.(snapshot.metadata.fromCache ? 'connecting' : 'connected');
        const now = Date.now();
        const activeMembers: GroupMember[] = [];

        snapshot.forEach((d) => {
          const data = d.data() as GroupMember;
          if (data.joined === false) return;
          activeMembers.push(normalizePresence({ ...data, uid: d.id }, currentUid, now, getLocalDateString()) as GroupMember);
        });

        // Sort: Current user first, then active 'focusing' sorted by duration desc, then 'break', then 'idle'
        activeMembers.sort((a, b) => {
          if (a.isCurrentUser) return -1;
          if (b.isCurrentUser) return 1;
          if (a.status === 'focusing' && b.status !== 'focusing') return -1;
          if (b.status === 'focusing' && a.status !== 'focusing') return 1;
          return b.todaySeconds - a.todaySeconds;
        });

        inMemoryMembers[roomId] = activeMembers;
        onMembers(activeMembers);


      },
      (error) => {
        onConnection?.('offline');
        console.warn('Firestore members listener notice, using local cache:', error);
      }
    );

    return () => { offLocal(); unsubscribe(); };
  } catch (err) {
    onConnection?.('offline');
    console.warn('Firestore members subscription notice:', err);
    return offLocal;
  }
}

// -------------------------------------------------------------
// Real Chat & Message System (Firestore with local fallback)
// -------------------------------------------------------------

export function subscribeGroupMessages(
  roomId: string,
  onMessages: (messages: GroupChatMessage[]) => void
): () => void {
  // Load initial local messages
  if (!inMemoryMessages[roomId]) {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEYS.ROOM_MESSAGES_PREFIX}${roomId}`);
      if (stored) {
        inMemoryMessages[roomId] = JSON.parse(stored);
      } else {
        inMemoryMessages[roomId] = [];
      }
    } catch (e) {
      inMemoryMessages[roomId] = [];
    }
  }

  onMessages([...inMemoryMessages[roomId]]);
  const offLocal = messageChannel.subscribe(roomId, onMessages);

  const db = getCloudDatabase();
  if (!db) return offLocal;

  try {
    const messagesRef = collection(db, 'study_groups', roomId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(80));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const firestoreMsgs: GroupChatMessage[] = [];
        snapshot.forEach((d) => {
          firestoreMsgs.push({ id: d.id, ...(d.data() as Omit<GroupChatMessage, 'id'>) });
        });
        firestoreMsgs.reverse();
        inMemoryMessages[roomId] = firestoreMsgs;
        onMessages(firestoreMsgs);
      },
      (error) => {
        console.warn('Firestore messages listener notice:', error);
      }
    );
    return () => { offLocal(); unsubscribe(); };
  } catch (err) {
    console.warn('Firestore subscription setup notice:', err);
    return offLocal;
  }
}

export async function sendGroupMessage(
  roomId: string,
  currentUser: AuthUser | null,
  text: string,
  type: 'chat' | 'system' | 'cheer' = 'chat',
  cheerEmoji?: string,
  mentionUids: string[] = [],
  image?: ImageAttachment
): Promise<GroupChatMessage> {
  if(image&&!validImageAttachment(image))throw new Error('Invalid image attachment.');
  if(!currentUser||currentUser.isAnonymous)throw new Error('Sign in to use study groups.');
  const currentUid = currentUser.uid;
  if (type === 'chat') {
    const rateCheck = validateMessageRate(currentUid, text);
    if (!rateCheck.allowed) {
      throw new Error(rateCheck.reason || 'Sending messages too quickly. Please pause a moment.');
    }
  }
  const displayName =
    currentUser?.displayName || 'Scholar';

  const avatarUrl =
    currentUser?.photoURL ||
    `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(currentUid)}`;

  const newMsg: GroupChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    groupId: roomId,
    senderUid: currentUid,
    senderName: displayName,
    senderAvatar: avatarUrl,
    text: text.trim(),
    timestamp: Date.now(),
    type,
    cheerEmoji,
    mentionUids,
    ...(image?{image}:{}),
  };

  // 2. Persist to Firestore
  const db = getCloudDatabase();
  if (db) {
    try {
      await commitGroupMessage(db, roomId, currentUid, newMsg.id, {
        groupId: newMsg.groupId,
        senderUid: newMsg.senderUid,
        senderName: newMsg.senderName,
        senderAvatar: newMsg.senderAvatar,
        text: newMsg.text,
        timestamp: newMsg.timestamp,
        type: newMsg.type,
        mentionUids: newMsg.mentionUids || [],
        ...(image ? { image } : {}),
        ...(newMsg.cheerEmoji ? { cheerEmoji: newMsg.cheerEmoji } : {}),
      });
    } catch (err) {
      // Only inspect allowance on a rejected write, never on the delivery path.
      if ((err as {code?:string})?.code === 'permission-denied') {
        const [usage, plan, role] = await Promise.allSettled([
          getDoc(doc(db,'users',currentUid,'chat_days',String(chatDay()))),
          getDoc(doc(db,'subscriptions',currentUid)), getDoc(doc(db,'admins',currentUid)),
        ]);
        if (usage.status === 'fulfilled' && plan.status === 'fulfilled' && role.status === 'fulfilled') {
          nextChatUsage(usage.value.exists() ? usage.value.data().count : 0,
            role.value.exists() || isEntitlementActive(plan.value.exists() ? plan.value.data() as UserSubscription : null));
        }
      }
      throw new Error('Message could not be sent. Please try again.', { cause: err });
    }
  }

  // 1. Immediately update local in-memory & localStorage
  if (!inMemoryMessages[roomId]) {
    inMemoryMessages[roomId] = [];
  }
  inMemoryMessages[roomId] = appendRoomMessage(inMemoryMessages[roomId], newMsg);
  try {
    localStorage.setItem(
      `${STORAGE_KEYS.ROOM_MESSAGES_PREFIX}${roomId}`,
      JSON.stringify(inMemoryMessages[roomId].slice(-50))
    );
  } catch (err) {
    // ignore
  }

  messageChannel.publish(roomId, [...inMemoryMessages[roomId]]);
  return newMsg;
}

// Calculate dynamic room leaderboard based on actual room members
export function getGroupLeaderboard(
  _roomId: string,
  members: GroupMember[]
): GroupLeaderboardEntry[] {
  // Sort descending by today's focused seconds
  const sorted = [...members].sort((a, b) => b.todaySeconds - a.todaySeconds);

  return sorted.map((m, idx) => ({
    rank: idx + 1,
    uid: m.uid,
    displayName: m.displayName,
    avatarUrl: m.avatarUrl,
    todaySeconds: m.todaySeconds,
    streakDays: m.streakDays,
    currentSubject: m.currentSubject,
    isCurrentUser: !!m.isCurrentUser,
  }));
}

// Closing a room changes presence only. Explicit leave revokes membership access.
export async function exitGroupMembership(roomId:string, uid:string):Promise<void> {
  const key=`${roomId}:${uid}`;revokedMemberships.add(key);
  await Promise.allSettled([...(pendingMemberWrites.get(key)||[])]);
  const db=getCloudDatabase();
  try {if(db)await setDoc(doc(db,'study_groups',roomId,'members',uid),{joined:false,status:'offline',lastHeartbeat:0},{merge:true});}
  catch(error){revokedMemberships.delete(key);throw error;}
  inMemoryMembers[roomId]=(inMemoryMembers[roomId]||[]).filter(member=>member.uid!==uid);
  memberChannel.publish(roomId,[...(inMemoryMembers[roomId]||[])]);
}

export async function kickRoomMember(roomId:string, uid:string):Promise<void> {
  await exitGroupMembership(roomId, uid);
}

// Inbox uses the mention index rather than the latest chat window, so old mentions remain discoverable.
export function subscribeGroupMentions(roomId:string,uid:string,onMessages:(items:GroupChatMessage[])=>void,onError:()=>void):()=>void {
  const db=getCloudDatabase();
  if(!db)return subscribeGroupMessages(roomId,items=>onMessages(items.filter(message=>message.mentionUids?.includes(uid))));
  return onSnapshot(query(collection(db,'study_groups',roomId,'messages'),where('mentionUids','array-contains',uid)),snapshot=>onMessages(snapshot.docs.map(d=>({id:d.id,...d.data()} as GroupChatMessage)).sort((a,b)=>b.timestamp-a.timestamp)),onError);
}
