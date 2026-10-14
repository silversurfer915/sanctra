export function resolveAccountData<T extends { sessions: unknown[]; subjects: unknown[]; tasks: unknown[] }>(local: T, remote: Partial<T> | null): T {
  if (!remote) return local;
  return {
    ...local,
    ...Object.fromEntries(['sessions','subjects','tasks','calendarEvents'].filter(key => Array.isArray(remote[key as keyof T])).map(key => [key, remote[key as keyof T]])),
  };
}
