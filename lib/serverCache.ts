import "server-only";

import { kv } from "@vercel/kv";

type CacheEntry<T> = { data: T; at: number; ttlMs: number };

const cacheStore = new Map<string, CacheEntry<unknown>>();
const kvEnabled = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

export const getCached = async <T>(key: string, ttlMs: number): Promise<T | undefined> => {
  if (kvEnabled) {
    try {
      const value = await kv.get<T>(key);
      if (value !== null && value !== undefined) return value;
    } catch {
      // fallback to memory cache
    }
  }
  const entry = cacheStore.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.at > ttlMs) {
    cacheStore.delete(key);
    return undefined;
  }
  return entry.data as T;
};

export const setCached = async <T>(key: string, data: T, ttlMs: number) => {
  if (kvEnabled) {
    try {
      await kv.set(key, data, { ex: Math.max(1, Math.ceil(ttlMs / 1000)) });
      return;
    } catch {
      // fallback to memory cache
    }
  }
  cacheStore.set(key, { data, at: Date.now(), ttlMs });
};

export const invalidateCache = async (key: string) => {
  if (kvEnabled) {
    try {
      await kv.del(key);
    } catch {
      // ignore
    }
  }
  cacheStore.delete(key);
};
