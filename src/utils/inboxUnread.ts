import {announcementVisible,type PopupDelivery} from './announcementDelivery.ts';
import { collection, doc, limit, onSnapshot, orderBy, query, where, type Firestore, type Query, type DocumentData } from 'firebase/firestore';
import { normalizeCommunity, type CommunityPreferences } from './communityState.ts';
import { groupMentionUids } from './groupConversation.ts';
import type { GroupChatMessage } from '../types/groups.ts';

export const mentionNoticeId = (groupId: string, messageId: string) => `mention-${groupId}-${messageId}`;
export function mentionsUser(message: GroupChatMessage, user: {uid: string; displayName?: string | null}) {
  return message.senderUid !== user.uid && (message.mentionUids?.includes(user.uid) ||
    groupMentionUids(message.text, [{uid: user.uid, displayName: user.displayName || ''}]).includes(user.uid));
}

/** Keep the navigation badge live even when Inbox is not mounted. Read and mute
 * state comes from the same account preferences and notice IDs as Inbox. */
export function subscribeInboxUnread(db: Firestore, user: {uid: string; displayName?: string | null}, callback: (count: number) => void,plus=false) {
  let closed = false, preferences: CommunityPreferences = normalizeCommunity(), announcements: PopupDelivery[] = [];
  const groups = new Map<string, {indexed: GroupChatMessage[]; recent: GroupChatMessage[]; stop: () => void}>();
  const emit = () => {
    if (closed) return;
    const read = new Set(preferences.readIds), ids = new Set(announcements.filter(a=>announcementVisible(a,plus)).map(a => `announcement-${a.id}`));
    for (const [groupId, messages] of groups) {
      if (preferences.mutedIds.includes(groupId)) continue;
      for (const message of [...messages.recent, ...messages.indexed]) {
        if (mentionsUser(message, user)) ids.add(mentionNoticeId(groupId, message.id));
      }
    }
    callback([...ids].filter(id => !read.has(id)).length);
  };
  const newsOff = onSnapshot(query(collection(db, 'announcements'), orderBy('timestamp', 'desc'), limit(100)), snapshot => {
    announcements = snapshot.docs.map(d => ({id:d.id,...d.data()} as PopupDelivery)); emit();
  }, () => { announcements = []; emit(); });
  const prefOff = onSnapshot(doc(db, 'users', user.uid, 'community', 'preferences'), snapshot => {
    if (closed) return;
    preferences = normalizeCommunity(snapshot.data());
    for (const [id, group] of groups) if (!preferences.joinedIds.includes(id)) { group.stop(); groups.delete(id); }
    for (const id of preferences.joinedIds) if (!groups.has(id)) {
      const group = {indexed: [] as GroupChatMessage[], recent: [] as GroupChatMessage[], stop: () => {}};
      groups.set(id, group);
      const messages = collection(db, 'study_groups', id, 'messages');
      const watch = (field: 'indexed' | 'recent', q: Query<DocumentData>) => onSnapshot(q, snapshot => {
        if (closed || groups.get(id) !== group) return;
        group[field] = snapshot.docs.map(d => ({...d.data(), id: d.id} as GroupChatMessage)); emit();
      }, () => { group[field] = []; emit(); });
      const indexedOff = watch('indexed', query(messages, where('mentionUids', 'array-contains', user.uid)));
      const recentOff = watch('recent', query(messages, orderBy('timestamp', 'desc'), limit(80)));
      group.stop = () => { indexedOff(); recentOff(); };
    }
    emit();
  }, () => { for (const group of groups.values()) group.stop(); groups.clear(); emit(); });
  const deliveryTick=setInterval(emit,15000);
  return () => { clearInterval(deliveryTick);closed = true; newsOff(); prefOff(); for (const group of groups.values()) group.stop(); groups.clear(); };
}
