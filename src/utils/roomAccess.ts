export function isRoomVisible(room: { id: string; createdById: string; isPublic: boolean }, tab: 'public' | 'my-rooms', uid: string | undefined, joinedIds: string[]): boolean {
  return tab === 'public' ? room.isPublic : Boolean(uid && (room.createdById === uid || joinedIds.includes(room.id)));
}
