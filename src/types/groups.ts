import type { TimerMode } from './index.ts';

export interface StudyGroup {
  id: string;
  name: string;
  description: string;
  category: string;
  activeCount: number;
  timerMode: TimerMode;
  badgeColor: string;
  isPublic: boolean;
  createdById: string;
  createdByName: string;
  createdAt: number;
  topic?: string;
  roomCode?: string;
  customCode?: boolean;
}

export type MemberStudyStatus = 'focusing' | 'break' | 'idle' | 'offline';

export interface GroupMember {
  joined?: boolean;
  uid: string;
  displayName: string;
  avatarUrl: string;
  status: MemberStudyStatus;
  currentSubject: string;
  todaySeconds: number;
  streakDays: number;
  joinedAt: number;
  lastActiveAt: number;
  lastHeartbeat?: number;
  studyDate?: string;
  inviteCode?: string;
  timerMode?: TimerMode;
  isCurrentUser?: boolean;
  isAdmin?: boolean;
}

export type GroupChatMessageType = 'chat' | 'system' | 'cheer';

export interface GroupChatMessage {
  image?: import('../utils/imageAttachments.ts').ImageAttachment;
  id: string;
  groupId: string;
  senderUid: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: number;
  type: GroupChatMessageType;
  cheerEmoji?: string;
  mentionUids?: string[];
  senderIsAdmin?: boolean;
}

export interface GroupLeaderboardEntry {
  rank: number;
  uid: string;
  displayName: string;
  avatarUrl: string;
  todaySeconds: number;
  streakDays: number;
  currentSubject: string;
  isCurrentUser: boolean;
  isAdmin?: boolean;
}
