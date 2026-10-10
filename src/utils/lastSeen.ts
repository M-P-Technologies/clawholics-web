// The last response received for each page's content. A page starts from this instead of a
// blank loading screen when you come back to it, then refreshes it from the server.
const store = new Map<string, unknown>();

export function lastSeen<T>(key: string): T | undefined {
  return store.get(key) as T | undefined;
}

export function remember<T>(key: string, value: T): T {
  store.set(key, value);
  return value;
}
