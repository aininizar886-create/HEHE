import { kv } from "@vercel/kv";

type PresenceEntry = { online: boolean; lastSeen: number };

const PRESENCE_TTL_SECONDS = 90;
const hasKv =
  Boolean(process.env.KV_REST_API_URL) && Boolean(process.env.KV_REST_API_TOKEN);

const memoryPresence: Map<string, PresenceEntry> =
  (globalThis as typeof globalThis & { __presenceMap?: Map<string, PresenceEntry> })
    .__presenceMap ?? new Map();

if (!(globalThis as typeof globalThis & { __presenceMap?: Map<string, PresenceEntry> }).__presenceMap) {
  (globalThis as typeof globalThis & { __presenceMap?: Map<string, PresenceEntry> }).__presenceMap = memoryPresence;
}

const presenceKey = (userId: string) => `presence:${userId}`;

export const touchPresence = async (userId: string) => {
  const entry: PresenceEntry = { online: true, lastSeen: Date.now() };
  if (hasKv) {
    await kv.set(presenceKey(userId), entry, { ex: PRESENCE_TTL_SECONDS });
    return;
  }
  memoryPresence.set(userId, entry);
};

export const getPresence = async (ids: string[]) => {
  if (!ids.length) return [];
  if (hasKv) {
    const keys = ids.map(presenceKey);
    const values = await kv.mget<PresenceEntry[]>(...keys);
    return ids.map((id, index) => {
      const entry = values[index];
      return {
        id,
        online: Boolean(entry),
        lastSeen: entry?.lastSeen ?? null,
      };
    });
  }

  const now = Date.now();
  return ids.map((id) => {
    const entry = memoryPresence.get(id);
    const isOnline = Boolean(entry && now - entry.lastSeen <= PRESENCE_TTL_SECONDS * 1000);
    if (!isOnline && entry) {
      memoryPresence.delete(id);
    }
    return {
      id,
      online: isOnline,
      lastSeen: entry?.lastSeen ?? null,
    };
  });
};
