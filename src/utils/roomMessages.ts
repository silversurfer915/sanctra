export function appendRoomMessage<T extends { id: string }>(messages:T[], message:T):T[] {
  return [...messages.filter(existing=>existing.id!==message.id), message];
}
