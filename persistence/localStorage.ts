import type { TerminalSnapshot } from "./types";

const STORAGE_KEY = "melpin-terminal-snapshot";
const SCHEMA_VERSION = 1;

export const saveSnapshot = (snapshot: Omit<TerminalSnapshot, "schemaVersion" | "savedAt">): void => {
  if (typeof window === "undefined") return;
  const payload: TerminalSnapshot = {
    ...snapshot,
    schemaVersion: SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};

export const loadSnapshot = (): TerminalSnapshot | null => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as TerminalSnapshot;
    if (parsed.schemaVersion !== SCHEMA_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const clearSnapshot = (): void => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
};
