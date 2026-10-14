export function normalizePresence<T extends { uid: string; status: string; lastHeartbeat?: number; lastActiveAt?: number; todaySeconds: number; studyDate?: string }>(member:T, currentUid:string, now:number, today:string) {
  const lastBeat = member.lastHeartbeat ?? member.lastActiveAt ?? 0;
  const date = member.studyDate || new Date(lastBeat).toLocaleDateString('en-CA');
  return { ...member, status: now - lastBeat < 150000 && member.status !== 'offline' ? member.status : 'offline', todaySeconds:date === today ? member.todaySeconds : 0, isCurrentUser:member.uid === currentUid };
}
