type MessageIdentity = { senderUid: string; senderName: string; senderAvatar: string };
type MemberIdentity = { uid: string; displayName: string; avatarUrl: string };
type CurrentIdentity = { uid: string; displayName?: string | null; photoURL?: string | null };

export function announcementPreview(text: string): string {
  return text
    .replace(/(^|\s)#{1,6}\s+/g, '$1')
    .replace(/^[-•>]\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\[([^\]]+)]\(https:\/\/[^\s)]+\)/g, '$1')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' · ');
}

export function resolveChatIdentity(
  message: MessageIdentity,
  members: MemberIdentity[],
  current: CurrentIdentity
): { displayName: string; avatarUrl: string } {
  const member = members.find((candidate) => candidate.uid === message.senderUid);
  if (member) return { displayName: member.displayName, avatarUrl: member.avatarUrl };
  if (message.senderUid === current.uid) {
    return {
      displayName: current.displayName || message.senderName,
      avatarUrl: current.photoURL || message.senderAvatar,
    };
  }
  return { displayName: message.senderName, avatarUrl: message.senderAvatar };
}
