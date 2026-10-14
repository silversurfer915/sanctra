export function createChannel<T>() {
  const listeners = new Map<string, Set<(value: T) => void>>();
  return {
    subscribe(key: string, callback: (value: T) => void) {
      const subscribers = listeners.get(key) || new Set();
      subscribers.add(callback);
      listeners.set(key, subscribers);
      return () => { subscribers.delete(callback); if (!subscribers.size) listeners.delete(key); };
    },
    publish(key: string, value: T) {
      listeners.get(key)?.forEach(callback => callback(value));
    },
  };
}
