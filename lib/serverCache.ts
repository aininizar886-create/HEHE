import "server-only";

type CacheEntry<T> = { data: T; at: number };

const cacheStore = new Map<string, CacheEntry<unknown>>();

export const getCached = <T>(key: string, ttlMs: number): T | null => {
  const entry = cacheStore.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > ttlMs) {
    cacheStore.delete(key);
    return null;
  }
  return entry.data as T;
};

export const setCached = <T>(key: string, data: T) => {
  cacheStore.set(key, { data, at: Date.now() });
};

export const invalidateCache = (prefix: string) => {
  for (const key of cacheStore.keys()) {
    if (key.startsWith(prefix)) {
      cacheStore.delete(key);
    }
  }
};
