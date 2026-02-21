"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import {
  Archive,
  Bell,
  Calendar,
  Clock,
  Copy,
  Heart,
  Home as HomeIcon,
  Image as ImageIcon,
  LayoutGrid,
  List,
  ListChecks,
  LogIn,
  MessageCircle,
  Palette,
  Pin,
  Plus,
  Search,
  Send,
  Share2,
  Sparkles,
  Star,
  StickyNote,
  Tag,
  Terminal,
  Trash2,
  Type,
  User,
} from "lucide-react";
import { TerminalExperience } from "@/src/ui/components/Terminal/TerminalExperience";

type View = "login" | "setup" | "dashboard" | "terminal" | "chat-hub" | "notes" | "reminders" | "gallery";

type Profile = {
  name: string;
  birthDate: string;
  status?: string;
  bio?: string;
  avatar?: string;
  avatarImage?: string;
  avatarAsset?: string;
  accentColor?: string;
  accentSoftness?: number;
  terminalHost?: string;
  terminalName?: string;
  prayerCityId?: string;
  prayerCityName?: string;
  timezone?: string;
};

type Note = {
  id: string;
  title: string;
  text: string;
  type: "text" | "checklist";
  checklist: Array<{ id: string; text: string; done: boolean }>;
  mood?: string;
  tags: string[];
  color: string;
  pattern: string;
  font: string;
  fontSize: number;
  pinned: boolean;
  favorite: boolean;
  archived: boolean;
  energy: number;
  createdAt: number;
  updatedAt: number;
};

type Reminder = {
  id: string;
  text: string;
  done: boolean;
  date?: string;
  time?: string;
  scheduledAt?: number;
  notified?: boolean;
  pointsWeekKey?: string;
};

type GalleryItem = {
  id: string;
  src: string;
  name: string;
  addedAt: number;
  updatedAt: number;
  caption: string;
  tags: string[];
  favorite: boolean;
  memoryDate?: string;
};

type ChatMessage = {
  id: string;
  from: "me" | "melfin" | "assistant";
  text: string;
  timestamp: number;
  status?: "sent" | "read";
  kind?: "text" | "share";
  share?: SharePayload;
  shareCaption?: string;
};

type ChatThread = {
  id: string;
  title: string;
  subtitle: string;
  kind: "realtime" | "ai";
  avatar: string;
  pinned?: boolean;
  messages: ChatMessage[];
};

type PrayerCity = { id: string; lokasi: string };

type CalendarToday = {
  date: string;
  timezone?: string;
  holiday?: { name: string } | null;
  hijri?: { day: number; month: number; monthName: string; year: number; era?: string } | null;
  ramadan?: { isRamadan: boolean; day?: number } | null;
  prayer?: {
    cityId: string;
    cityName: string;
    imsak?: string;
    subuh?: string;
    terbit?: string;
    dhuha?: string;
    dzuhur?: string;
    ashar?: string;
    maghrib?: string;
    isya?: string;
  } | null;
};

type SharePayload = {
  kind: "note" | "reminder" | "gallery" | "media" | "location";
  title: string;
  body: string;
  meta?: string;
  imageSrc?: string;
  videoSrc?: string;
  targetId?: string;
};


type WeeklyPoints = {
  weekStart: number;
  points: number;
};

const STORAGE_KEYS = {
  login: "melpin_isLoggedIn",
  profile: "melpin_userProfile",
  notes: "melpin_notes",
  reminders: "melpin_reminders",
  gallery: "melpin_gallery",
  chats: "melpin_chats",
  weeklyPoints: "melpin_weeklyPoints",
} as const;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY", // TODO: ganti dengan API key Firebase asli kamu.
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

const AVATAR_EMOJIS = ["🧸", "💖", "😺", "✨", "🌸", "🫶", "🐰", "⭐"];
const CHUBBY_ASSETS: Array<{ id: string; label: string; src: string }> = [];

const DEFAULT_PRAYER_CITY: PrayerCity = { id: "58a2fc6ed39fd083f55d4182bf88826d", lokasi: "KOTA JAKARTA" };
const DEFAULT_TIMEZONE = "Asia/Jakarta";
const FALLBACK_TIMEZONES = [
  "Asia/Jakarta",
  "Asia/Makassar",
  "Asia/Jayapura",
  "Asia/Singapore",
  "Asia/Kuala_Lumpur",
  "Asia/Bangkok",
  "Asia/Manila",
  "UTC",
];

const NOTE_THEMES = [
  {
    id: "rose",
    label: "Rose",
    card: "bg-gradient-to-br from-pink-300 via-pink-400 to-hot text-black",
    chip: "bg-white/70 text-black border border-black/15 shadow-sm hover:bg-white/85",
  },
  {
    id: "peach",
    label: "Peach",
    card: "bg-gradient-to-br from-orange-200 via-amber-200 to-rose-300 text-black",
    chip: "bg-white/70 text-black border border-black/15 shadow-sm hover:bg-white/85",
  },
  {
    id: "mint",
    label: "Mint",
    card: "bg-gradient-to-br from-emerald-200 via-teal-200 to-green-300 text-black",
    chip: "bg-white/70 text-black border border-black/15 shadow-sm hover:bg-white/85",
  },
  {
    id: "sky",
    label: "Sky",
    card: "bg-gradient-to-br from-sky-200 via-cyan-200 to-blue-300 text-black",
    chip: "bg-white/70 text-black border border-black/15 shadow-sm hover:bg-white/85",
  },
  {
    id: "lemon",
    label: "Lemon",
    card: "bg-gradient-to-br from-yellow-200 via-amber-200 to-lime-200 text-black",
    chip: "bg-white/70 text-black border border-black/15 shadow-sm hover:bg-white/85",
  },
  {
    id: "pastel",
    label: "Pastel",
    card: "bg-gradient-to-br from-rose-200 via-violet-200 to-sky-200 text-black",
    chip: "bg-white/70 text-black border border-black/15 shadow-sm hover:bg-white/85",
  },
  {
    id: "retro",
    label: "Retro",
    card: "bg-gradient-to-br from-amber-200 via-orange-300 to-rose-300 text-black",
    chip: "bg-white/70 text-black border border-black/15 shadow-sm hover:bg-white/85",
  },
  {
    id: "neon",
    label: "Neon",
    card: "bg-gradient-to-br from-lime-200 via-emerald-300 to-cyan-300 text-black",
    chip: "bg-white/70 text-black border border-black/15 shadow-sm hover:bg-white/85",
  },
  {
    id: "lavender",
    label: "Lavender",
    card: "bg-gradient-to-br from-violet-200 via-fuchsia-200 to-indigo-300 text-black",
    chip: "bg-white/70 text-black border border-black/15 shadow-sm hover:bg-white/85",
  },
  {
    id: "ocean",
    label: "Ocean",
    card: "bg-gradient-to-br from-cyan-200 via-blue-200 to-teal-300 text-black",
    chip: "bg-white/70 text-black border border-black/15 shadow-sm hover:bg-white/85",
  },
  {
    id: "candy",
    label: "Candy",
    card: "bg-gradient-to-br from-fuchsia-200 via-pink-300 to-rose-300 text-black",
    chip: "bg-white/70 text-black border border-black/15 shadow-sm hover:bg-white/85",
  },
] as const;

const NOTE_PATTERNS = [
  { id: "none", label: "Polos" },
  { id: "dots", label: "Dots" },
  { id: "grid", label: "Grid" },
  { id: "lines", label: "Lines" },
  { id: "waves", label: "Waves" },
  { id: "sprinkle", label: "Sprinkle" },
] as const;

const NOTE_FONTS = [
  { id: "body", label: "Grotesk", family: "var(--font-body-face)" },
  { id: "display", label: "Display", family: "var(--font-display-face)" },
  { id: "serif", label: "Serif", family: "'Georgia', 'Times New Roman', serif" },
  { id: "mono", label: "Mono", family: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace" },
  { id: "hand", label: "Hand", family: "'Comic Sans MS', 'Segoe Print', 'Bradley Hand', cursive" },
] as const;

const NOTE_FONT_SIZES = {
  min: 12,
  max: 22,
  step: 1,
} as const;

const NOTE_MOODS = [
  { id: "soft", label: "Soft", emoji: "🌸" },
  { id: "happy", label: "Happy", emoji: "😸" },
  { id: "spark", label: "Spark", emoji: "✨" },
  { id: "calm", label: "Calm", emoji: "🫧" },
  { id: "deep", label: "Deep", emoji: "🌙" },
] as const;

const NOTE_PROMPTS = [
  "Hari ini yang bikin aku ketawa adalah...",
  "Aku pengen bilang makasih karena...",
  "Satu hal kecil yang bikin aku tenang...",
  "Kalau aku bisa ulang hari ini, aku mau...",
  "Mood aku sekarang tuh kayak...",
  "Aku lagi mikirin hal random: ...",
];

const NOTE_TEMPLATES = [
  {
    id: "curhat",
    label: "Curhat",
    title: "Curhat Hari Ini",
    text: "Aku pengen cerita soal...",
    mood: "soft",
    type: "text",
  },
  {
    id: "gratitude",
    label: "Gratitude",
    title: "3 Hal Aku Syukuri",
    text: "1.\n2.\n3.",
    mood: "happy",
    type: "text",
  },
  {
    id: "idea",
    label: "Ide",
    title: "Ide Random",
    text: "-\n-",
    mood: "spark",
    type: "text",
  },
  {
    id: "checklist",
    label: "Checklist",
    title: "Checklist Manis",
    text: "",
    mood: "calm",
    type: "checklist",
  },
] as const;

const DEFAULT_CHAT_THREADS: ChatThread[] = [
  {
    id: "melpin-ai",
    title: "Melpin Assistant",
    subtitle: "Teman ngobrol AI",
    kind: "ai",
    avatar: "🤖",
    pinned: false,
    messages: [],
  },
];

const ACCENT_PRESETS = [
  { id: "pink", label: "Pink", color: "#ff4fa3" },
  { id: "peach", label: "Peach", color: "#ff8f5f" },
  { id: "gold", label: "Gold", color: "#ffb547" },
  { id: "mint", label: "Mint", color: "#3dd4b4" },
  { id: "sky", label: "Sky", color: "#4aa8ff" },
  { id: "violet", label: "Violet", color: "#8b6cff" },
  { id: "lime", label: "Lime", color: "#94f05f" },
  { id: "coral", label: "Coral", color: "#ff6f91" },
  { id: "teal", label: "Teal", color: "#1fb6a6" },
] as const;

const DEFAULT_ACCENT = "#ff4fa3";
const DEFAULT_ACCENT_SOFTNESS = 55;

const REMINDER_POINTS = 2;
const WEEKLY_POINT_TARGET = 50;
const NOTIF_NUDGE_KEY = "melpin_notification_nudge_seen";

const readStorage = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeStorage = (key: string, value: unknown) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage errors (private mode / quota / etc).
  }
};

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

const apiJson = async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    credentials: "include",
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "Request gagal.");
  }
  return response.json() as Promise<T>;
};

const getInitialChatThreads = () => {
  const stored = readStorage<ChatThread[]>(STORAGE_KEYS.chats, []);
  const cleaned = stored.filter(
    (thread) =>
      thread.title.toLowerCase() !== "melfin asli" &&
      thread.id !== "melpin-ai"
  );
  return cleaned;
};

const makeDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const pickMessage = (messages: string[], seed: string) => {
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return messages[hash % messages.length];
};

const parseLocalTime = (dateKey: string, time?: string) => {
  if (!time) return null;
  const clean = time.trim();
  if (!clean) return null;
  const date = new Date(`${dateKey}T${clean}:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getTimePartsInZone = (date: Date, timeZone: string) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return { hour, minute, minutes: hour * 60 + minute };
};

const isWithinMinutesRange = (nowMinutes: number, target: number, before: number, after: number) =>
  nowMinutes >= target - before && nowMinutes <= target + after;

const buildHolidayMessage = (name: string, seed: string) => {
  const lower = name.toLowerCase();
  if (lower.includes("imlek")) {
    return pickMessage(["Hari ini Imlek! Bagi dong angpao nya 🧧", "Gong xi fa cai! Semoga hoki melimpah 🐉"], seed);
  }
  if (lower.includes("nyepi")) {
    return pickMessage(["Selamat Hari Nyepi, semoga hati tenang dan damai 🌿"], seed);
  }
  if (lower.includes("waisak")) {
    return pickMessage(["Selamat Hari Waisak, semoga damai selalu 🪷"], seed);
  }
  if (lower.includes("idul fitri")) {
    return pickMessage(
      ["Selamat Idul Fitri! Mohon maaf lahir batin 💛", "Minal aidin wal faidzin! Semoga hati lega ✨"],
      seed
    );
  }
  if (lower.includes("idul adha")) {
    return pickMessage(["Selamat Idul Adha! Semoga penuh berkah 🐏"], seed);
  }
  if (lower.includes("natal")) {
    return pickMessage(["Selamat Natal! Semoga damai dan bahagia 🎄"], seed);
  }
  if (lower.includes("kemerdekaan")) {
    return pickMessage(["Selamat Hari Kemerdekaan! Merdeka! 🇮🇩"], seed);
  }
  if (lower.includes("pancasila")) {
    return pickMessage(["Selamat Hari Pancasila! Tetap rukun dan solid 🤝"], seed);
  }
  if (lower.includes("tahun baru")) {
    return pickMessage(["Selamat Tahun Baru! Semoga makin happy dan produktif 🎉"], seed);
  }
  return `Hari ini libur ${name}. Selamat beristirahat ya ✨`;
};

const getCalendarGreeting = (now: Date, calendar?: CalendarToday | null) => {
  if (!calendar) return null;
  const dateKey = calendar.date;
  const seed = `${dateKey}-${calendar.prayer?.cityId ?? ""}`;
  const timeZone = calendar.timezone ?? DEFAULT_TIMEZONE;
  const nowMinutes = getTimePartsInZone(now, timeZone).minutes;

  if (calendar.holiday?.name) {
    return buildHolidayMessage(calendar.holiday.name, seed);
  }

  if (calendar.ramadan?.isRamadan) {
    const maghribTime = parseLocalTime(dateKey, calendar.prayer?.maghrib);
    if (isWithinMinutesRange(nowMinutes, 3 * 60, 0, 90)) {
      return pickMessage(
        ["Semangat puasanya! Sahur dulu ya 🌙", "Semangat puasanya, sahur dulu biar kuat ✨"],
        seed
      );
    }
    if (maghribTime) {
      const maghribMinutes = maghribTime.getHours() * 60 + maghribTime.getMinutes();
      if (isWithinMinutesRange(nowMinutes, maghribMinutes, 10, 25)) {
        return pickMessage(
          ["Semangat puasanya! Waktunya berbuka 🤍", "Semangat puasanya, waktunya buka ✨"],
          seed
        );
      }
    }
    if (isWithinMinutesRange(nowMinutes, 3 * 60 + 30, 10, 10)) {
      return pickMessage(["Semangat puasanya! Sahur jam 03:30 ya ✨", "Semangat puasanya, sahur bentar lagi 💫"], seed);
    }
    if (isWithinMinutesRange(nowMinutes, 4 * 60 + 15, 10, 10)) {
      return pickMessage(
        ["Semangat puasanya! Sahur terakhir jam 04:15 ya ✨", "Semangat puasanya, bentar lagi imsak 💛"],
        seed
      );
    }
    const day = calendar.ramadan.day ?? calendar.hijri?.day;
    return pickMessage(
      [
        `Ramadan hari ke-${day ?? "?"}. Semangat puasanya ya 🌙`,
        `Puasa hari ke-${day ?? "?"}. Semangat puasanya, lancar ya ✨`,
      ],
      seed
    );
  }

  return null;
};

const getGreeting = (now: Date, calendar?: CalendarToday | null) => {
  const special = getCalendarGreeting(now, calendar);
  if (special) return special;

  const timeZone = calendar?.timezone ?? DEFAULT_TIMEZONE;
  const hour = getTimePartsInZone(now, timeZone).hour;
  if (hour >= 5 && hour <= 11) {
    return pickMessage(
      ["Selamat Pagi cantik, semangat ya hari ini! ☀️", "Pagi sayang, jangan lupa sarapan ya 🍞"],
      makeDateKey(now)
    );
  }
  if (hour >= 12 && hour <= 14) {
    return pickMessage(
      ["Siang cantik, jangan lupa makan loh! 🍱", "Waktunya isi energi dulu ya, makan siang! 🍜"],
      makeDateKey(now)
    );
  }
  if (hour >= 15 && hour <= 17) {
    return pickMessage(
      ["Soreee, capek ya? Istirahat bentar yuk 🌅", "Sore manis, tarik napas dulu ya ✨"],
      makeDateKey(now)
    );
  }
  return pickMessage(
    ["Udah malem nih, istirahat gih, mimpi indah ya 🌙", "Malam sayang, waktunya rehat 💤"],
    makeDateKey(now)
  );
};

const calculateAgeParts = (birthDate?: string, now?: Date) => {
  if (!birthDate || !now) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;

  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();

  if (days < 0) {
    const daysInPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += daysInPrevMonth;
    months -= 1;
  }

  if (months < 0) {
    months += 12;
    years -= 1;
  }

  if (years < 0) return null;
  return { years, months, days };
};

const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const createChecklistItem = (text = "") => ({
  id: makeId(),
  text,
  done: false,
});

const createNote = (partial: Partial<Note> = {}): Note => {
  const now = Date.now();
  const baseTheme = NOTE_THEMES[0]?.id ?? "rose";
  const baseMood = NOTE_MOODS[0]?.id ?? "soft";
  const type = partial.type ?? "text";
  return {
    id: partial.id ?? makeId(),
    title: partial.title ?? "",
    text: partial.text ?? "",
    type,
    checklist: partial.checklist ?? (type === "checklist" ? [createChecklistItem("Catatan baru")] : []),
    mood: partial.mood ?? baseMood,
    tags: partial.tags ?? [],
    color: partial.color ?? baseTheme,
    pattern: partial.pattern ?? "none",
    font: partial.font ?? "body",
    fontSize: partial.fontSize ?? 15,
    pinned: partial.pinned ?? false,
    favorite: partial.favorite ?? false,
    archived: partial.archived ?? false,
    energy: partial.energy ?? 60,
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
  };
};

const createGalleryItem = (partial: Partial<GalleryItem> = {}): GalleryItem => {
  const createdAt = partial.addedAt ?? Date.now();
  const memoryDate =
    partial.memoryDate ?? new Date(createdAt).toISOString().slice(0, 10);
  return {
    id: partial.id ?? makeId(),
    src: partial.src ?? "",
    name: partial.name ?? "Foto baru",
    addedAt: createdAt,
    updatedAt: partial.updatedAt ?? createdAt,
    caption: partial.caption ?? "",
    tags: partial.tags ?? [],
    favorite: partial.favorite ?? false,
    memoryDate,
  };
};

const migrateNotes = (raw: unknown): Note[] => {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (item && typeof item === "object" && "type" in item) {
      return createNote(item as Partial<Note>);
    }
    const legacy = item as { id?: string; text?: string };
    return createNote({
      id: legacy?.id ?? makeId(),
      title: "Catatan Lama",
      text: legacy?.text ?? "",
    });
  });
};

const migrateGallery = (raw: unknown): GalleryItem[] => {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (item && typeof item === "object" && "caption" in item) {
      return createGalleryItem(item as Partial<GalleryItem>);
    }
    const legacy = item as { id?: string; src?: string; name?: string; addedAt?: number };
    return createGalleryItem({
      id: legacy?.id ?? makeId(),
      src: legacy?.src ?? "",
      name: legacy?.name ?? "Foto lama",
      addedAt: legacy?.addedAt ?? Date.now(),
    });
  });
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const getStaticMapUrl = (lat: number, lon: number) =>
  `/api/maps/static?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}`;

const parseLatLon = (value: string) => {
  const [latRaw, lonRaw] = value.split(",").map((item) => item.trim());
  const lat = Number.parseFloat(latRaw);
  const lon = Number.parseFloat(lonRaw);
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
  return { lat, lon };
};

const createMapFallbackSvg = (label: string) => {
  const safeLabel = label.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const svg = `<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"640\" height=\"360\"><rect width=\"100%\" height=\"100%\" fill=\"#0f172a\"/><text x=\"50%\" y=\"50%\" dominant-baseline=\"middle\" text-anchor=\"middle\" fill=\"#cbd5f5\" font-family=\"ui-sans-serif, system-ui\" font-size=\"18\">${safeLabel}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

const hexToRgb = (hex: string) => {
  const raw = hex.replace("#", "");
  const value = raw.length === 3 ? raw.split("").map((char) => char + char).join("") : raw;
  if (value.length !== 6) return null;
  const num = Number.parseInt(value, 16);
  if (Number.isNaN(num)) return null;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
};

const rgbToHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;

const hexToRgba = (hex: string, alpha: number) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(255,79,163,${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
};

const mixHex = (baseHex: string, mixHexValue: string, ratio: number) => {
  const base = hexToRgb(baseHex);
  const mix = hexToRgb(mixHexValue);
  if (!base || !mix) return baseHex;
  const amount = clamp(ratio, 0, 1);
  const r = Math.round(base.r + (mix.r - base.r) * amount);
  const g = Math.round(base.g + (mix.g - base.g) * amount);
  const b = Math.round(base.b + (mix.b - base.b) * amount);
  return rgbToHex(r, g, b);
};

const isHexColor = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value);

const getAvatarEmoji = (name?: string) => {
  const seed = name?.trim() || "melpin";
  const total = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return AVATAR_EMOJIS[total % AVATAR_EMOJIS.length];
};

const isAvatarImage = (value?: string) =>
  Boolean(value && (value.startsWith("data:image") || value.startsWith("http") || value.startsWith("/")));

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("File tidak terbaca."));
    };
    reader.onerror = () => reject(new Error("Gagal baca file."));
    reader.readAsDataURL(file);
  });

const resizeImageFile = async (file: File, maxSize = 320, quality = 0.86) => {
  if (!file.type.startsWith("image/")) return readFileAsDataUrl(file);
  const toDataUrl = (image: CanvasImageSource, width: number, height: number) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas tidak tersedia.");
    ctx.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", quality);
  };
  if ("createImageBitmap" in window) {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const result = toDataUrl(bitmap, width, height);
    bitmap.close();
    return result;
  }
  const dataUrl = await readFileAsDataUrl(file);
  const image = document.createElement("img");
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Gagal baca gambar."));
    image.src = dataUrl;
  });
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  return toDataUrl(image, width, height);
};

const formatChatTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

const formatChatDate = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

const getThreadPreview = (thread: ChatThread) => {
  if (!thread.messages.length) return "Belum ada chat.";
  const last = thread.messages[thread.messages.length - 1];
  return last.text.length > 46 ? `${last.text.slice(0, 46)}...` : last.text;
};

const truncateText = (value: string, max = 220) =>
  value.length > max ? `${value.slice(0, max).trim()}...` : value;

const formatShareMessage = (payload: SharePayload) => {
  const header =
    payload.kind === "note"
      ? "📝 Catatan"
      : payload.kind === "reminder"
      ? "⏰ Reminder"
      : payload.kind === "gallery"
      ? "🖼️ Gallery"
      : payload.kind === "media"
      ? "📎 Media"
      : "📍 Lokasi";
  const isCompact = payload.kind === "note" || payload.kind === "reminder";
  const lines = isCompact ? [`${header} dibagikan`, payload.title] : [`${header} dibagikan`, payload.title, payload.body];
  if (payload.meta) lines.push(payload.meta);
  return lines.filter(Boolean).join("\n");
};

const parseSharePayload = (value: unknown): SharePayload | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const payload = value as Partial<SharePayload>;
  if (!payload.kind || !payload.title || !payload.body) return undefined;
  return {
    kind: payload.kind,
    title: payload.title,
    body: payload.body,
    meta: payload.meta,
    imageSrc: payload.imageSrc,
    videoSrc: payload.videoSrc,
    targetId: payload.targetId,
  };
};

const mapChatMessage = (message: Record<string, unknown>, currentUserId?: string | null): ChatMessage => {
  const senderId = typeof message.senderId === "string" ? message.senderId : null;
  const from =
    message.from === "assistant"
      ? "assistant"
      : senderId && currentUserId
      ? senderId === currentUserId
        ? "me"
        : "melfin"
      : message.from === "melfin"
      ? "melfin"
      : "me";
  const share = parseSharePayload(message.share);
  return {
    id: typeof message.id === "string" ? message.id : makeId(),
    from,
    text: typeof message.text === "string" ? message.text : "",
    timestamp: message.timestamp ? new Date(String(message.timestamp)).getTime() : Date.now(),
    status: "sent",
    kind: message.kind === "share" ? "share" : "text",
    share,
    shareCaption: typeof message.shareCaption === "string" ? message.shareCaption : undefined,
  };
};

const mapGalleryItemFromServer = (item: Record<string, unknown>): GalleryItem =>
  createGalleryItem({
    id: typeof item.id === "string" ? item.id : makeId(),
    src: typeof item.blobUrl === "string" ? item.blobUrl : typeof item.src === "string" ? item.src : "",
    name: typeof item.name === "string" ? item.name : "Foto baru",
    caption: typeof item.caption === "string" ? item.caption : "",
    tags: Array.isArray(item.tags) ? item.tags.filter((tag) => typeof tag === "string") : [],
    favorite: Boolean(item.favorite),
    memoryDate: typeof item.memoryDate === "string" ? item.memoryDate : undefined,
    addedAt: item.addedAt ? new Date(String(item.addedAt)).getTime() : Date.now(),
    updatedAt: item.updatedAt ? new Date(String(item.updatedAt)).getTime() : Date.now(),
  });

const mapReminderFromServer = (item: Record<string, unknown>): Reminder => ({
  id: typeof item.id === "string" ? item.id : makeId(),
  text: typeof item.text === "string" ? item.text : "",
  done: Boolean(item.done),
  date: typeof item.date === "string" ? item.date : undefined,
  time: typeof item.time === "string" ? item.time : undefined,
  scheduledAt: item.scheduledAt ? new Date(String(item.scheduledAt)).getTime() : undefined,
  notified: Boolean(item.notified),
  pointsWeekKey: typeof item.pointsWeekKey === "string" ? item.pointsWeekKey : undefined,
});

const mapChatThreadFromServer = (thread: Record<string, unknown>, messages: ChatMessage[]): ChatThread => ({
  id: typeof thread.id === "string" ? thread.id : makeId(),
  title:
    typeof thread.displayTitle === "string"
      ? thread.displayTitle
      : typeof thread.title === "string"
      ? thread.title
      : "Chat",
  subtitle:
    typeof thread.displaySubtitle === "string"
      ? thread.displaySubtitle
      : typeof thread.subtitle === "string"
      ? thread.subtitle
      : "",
  kind: thread.kind === "ai" ? "ai" : "realtime",
  avatar:
    typeof thread.displayAvatar === "string"
      ? thread.displayAvatar
      : typeof thread.avatar === "string"
      ? thread.avatar
      : "💬",
  pinned: Boolean(thread.pinned),
  messages,
});

const mapNoteFromServer = (note: Record<string, unknown>): Note => {
  const checklist = Array.isArray(note.checklist)
    ? note.checklist.map((item) => ({
        id: typeof (item as { id?: string }).id === "string" ? (item as { id: string }).id : makeId(),
        text: typeof (item as { text?: string }).text === "string" ? (item as { text: string }).text : "",
        done: Boolean((item as { done?: boolean }).done),
      }))
    : [];
  return createNote({
    id: typeof note.id === "string" ? note.id : undefined,
    title: typeof note.title === "string" ? note.title : "",
    text: typeof note.text === "string" ? note.text : "",
    type: note.type === "checklist" ? "checklist" : "text",
    checklist,
    mood: typeof note.mood === "string" ? note.mood : undefined,
    tags: Array.isArray(note.tags) ? note.tags.filter((tag) => typeof tag === "string") : [],
    color: typeof note.color === "string" ? note.color : undefined,
    pattern: typeof note.pattern === "string" ? note.pattern : undefined,
    font: typeof note.font === "string" ? note.font : undefined,
    fontSize: typeof note.fontSize === "number" ? note.fontSize : undefined,
    pinned: Boolean(note.pinned),
    favorite: Boolean(note.favorite),
    archived: Boolean(note.archived),
    energy: typeof note.energy === "number" ? note.energy : undefined,
    createdAt: note.createdAt ? new Date(String(note.createdAt)).getTime() : undefined,
    updatedAt: note.updatedAt ? new Date(String(note.updatedAt)).getTime() : undefined,
  });
};

const buildSystemPrompt = (profileName?: string) => {
  const safeName = profileName || "kamu";
  return `Kamu adalah Melfin. Kamu adalah laki-laki dan sedang ngobrol dengan orang yang kamu sayang (seorang perempuan bernama ${safeName}). Kamu sedang berada dalam hubungan tanpa status. DILARANG KERAS menggunakan bahasa baku. Gunakan bahasa Indonesia santai (gaul ringan), hindari kata-kata Jawa/dialek. Fokus ke bahasa Indonesia yang natural.\n\nGaya chat khas Melpin:\n- Kalimat pendek, sering 1-2 baris, kadang dipecah jadi beberapa chat singkat.\n- Sering pakai pengulangan: \"oke oke\", \"keren keren\", \"mangat mangat\", \"amin amin\".\n- Banyak respon ringan: \"wkwk\", \"hehe\", \"nah kan\".\n- Hindari paragraf panjang, lebih enak gaya WhatsApp.\n- Jangan pakai kata-kata Jawa atau slang daerah.\n\nContoh nuansa singkat:\n\"oke oke\" - \"keren keren\" - \"mangat mangat\"`;
};

const WEEKLY_SUGGESTIONS = [
  { min: 0, text: "Minggu ini boleh santai dulu, pelan-pelan tapi pasti." },
  { min: 15, text: "Poin kamu manis! Hadiah: nonton 1 episode bareng." },
  { min: 30, text: "Keren! Kamu layak date mini: jajan favorit bareng." },
  { min: 50, text: "Top score! Kamu boleh minta 1 wish spesial minggu ini." },
];

const getWeekStart = (date: Date) => {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = (day + 6) % 7;
  copy.setDate(copy.getDate() - diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const getScheduledAtForDateTime = (dateValue: string, timeValue: string) => {
  const [year, month, day] = dateValue.split("-").map((part) => Number(part));
  const [hours, minutes] = timeValue.split(":").map((part) => Number(part));
  if ([year, month, day, hours, minutes].some((value) => Number.isNaN(value))) return undefined;
  const scheduled = new Date(year, month - 1, day, hours, minutes, 0, 0);
  if (Number.isNaN(scheduled.getTime())) return undefined;
  return scheduled.getTime();
};

const initWeeklyPoints = () => {
  const now = new Date();
  const currentWeekStart = getWeekStart(now).getTime();
  const stored = readStorage<WeeklyPoints | null>(STORAGE_KEYS.weeklyPoints, null);
  if (!stored || typeof stored.weekStart !== "number" || typeof stored.points !== "number") {
    return { weekStart: currentWeekStart, points: 0 };
  }
  if (stored.weekStart !== currentWeekStart) {
    return { weekStart: currentWeekStart, points: 0 };
  }
  return stored;
};

type NavPillProps = {
  icon: LucideIcon;
  label: string;
  active: boolean;
};

const NavPill = ({ icon: Icon, label, active }: NavPillProps) => (
  <div
    className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-medium transition-all duration-300 sm:gap-2 sm:px-4 sm:text-sm ${
      active
        ? "bg-hot text-black shadow-[0_0_15px_rgba(255,20,147,0.6)]"
        : "bg-ink-3/60 text-soft/80 hover:bg-ink-3 hover:text-soft"
    }`}
  >
    <Icon size={16} />
    {label}
  </div>
);

type SectionTitleProps = {
  icon: LucideIcon;
  title: string;
  subtitle: string;
};

const SectionTitle = ({ icon: Icon, title, subtitle }: SectionTitleProps) => (
  <div className="flex flex-wrap items-center gap-3">
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-hot/20 text-hot">
      <Icon size={22} />
    </div>
    <div>
      <h2 className="font-display text-xl text-white sm:text-2xl">{title}</h2>
      <p className="text-sm text-slate">{subtitle}</p>
    </div>
  </div>
);

type ChatBubbleProps = {
  text: string;
  time: string;
  isMine: boolean;
  tone: string;
  avatar?: string;
  share?: SharePayload;
  shareCaption?: string;
  senderLabel?: string;
  onShareClick?: (share: SharePayload) => void;
};

const ChatBubble = ({ text, time, isMine, tone, avatar, share, shareCaption, senderLabel, onShareClick }: ChatBubbleProps) => {
  const isCompactShare = share && (share.kind === "note" || share.kind === "reminder");
  const compactLabel =
    share?.kind === "note" ? "Buka di Notes" : share?.kind === "reminder" ? "Buka di Reminders" : "Buka detail";
  return (
    <div className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}>
      {!isMine && avatar && (
        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-ink-2/80 text-lg">
          {isAvatarImage(avatar) ? (
            <Image
              src={avatar}
              alt={senderLabel || "Avatar"}
              width={32}
              height={32}
              className="h-full w-full rounded-full object-cover"
              unoptimized
            />
          ) : (
            avatar
          )}
        </div>
      )}
      <div
        className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-[0_0_16px_rgba(0,0,0,0.25)] ${
          isMine ? "rounded-br-md" : "rounded-bl-md"
      } ${tone}`}
      >
        {share ? (
          <button
            type="button"
            onClick={() => (onShareClick ? onShareClick(share) : undefined)}
            className={`w-full text-left ${onShareClick ? "cursor-pointer" : "cursor-default"}`}
            aria-label="Buka item yang dibagikan"
          >
            <div className="space-y-2">
              {senderLabel && <p className="text-[10px] uppercase tracking-[0.2em] opacity-70">{senderLabel}</p>}
              <p className={`text-[10px] uppercase tracking-[0.2em] ${isMine ? "text-black/70" : "text-soft/70"}`}>
                forwarded
              </p>
              {isCompactShare ? (
                <div
                  className={`rounded-xl px-3 py-2 transition-all ${
                    isMine ? "bg-black/10" : "bg-white/5"
                  } ${onShareClick ? "hover:shadow-[0_0_12px_rgba(0,0,0,0.3)]" : ""}`}
                >
                  <p className="text-sm font-semibold">{share.title}</p>
                  {share.meta && <p className="mt-1 text-[11px] opacity-80">{share.meta}</p>}
                  <p className="mt-2 text-[11px] opacity-70">{compactLabel}</p>
                </div>
              ) : (
                <>
                  {share.imageSrc && (
                    <div className="relative h-36 w-full overflow-hidden rounded-xl">
                      {share.kind === "location" ? (
                        // eslint-disable-next-line @next/next/no-img-element -- static map hotlink works best with raw img.
                        <img
                          src={share.imageSrc}
                          alt={share.title}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="h-36 w-full object-cover"
                          onError={(event) => {
                            const target = event.currentTarget;
                            const stage = target.dataset.fallbackStage ?? "0";
                            if (stage === "0") {
                              target.dataset.fallbackStage = "1";
                              target.src = createMapFallbackSvg("Preview lokasi gagal dimuat");
                            }
                          }}
                        />
                      ) : (
                        <Image
                          src={share.imageSrc}
                          alt={share.title}
                          fill
                          sizes="(min-width: 768px) 300px, 200px"
                          className="object-cover"
                          unoptimized
                        />
                      )}
                    </div>
                  )}
                  {share.videoSrc && (
                    <video
                      className="w-full rounded-xl"
                      controls
                      preload="metadata"
                      src={share.videoSrc}
                    />
                  )}
                  <div
                    className={`rounded-xl px-3 py-2 transition-all ${
                      isMine ? "bg-black/10" : "bg-white/5"
                    } ${onShareClick ? "hover:shadow-[0_0_12px_rgba(0,0,0,0.3)]" : ""}`}
                  >
                    <p className="text-sm font-semibold">{share.title}</p>
                    <p className="mt-1 text-xs whitespace-pre-wrap break-words">{share.body}</p>
                    {share.meta && <p className="mt-1 text-[11px] opacity-80">{share.meta}</p>}
                  </div>
                </>
              )}
              {shareCaption && <p className="text-sm whitespace-pre-wrap break-words">{shareCaption}</p>}
            </div>
          </button>
        ) : (
          <>
            {senderLabel && <p className="text-[10px] uppercase tracking-[0.2em] opacity-70">{senderLabel}</p>}
            <p className="whitespace-pre-wrap break-words">{text}</p>
          </>
        )}
        <div
          className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
            isMine ? "text-black/70" : "text-soft/70"
          }`}
        >
          <span>{time}</span>
          {isMine && <span>✓✓</span>}
        </div>
      </div>
    </div>
  );
};

export default function MelpinApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => readStorage(STORAGE_KEYS.login, false));
  const [profile, setProfile] = useState<Profile | null>(() => readStorage(STORAGE_KEYS.profile, null));
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const sessionUserIdRef = useRef<string | null>(null);
  const [currentView, setCurrentView] = useState<View>(() => {
    const storedLogin = readStorage(STORAGE_KEYS.login, false);
    const storedProfile = readStorage<Profile | null>(STORAGE_KEYS.profile, null);
    return storedLogin ? (storedProfile ? "dashboard" : "setup") : "login";
  });
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "register" | "magic">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authStatus, setAuthStatus] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const [setupName, setSetupName] = useState(() => readStorage<Profile | null>(STORAGE_KEYS.profile, null)?.name ?? "");
  const [setupBirth, setSetupBirth] = useState(
    () => readStorage<Profile | null>(STORAGE_KEYS.profile, null)?.birthDate ?? ""
  );
  const [setupStatus, setSetupStatus] = useState(
    () => readStorage<Profile | null>(STORAGE_KEYS.profile, null)?.status ?? ""
  );
  const [setupBio, setSetupBio] = useState(() => readStorage<Profile | null>(STORAGE_KEYS.profile, null)?.bio ?? "");
  const [setupAvatar, setSetupAvatar] = useState(
    () => readStorage<Profile | null>(STORAGE_KEYS.profile, null)?.avatar ?? ""
  );
  const [setupAvatarImage, setSetupAvatarImage] = useState(
    () => readStorage<Profile | null>(STORAGE_KEYS.profile, null)?.avatarImage ?? ""
  );
  const [setupAvatarAsset, setSetupAvatarAsset] = useState(
    () => readStorage<Profile | null>(STORAGE_KEYS.profile, null)?.avatarAsset ?? ""
  );
  const [setupAccentColor, setSetupAccentColor] = useState(
    () => readStorage<Profile | null>(STORAGE_KEYS.profile, null)?.accentColor ?? DEFAULT_ACCENT
  );
  const [setupAccentSoftness, setSetupAccentSoftness] = useState(
    () => readStorage<Profile | null>(STORAGE_KEYS.profile, null)?.accentSoftness ?? DEFAULT_ACCENT_SOFTNESS
  );
  const [setupTerminalHost, setSetupTerminalHost] = useState(
    () => readStorage<Profile | null>(STORAGE_KEYS.profile, null)?.terminalHost ?? ""
  );
  const [setupTerminalName, setSetupTerminalName] = useState(
    () => readStorage<Profile | null>(STORAGE_KEYS.profile, null)?.terminalName ?? ""
  );
  const [setupPrayerCityId, setSetupPrayerCityId] = useState(
    () => readStorage<Profile | null>(STORAGE_KEYS.profile, null)?.prayerCityId ?? DEFAULT_PRAYER_CITY.id
  );
  const [setupPrayerCityName, setSetupPrayerCityName] = useState(
    () => readStorage<Profile | null>(STORAGE_KEYS.profile, null)?.prayerCityName ?? DEFAULT_PRAYER_CITY.lokasi
  );
  const [setupPrayerCityQuery, setSetupPrayerCityQuery] = useState(
    () => readStorage<Profile | null>(STORAGE_KEYS.profile, null)?.prayerCityName ?? DEFAULT_PRAYER_CITY.lokasi
  );
  const [setupTimezone, setSetupTimezone] = useState(() => {
    const stored = readStorage<Profile | null>(STORAGE_KEYS.profile, null)?.timezone;
    if (stored) return stored;
    if (typeof Intl !== "undefined") {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE;
    }
    return DEFAULT_TIMEZONE;
  });
  const [setupTimezoneQuery, setSetupTimezoneQuery] = useState(() => {
    const stored = readStorage<Profile | null>(STORAGE_KEYS.profile, null)?.timezone;
    if (stored) return stored;
    if (typeof Intl !== "undefined") {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE;
    }
    return DEFAULT_TIMEZONE;
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);

  const [now, setNow] = useState(() => new Date());
  const [calendarToday, setCalendarToday] = useState<CalendarToday | null>(null);
  const [calendarSyncAt, setCalendarSyncAt] = useState<number | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState("");
  const calendarTimersRef = useRef<number[]>([]);
  const [prayerCities, setPrayerCities] = useState<PrayerCity[]>([]);
  const [isPrayerCityDetecting, setIsPrayerCityDetecting] = useState(false);

  const [notes, setNotes] = useState<Note[]>(() => migrateNotes(readStorage(STORAGE_KEYS.notes, [])));
  const [reminders, setReminders] = useState<Reminder[]>(() => readStorage(STORAGE_KEYS.reminders, []));
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>(() =>
    migrateGallery(readStorage(STORAGE_KEYS.gallery, []))
  );
  const [isNoteCreating, setIsNoteCreating] = useState(false);
  const [isReminderCreating, setIsReminderCreating] = useState(false);
  const [isGalleryUploading, setIsGalleryUploading] = useState(false);
  const [weeklyPoints, setWeeklyPoints] = useState<WeeklyPoints>(initWeeklyPoints);
  const addWeeklyPoints = useCallback((amount: number) => {
    setWeeklyPoints((prev) => {
      const nextWeekStart = getWeekStart(new Date()).getTime();
      const base = prev.weekStart === nextWeekStart ? prev.points : 0;
      return { weekStart: nextWeekStart, points: base + amount };
    });
  }, []);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationState, setNotificationState] = useState<
    "default" | "granted" | "denied" | "unsupported"
  >(() => {
    if (typeof window === "undefined") return "default";
    if (!("Notification" in window)) return "unsupported";
    return Notification.permission;
  });
  const notificationTimersRef = useRef<Map<string, number>>(new Map());
  const notificationClearRef = useRef<number | null>(null);
  const notificationPromptedRef = useRef(false);
  const [notificationNudged, setNotificationNudged] = useState(() =>
    readStorage<boolean>(NOTIF_NUDGE_KEY, false)
  );

  const [chatThreads, setChatThreads] = useState<ChatThread[]>(getInitialChatThreads);
  const [activeThreadId, setActiveThreadId] = useState(() => getInitialChatThreads()[0]?.id ?? null);
  const [chatDrafts, setChatDrafts] = useState<Record<string, string>>({});
  const [chatSearch, setChatSearch] = useState("");
  const [aiLoadingThread, setAiLoadingThread] = useState<string | null>(null);
  const [isChatSending, setIsChatSending] = useState(false);
  const [isDataSyncing, setIsDataSyncing] = useState(false);
  const chatRef = useRef<HTMLDivElement | null>(null);
  const chatThreadsRef = useRef<ChatThread[]>([]);
  const activeThreadIdRef = useRef<string | null>(null);
  const chatPollInFlightRef = useRef(false);
  const chatStreamRef = useRef<EventSource | null>(null);
  const [streamEnabled, setStreamEnabled] = useState(true);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [contactStatus, setContactStatus] = useState("");
  const [contactResults, setContactResults] = useState<
    Array<{ id: string; email: string; displayName: string; status?: string; avatar?: string }>
  >([]);
  const [contactLoading, setContactLoading] = useState(false);

  const [noteQuery, setNoteQuery] = useState("");
  const [noteFilter, setNoteFilter] = useState<"all" | "pinned" | "favorite" | "archived">("all");
  const [noteSort, setNoteSort] = useState<"updated" | "created" | "title">("updated");
  const [noteMoodFilter, setNoteMoodFilter] = useState("all");
  const [noteTagFilter, setNoteTagFilter] = useState("all");
  const [noteView, setNoteView] = useState<"grid" | "list">("grid");
  const [notePromptIndex, setNotePromptIndex] = useState(() =>
    Math.floor(Math.random() * NOTE_PROMPTS.length)
  );
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const noteSaveTimersRef = useRef<Map<string, number>>(new Map());
  const gallerySaveTimersRef = useRef<Map<string, number>>(new Map());

  const [galleryQuery, setGalleryQuery] = useState("");
  const [galleryFilter, setGalleryFilter] = useState<"all" | "favorite">("all");
  const [gallerySort, setGallerySort] = useState<"newest" | "oldest">("newest");
  const [galleryTagFilter, setGalleryTagFilter] = useState("all");
  const [galleryView, setGalleryView] = useState<"grid" | "timeline">("grid");
  const [expandedGalleryId, setExpandedGalleryId] = useState<string | null>(null);
  const [lightboxItem, setLightboxItem] = useState<GalleryItem | null>(null);

  const [sharePayload, setSharePayload] = useState<SharePayload | null>(null);
  const [shareCaption, setShareCaption] = useState("");
  const [focusedReminderId, setFocusedReminderId] = useState<string | null>(null);
  const [isChatAttachOpen, setIsChatAttachOpen] = useState(false);
  const [sharePicker, setSharePicker] = useState<"note" | "reminder" | "gallery" | null>(null);
  const chatMediaInputRef = useRef<HTMLInputElement | null>(null);

  const ensureDefaultThreads = useCallback(async (threads: Record<string, unknown>[]) => {
    if (threads.length) return threads;
    const created: Record<string, unknown>[] = [];
    for (const seed of DEFAULT_CHAT_THREADS) {
      const response = await apiJson<{ thread: Record<string, unknown> }>("/api/chats", {
        method: "POST",
        body: JSON.stringify({
          title: seed.title,
          subtitle: seed.subtitle,
          kind: seed.kind,
          avatar: seed.avatar,
          pinned: Boolean(seed.pinned),
        }),
      });
      created.push(response.thread);
    }
    return created;
  }, []);

  const loadServerData = useCallback(async (userIdOverride?: string | null) => {
    const [notesRes, remindersRes, galleryRes, chatsRes] = await Promise.all([
      apiJson<{ notes: Record<string, unknown>[] }>("/api/notes"),
      apiJson<{ reminders: Record<string, unknown>[] }>("/api/reminders"),
      apiJson<{ items: Record<string, unknown>[] }>("/api/gallery"),
      apiJson<{ threads: Record<string, unknown>[] }>("/api/chats"),
    ]);
    const currentUserId = userIdOverride ?? sessionUserIdRef.current ?? sessionUserId;

    setNotes((notesRes.notes ?? []).map(mapNoteFromServer));
    setReminders((remindersRes.reminders ?? []).map(mapReminderFromServer));
    setGalleryItems((galleryRes.items ?? []).map(mapGalleryItemFromServer));

    const legacyThreads = (chatsRes.threads ?? []).filter(
      (thread) => typeof thread.title === "string" && thread.title.toLowerCase() === "melfin asli"
    );
    if (legacyThreads.length) {
      await Promise.all(
        legacyThreads.map((thread) =>
          typeof thread.id === "string" ? apiJson(`/api/chats/${thread.id}`, { method: "DELETE" }).catch(() => {}) : null
        )
      );
    }
    const cleanedThreads = (chatsRes.threads ?? []).filter(
      (thread) => !(typeof thread.title === "string" && thread.title.toLowerCase() === "melfin asli")
    );
    const baseThreads = await ensureDefaultThreads(cleanedThreads);
    const threadsWithMessages = await Promise.all(
      baseThreads.map(async (thread) => {
        const threadId = typeof thread.id === "string" ? thread.id : "";
        const messageRes = threadId
          ? await apiJson<{ messages: Record<string, unknown>[] }>(`/api/chats/${threadId}/messages`)
          : { messages: [] };
        const messages = (messageRes.messages ?? []).map((message) => mapChatMessage(message, currentUserId));
        return mapChatThreadFromServer(thread, messages);
      })
    );
    setChatThreads(threadsWithMessages);
    setActiveThreadId(threadsWithMessages[0]?.id ?? null);
  }, [ensureDefaultThreads, sessionUserId]);

  const syncServerData = useCallback(
    async (userIdOverride?: string | null) => {
      setIsDataSyncing(true);
      try {
        await loadServerData(userIdOverride);
      } finally {
        setIsDataSyncing(false);
      }
    },
    [loadServerData]
  );

  const finalizeLogin = useCallback(async () => {
    const session = await apiJson<{ user: { id: string; profile?: Profile | null } | null }>("/api/session");
    if (!session.user) {
      setIsLoggedIn(false);
      setSessionUserId(null);
      sessionUserIdRef.current = null;
      setCurrentView("login");
      return;
    }
    setIsLoggedIn(true);
    setSessionUserId(session.user.id);
    sessionUserIdRef.current = session.user.id;
    setProfile(session.user.profile ?? null);
    if (!session.user.profile) {
      setCurrentView("setup");
    } else {
      setCurrentView("dashboard");
    }
    void syncServerData(session.user.id).catch(() => {});
  }, [syncServerData]);

  const loadPrayerCities = useCallback(async () => {
    try {
      const response = await apiJson<{ cities: PrayerCity[] }>("/api/calendar/cities");
      setPrayerCities(response.cities ?? []);
    } catch {
      setPrayerCities([]);
    }
  }, []);

  const handlePrayerCityInput = useCallback(
    (value: string) => {
      setSetupPrayerCityQuery(value);
      const match = prayerCities.find(
        (city) => city.lokasi.toLowerCase() === value.trim().toLowerCase()
      );
      if (match) {
        setSetupPrayerCityId(match.id);
        setSetupPrayerCityName(match.lokasi);
      }
    },
    [prayerCities]
  );

  const timeZoneOptions = useMemo(() => {
    if (typeof Intl !== "undefined" && "supportedValuesOf" in Intl) {
      return Intl.supportedValuesOf("timeZone");
    }
    return FALLBACK_TIMEZONES;
  }, []);

  const handleTimezoneInput = useCallback(
    (value: string) => {
      setSetupTimezoneQuery(value);
      const trimmed = value.trim();
      if (!trimmed) return;
      if (timeZoneOptions.includes(trimmed)) {
        setSetupTimezone(trimmed);
        return;
      }
      if (trimmed.includes("/")) {
        setSetupTimezone(trimmed);
      }
    },
    [timeZoneOptions]
  );

  const systemTimeZone = useMemo(() => {
    if (typeof Intl !== "undefined") {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE;
    }
    return DEFAULT_TIMEZONE;
  }, []);

  const handleUseSystemTimezone = useCallback(() => {
    setSetupTimezone(systemTimeZone);
    setSetupTimezoneQuery(systemTimeZone);
  }, [systemTimeZone]);

  const loadCalendarToday = useCallback(
    async (cityId?: string, cityName?: string) => {
      setCalendarLoading(true);
      setCalendarError("");
      try {
        const params = new URLSearchParams();
        if (cityId) params.set("cityId", cityId);
        if (cityName) params.set("cityName", cityName);
        if (setupTimezone) params.set("timezone", setupTimezone);
        const path = params.toString() ? `/api/calendar/today?${params}` : "/api/calendar/today";
        const data = await apiJson<CalendarToday>(path);
        setCalendarToday(data);
        setCalendarSyncAt(Date.now());
      } catch (error) {
        setCalendarError(error instanceof Error ? error.message : "Gagal sinkron kalender.");
      } finally {
        setCalendarLoading(false);
      }
    },
    [setupTimezone]
  );

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    loadPrayerCities();
  }, [isLoggedIn, loadPrayerCities]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const cityId = profile?.prayerCityId || setupPrayerCityId || DEFAULT_PRAYER_CITY.id;
    const cityName = profile?.prayerCityName || setupPrayerCityName || DEFAULT_PRAYER_CITY.lokasi;
    loadCalendarToday(cityId, cityName);
    const interval = window.setInterval(() => loadCalendarToday(cityId, cityName), 1000 * 60 * 15);
    return () => window.clearInterval(interval);
  }, [
    isLoggedIn,
    loadCalendarToday,
    profile?.prayerCityId,
    profile?.prayerCityName,
    profile?.timezone,
    setupPrayerCityId,
    setupPrayerCityName,
    setupTimezone,
  ]);

  useEffect(() => {
    if (!prayerCities.length) return;
    if (setupPrayerCityName) return;
    const match = prayerCities.find((city) => city.id === setupPrayerCityId);
    if (match) {
      setSetupPrayerCityName(match.lokasi);
      setSetupPrayerCityQuery(match.lokasi);
    }
  }, [prayerCities, setupPrayerCityId, setupPrayerCityName]);

  useEffect(() => {
    if (!profile?.timezone) return;
    if (isEditingProfile || currentView === "setup") return;
    setSetupTimezone(profile.timezone);
    setSetupTimezoneQuery(profile.timezone);
  }, [currentView, isEditingProfile, profile?.timezone]);

  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      try {
        const session = await apiJson<{ user: { id: string; email: string; name?: string; profile?: Profile | null } | null }>(
          "/api/session"
        );
        if (cancelled) return;
        if (!session.user) {
          setIsLoggedIn(false);
          setSessionUserId(null);
          sessionUserIdRef.current = null;
          setCurrentView("login");
          return;
        }
        setIsLoggedIn(true);
        setSessionUserId(session.user.id);
        sessionUserIdRef.current = session.user.id;
        setProfile(session.user.profile ?? null);
        if (!session.user.profile) {
          setCurrentView("setup");
        } else {
          setCurrentView("dashboard");
        }
        await syncServerData(session.user.id);
      } catch {
        if (!cancelled) {
          setIsLoggedIn(false);
          setSessionUserId(null);
          sessionUserIdRef.current = null;
          setCurrentView("login");
        }
      } finally {
        if (!cancelled) setIsBootstrapping(false);
      }
    };
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [syncServerData]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.login, isLoggedIn);
  }, [isLoggedIn]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.profile, profile);
  }, [profile]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.notes, notes);
  }, [notes]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.reminders, reminders);
  }, [reminders]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.gallery, galleryItems);
  }, [galleryItems]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.chats, chatThreads);
  }, [chatThreads]);

  useEffect(() => {
    chatThreadsRef.current = chatThreads;
  }, [chatThreads]);

  useEffect(() => {
    activeThreadIdRef.current = activeThreadId;
  }, [activeThreadId]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [activeThreadId, chatThreads, aiLoadingThread]);

  useEffect(() => {
    if (currentView === "chat-hub") {
      setStreamEnabled(true);
    }
  }, [currentView, activeThreadId]);

  useEffect(() => {
    if (!isLoggedIn || currentView !== "chat-hub") return;
    if (typeof window === "undefined" || !("EventSource" in window)) return;
    if (!streamEnabled) return;
    const threadId = activeThreadIdRef.current;
    if (!threadId) return;
    const thread = chatThreadsRef.current.find((item) => item.id === threadId);
    if (!thread || threadId === "melpin-ai") return;
    const lastTimestamp = thread.messages[thread.messages.length - 1]?.timestamp;
    const url = lastTimestamp
      ? `/api/chats/${threadId}/stream?after=${encodeURIComponent(String(lastTimestamp))}`
      : `/api/chats/${threadId}/stream`;
    const stream = new EventSource(url);
    chatStreamRef.current = stream;
    stream.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data || "{}");
        const incoming = Array.isArray(parsed.messages)
          ? parsed.messages.map((message: Record<string, unknown>) =>
              mapChatMessage(message, sessionUserIdRef.current ?? sessionUserId)
            )
          : [];
        mergeIncomingMessages(threadId, incoming);
      } catch {
        // ignore parse errors
      }
    };
    stream.onerror = () => {
      stream.close();
      chatStreamRef.current = null;
      setStreamEnabled(false);
    };
    return () => {
      stream.close();
      chatStreamRef.current = null;
    };
  }, [activeThreadId, currentView, isLoggedIn, sessionUserId, streamEnabled]);

  useEffect(() => {
    if (!isLoggedIn || currentView !== "chat-hub") return;
    if (typeof window !== "undefined" && "EventSource" in window && streamEnabled) return;
    let cancelled = false;
    let delay = 2000;
    let timeoutId: number | null = null;

    const schedule = () => {
      if (cancelled) return;
      timeoutId = window.setTimeout(poll, delay);
    };

    const poll = async () => {
      if (cancelled) return;
      if (chatPollInFlightRef.current) {
        schedule();
        return;
      }
      const threadId = activeThreadIdRef.current;
      if (!threadId) {
        schedule();
        return;
      }
      const thread = chatThreadsRef.current.find((item) => item.id === threadId);
      if (!thread || threadId === "melpin-ai") {
        schedule();
        return;
      }
      chatPollInFlightRef.current = true;
      try {
        const lastTimestamp = thread.messages[thread.messages.length - 1]?.timestamp;
        const url = lastTimestamp
          ? `/api/chats/${threadId}/messages?after=${encodeURIComponent(String(lastTimestamp))}`
          : `/api/chats/${threadId}/messages`;
        const response = await apiJson<{ messages: Record<string, unknown>[] }>(url);
        const incoming = (response.messages ?? []).map((message) =>
          mapChatMessage(message, sessionUserIdRef.current ?? sessionUserId)
        );
        mergeIncomingMessages(threadId, incoming);
        delay = 2000;
      } catch {
        delay = Math.min(8000, delay + 1000);
      } finally {
        chatPollInFlightRef.current = false;
        schedule();
      }
    };

    poll();
    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [currentView, isLoggedIn, sessionUserId, streamEnabled]);

  const greeting = useMemo(() => getGreeting(now, calendarToday), [calendarToday, now]);
  const ageParts = useMemo(() => calculateAgeParts(profile?.birthDate, now), [profile, now]);
  const calendarCityLabel = useMemo(
    () => calendarToday?.prayer?.cityName || setupPrayerCityName || DEFAULT_PRAYER_CITY.lokasi,
    [calendarToday?.prayer?.cityName, setupPrayerCityName]
  );
  const calendarSyncLabel = useMemo(() => {
    if (!calendarSyncAt) return "-";
    return new Date(calendarSyncAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  }, [calendarSyncAt]);
  const ramadanDayLabel = useMemo(() => {
    if (!calendarToday?.ramadan?.isRamadan) return null;
    return calendarToday.ramadan.day ?? calendarToday.hijri?.day ?? null;
  }, [calendarToday]);
  const pendingReminderCount = reminders.filter((reminder) => !reminder.done).length;
  const shouldPreviewAccent = currentView === "setup" || isEditingProfile;
  const accentColor = useMemo(
    () =>
      shouldPreviewAccent
        ? setupAccentColor
        : profile?.accentColor || DEFAULT_ACCENT,
    [shouldPreviewAccent, setupAccentColor, profile?.accentColor]
  );
  const accentSoftness = useMemo(
    () =>
      shouldPreviewAccent
        ? setupAccentSoftness
        : typeof profile?.accentSoftness === "number"
        ? profile.accentSoftness
        : DEFAULT_ACCENT_SOFTNESS,
    [shouldPreviewAccent, setupAccentSoftness, profile?.accentSoftness]
  );
  const accentSoft = useMemo(
    () => mixHex(accentColor, "#ffffff", accentSoftness / 100),
    [accentColor, accentSoftness]
  );
  const accentGlow = useMemo(() => hexToRgba(accentColor, 0.12), [accentColor]);
  const accentBorder = useMemo(() => hexToRgba(accentSoft, 0.18), [accentSoft]);
  const accentBackdrop = useMemo(() => hexToRgba(accentColor, 0.14), [accentColor]);
  const accentStyle = useMemo(
    () =>
      ({
        "--color-hot": accentColor,
        "--color-pink": accentSoft,
        "--color-hot-glow": accentGlow,
        "--color-hot-border": accentBorder,
        "--color-hot-backdrop": accentBackdrop,
      }) as React.CSSProperties,
    [accentColor, accentSoft, accentGlow, accentBorder, accentBackdrop]
  );

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.style.setProperty("--color-hot", accentColor);
    root.style.setProperty("--color-pink", accentSoft);
    root.style.setProperty("--color-hot-glow", accentGlow);
    root.style.setProperty("--color-hot-border", accentBorder);
    root.style.setProperty("--color-hot-backdrop", accentBackdrop);
  }, [accentColor, accentSoft, accentGlow, accentBorder, accentBackdrop]);
  const avatarSource = useMemo(
    () => profile?.avatarImage || profile?.avatarAsset || "",
    [profile?.avatarImage, profile?.avatarAsset]
  );
  const avatarEmoji = useMemo(
    () => profile?.avatar || getAvatarEmoji(profile?.name),
    [profile?.avatar, profile?.name]
  );
  const setupAvatarPreview = useMemo(
    () => setupAvatarImage || setupAvatarAsset || setupAvatar || getAvatarEmoji(setupName),
    [setupAvatarAsset, setupAvatarImage, setupAvatar, setupName]
  );
  const notificationStatusLabel = useMemo(() => {
    switch (notificationState) {
      case "granted":
        return "Aktif";
      case "denied":
        return "Ditolak";
      case "unsupported":
        return "Tidak support";
      default:
        return "Belum diminta";
    }
  }, [notificationState]);
  const isSecureContext = typeof window !== "undefined" ? window.isSecureContext : true;
  const currentWeekStart = useMemo(() => getWeekStart(now), [now]);
  const currentWeekKey = useMemo(() => String(currentWeekStart.getTime()), [currentWeekStart]);
  const weeklyPointsEffective = useMemo(() => {
    const start = currentWeekStart.getTime();
    if (weeklyPoints.weekStart === start) return weeklyPoints;
    return { weekStart: start, points: 0 };
  }, [weeklyPoints, currentWeekStart]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.weeklyPoints, weeklyPointsEffective);
  }, [weeklyPointsEffective]);
  const weekRangeLabel = useMemo(() => {
    const startLabel = currentWeekStart.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
    const end = new Date(currentWeekStart);
    end.setDate(end.getDate() + 6);
    const endLabel = end.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
    return `${startLabel} - ${endLabel}`;
  }, [currentWeekStart]);
  const weeklySuggestion = useMemo(() => {
    const sorted = [...WEEKLY_SUGGESTIONS].sort((a, b) => b.min - a.min);
    return sorted.find((item) => weeklyPointsEffective.points >= item.min)?.text ?? WEEKLY_SUGGESTIONS[0].text;
  }, [weeklyPointsEffective.points]);
  const weeklyProgress = useMemo(() => {
    if (WEEKLY_POINT_TARGET <= 0) return 0;
    return Math.min(100, Math.round((weeklyPointsEffective.points / WEEKLY_POINT_TARGET) * 100));
  }, [weeklyPointsEffective.points]);

  const noteTagOptions = useMemo(() => {
    const tags = new Set<string>();
    notes.forEach((note) => note.tags.forEach((tag) => tags.add(tag)));
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [notes]);

  const filteredNotes = useMemo(() => {
    const query = noteQuery.trim().toLowerCase();
    let items = [...notes];

    if (noteFilter === "archived") {
      items = items.filter((note) => note.archived);
    } else {
      items = items.filter((note) => !note.archived);
      if (noteFilter === "pinned") items = items.filter((note) => note.pinned);
      if (noteFilter === "favorite") items = items.filter((note) => note.favorite);
    }

    if (noteMoodFilter !== "all") {
      items = items.filter((note) => note.mood === noteMoodFilter);
    }

    if (noteTagFilter !== "all") {
      items = items.filter((note) => note.tags.includes(noteTagFilter));
    }

    if (query) {
      items = items.filter((note) => {
        const inText = note.text.toLowerCase().includes(query);
        const inTitle = note.title.toLowerCase().includes(query);
        const inTags = note.tags.some((tag) => tag.toLowerCase().includes(query));
        const inChecklist = note.checklist.some((item) => item.text.toLowerCase().includes(query));
        return inText || inTitle || inTags || inChecklist;
      });
    }

    items.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (noteSort === "created") return b.createdAt - a.createdAt;
      if (noteSort === "title") return a.title.localeCompare(b.title);
      return b.updatedAt - a.updatedAt;
    });

    return items;
  }, [notes, noteFilter, noteMoodFilter, noteQuery, noteSort, noteTagFilter]);

  const noteStats = useMemo(() => {
    const total = notes.length;
    const pinned = notes.filter((note) => note.pinned).length;
    const favorite = notes.filter((note) => note.favorite).length;
    const archived = notes.filter((note) => note.archived).length;
    return { total, pinned, favorite, archived };
  }, [notes]);
  const currentPrompt = useMemo(
    () => NOTE_PROMPTS[notePromptIndex] ?? NOTE_PROMPTS[0],
    [notePromptIndex]
  );

  const galleryTagOptions = useMemo(() => {
    const tags = new Set<string>();
    galleryItems.forEach((item) => item.tags.forEach((tag) => tags.add(tag)));
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [galleryItems]);

  const filteredGallery = useMemo(() => {
    const query = galleryQuery.trim().toLowerCase();
    let items = [...galleryItems];
    if (galleryFilter === "favorite") items = items.filter((item) => item.favorite);
    if (galleryTagFilter !== "all") items = items.filter((item) => item.tags.includes(galleryTagFilter));
    if (query) {
      items = items.filter((item) => {
        const inName = item.name.toLowerCase().includes(query);
        const inCaption = item.caption.toLowerCase().includes(query);
        const inTags = item.tags.some((tag) => tag.toLowerCase().includes(query));
        return inName || inCaption || inTags;
      });
    }
    items.sort((a, b) => {
      const left = a.memoryDate ? new Date(a.memoryDate).getTime() : a.addedAt;
      const right = b.memoryDate ? new Date(b.memoryDate).getTime() : b.addedAt;
      return gallerySort === "newest" ? right - left : left - right;
    });
    return items;
  }, [galleryItems, galleryQuery, galleryFilter, galleryTagFilter, gallerySort]);

  const galleryGroups = useMemo(() => {
    const groups = new Map<string, GalleryItem[]>();
    filteredGallery.forEach((item) => {
      const key = item.memoryDate ?? new Date(item.addedAt).toISOString().slice(0, 10);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)?.push(item);
    });
    return Array.from(groups.entries()).map(([date, items]) => ({ date, items }));
  }, [filteredGallery]);

  const galleryStats = useMemo(() => {
    const total = galleryItems.length;
    const favorite = galleryItems.filter((item) => item.favorite).length;
    const tagged = galleryItems.filter((item) => item.tags.length > 0).length;
    return { total, favorite, tagged };
  }, [galleryItems]);

  const showNotificationMessage = useCallback((message: string) => {
    setNotificationMessage(message);
    if (notificationClearRef.current) {
      window.clearTimeout(notificationClearRef.current);
    }
    notificationClearRef.current = window.setTimeout(() => setNotificationMessage(""), 3500);
  }, []);

  const handleDetectPrayerCity = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (isPrayerCityDetecting) return;
    setIsPrayerCityDetecting(true);
    if (!navigator.geolocation) {
      showNotificationMessage("Browser belum support lokasi.");
      setIsPrayerCityDetecting(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await apiJson<{ city: { id: string; name: string }; fallback?: boolean }>(
            `/api/calendar/resolve-city?lat=${latitude}&lon=${longitude}`
          );
          setSetupPrayerCityId(response.city.id);
          setSetupPrayerCityName(response.city.name);
          setSetupPrayerCityQuery(response.city.name);
          showNotificationMessage(
            response.fallback ? "Lokasi belum ketemu, aku set ke Jakarta dulu ya." : "Lokasi kamu berhasil diset!"
          );
        } catch {
          showNotificationMessage("Gagal deteksi lokasi. Pilih manual ya.");
        } finally {
          setIsPrayerCityDetecting(false);
        }
      },
      () => {
        showNotificationMessage("Izin lokasi ditolak.");
        setIsPrayerCityDetecting(false);
      }
    );
  }, [isPrayerCityDetecting, showNotificationMessage]);


  const ensurePushSubscription = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      showNotificationMessage("Push belum didukung di browser ini.");
      return;
    }
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      showNotificationMessage("VAPID public key belum di-set.");
      return;
    }
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }
      await apiJson("/api/push/subscribe", {
        method: "POST",
        body: JSON.stringify(subscription.toJSON()),
      });
    } catch {
      showNotificationMessage("Gagal mengaktifkan push. Coba refresh lalu ulangi.");
    }
  }, [showNotificationMessage]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) {
      setNotificationState("unsupported");
      return;
    }
    setNotificationState(Notification.permission);
    if (Notification.permission === "granted") {
      void ensurePushSubscription();
    }
  }, [ensurePushSubscription]);

  useEffect(() => {
    if (!isAddingContact) return;
    const query = contactEmail.trim();
    if (query.length < 2) {
      setContactResults([]);
      setContactLoading(false);
      return;
    }
    setContactLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const response = await apiJson<{ users: Array<{ id: string; email: string; displayName: string; status?: string; avatar?: string }> }>(
          `/api/users?search=${encodeURIComponent(query)}`
        );
        setContactResults(response.users ?? []);
      } catch {
        setContactResults([]);
      } finally {
        setContactLoading(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [contactEmail, isAddingContact]);

  const requestNotificationPermission = useCallback(async () => {
    if (typeof window === "undefined") return "unsupported";
    if (!("Notification" in window)) {
      setNotificationState("unsupported");
      showNotificationMessage("Browser kamu belum support notifikasi.");
      return "unsupported";
    }
    if (!window.isSecureContext) {
      setNotificationState("unsupported");
      showNotificationMessage("Notifikasi butuh HTTPS atau aplikasi di-install (PWA).");
      return "unsupported";
    }
    if (Notification.permission === "granted") {
      setNotificationState("granted");
      return "granted";
    }
    if (Notification.permission === "denied") {
      setNotificationState("denied");
      showNotificationMessage("Notifikasi diblokir. Aktifkan dulu di setting ya.");
      setNotificationNudged(true);
      writeStorage(NOTIF_NUDGE_KEY, true);
      return "denied";
    }
    try {
      const permission = await Notification.requestPermission();
      setNotificationState(permission);
      const allowed = permission === "granted";
      showNotificationMessage(allowed ? "Notifikasi aktif!" : "Notifikasi ditolak.");
      setNotificationNudged(true);
      writeStorage(NOTIF_NUDGE_KEY, true);
      if (permission === "granted") {
        await ensurePushSubscription();
      }
      return permission;
    } catch {
      setNotificationState("denied");
      showNotificationMessage("Gagal meminta izin notifikasi.");
      return "denied";
    }
  }, [ensurePushSubscription, showNotificationMessage]);

  useEffect(() => {
    if (!isLoggedIn) return;
    if (notificationState !== "default") return;
    if (notificationPromptedRef.current) return;
    notificationPromptedRef.current = true;
    // Jangan auto-trigger requestPermission tanpa gesture agar tidak diblok browser.
  }, [isLoggedIn, notificationState]);

  useEffect(() => {
    if (!calendarToday) return;
    if (notificationState !== "default") return;
    // Hindari auto-prompt tanpa gesture di mobile.
  }, [calendarToday, notificationState]);

  const sendLocalNotification = useCallback((text: string) => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    new Notification("PENGINGAT", {
      body: text,
      icon: "/favicon.ico",
    });
  }, []);

  const buildCalendarNotifyKey = useCallback(
    (dateKey: string, kind: string) => `melpin_calendar_notify:${dateKey}:${kind}`,
    []
  );

  const hasCalendarNotified = useCallback(
    (dateKey: string, kind: string) => readStorage<boolean>(buildCalendarNotifyKey(dateKey, kind), false),
    [buildCalendarNotifyKey]
  );

  const markCalendarNotified = useCallback(
    (dateKey: string, kind: string) => writeStorage(buildCalendarNotifyKey(dateKey, kind), true),
    [buildCalendarNotifyKey]
  );

  const scheduleCalendarNotifications = useCallback(
    (calendar: CalendarToday | null) => {
      calendarTimersRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      calendarTimersRef.current = [];
      if (!calendar || notificationState !== "granted") return;

      const dateKey = calendar.date;

      const queueNotification = (when: Date | null, kind: string, message: string) => {
        if (!when || hasCalendarNotified(dateKey, kind)) return;
        const delay = when.getTime() - Date.now();
        if (delay <= 1000) {
          sendLocalNotification(message);
          showNotificationMessage(message);
          markCalendarNotified(dateKey, kind);
          return;
        }
        const timeoutId = window.setTimeout(() => {
          sendLocalNotification(message);
          showNotificationMessage(message);
          markCalendarNotified(dateKey, kind);
        }, delay);
        calendarTimersRef.current.push(timeoutId);
      };

      if (calendar.ramadan?.isRamadan) {
        const maghribTime = parseLocalTime(dateKey, calendar.prayer?.maghrib);
        const sahur0330 = parseLocalTime(dateKey, "03:30");
        const sahur0415 = parseLocalTime(dateKey, "04:15");
        queueNotification(
          sahur0330,
          "sahur-0330",
          `Semangat puasanya! Sahur dulu ya, imsak jam ${calendar.prayer?.imsak ?? "-"}.`
        );
        queueNotification(
          sahur0415,
          "sahur-0415",
          `Semangat puasanya! Sahur terakhir ya, imsak jam ${calendar.prayer?.imsak ?? "-"}.`
        );
        if (maghribTime) {
          queueNotification(
            maghribTime,
            "buka",
            `Semangat puasanya! Waktunya berbuka, maghrib jam ${calendar.prayer?.maghrib ?? "-"}.`
          );
        }
      }

      if (calendar.holiday?.name && !hasCalendarNotified(dateKey, "holiday")) {
        const message = `Hari ini libur ${calendar.holiday.name}. Selamat istirahat!`;
        sendLocalNotification(message);
        showNotificationMessage(message);
        markCalendarNotified(dateKey, "holiday");
      }
    },
    [
      hasCalendarNotified,
      markCalendarNotified,
      notificationState,
      sendLocalNotification,
      showNotificationMessage,
    ]
  );

  const scheduleReminder = useCallback(
    (reminder: Reminder) => {
      if (reminder.done || reminder.notified || !reminder.scheduledAt) return;
      if (notificationTimersRef.current.has(reminder.id)) return;
      const delay = Math.max(reminder.scheduledAt - Date.now(), 1000);
      const timeoutId = window.setTimeout(() => {
        sendLocalNotification(reminder.text);
        notificationTimersRef.current.delete(reminder.id);
        setReminders((prev) =>
          prev.map((item) => (item.id === reminder.id ? { ...item, notified: true } : item))
        );
      }, delay);
      notificationTimersRef.current.set(reminder.id, timeoutId);
    },
    [sendLocalNotification]
  );

  useEffect(() => {
    const timers = notificationTimersRef.current;
    const activeIds = new Set(reminders.map((reminder) => reminder.id));
    for (const [id, timeoutId] of timers.entries()) {
      if (!activeIds.has(id)) {
        window.clearTimeout(timeoutId);
        timers.delete(id);
      }
    }
    reminders.forEach((reminder) => {
      if (reminder.done || reminder.notified || !reminder.scheduledAt) {
        const existing = timers.get(reminder.id);
        if (existing) {
          window.clearTimeout(existing);
          timers.delete(reminder.id);
        }
        return;
      }
      scheduleReminder(reminder);
    });
  }, [reminders, scheduleReminder]);

  useEffect(() => {
    scheduleCalendarNotifications(calendarToday);
  }, [calendarToday, notificationState, scheduleCalendarNotifications]);

  const handleAuthSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isAuthLoading) return;
    setAuthStatus("");
    const email = authEmail.trim().toLowerCase();
    if (!email) {
      setAuthStatus("Email wajib diisi.");
      return;
    }

    try {
      setIsAuthLoading(true);
      if (authMode === "magic") {
        await apiJson("/api/auth/request-link", {
          method: "POST",
          body: JSON.stringify({ email }),
        });
        setAuthStatus("Magic link sudah dikirim ke email kamu.");
        return;
      }

      if (!authPassword || authPassword.length < 8) {
        setAuthStatus("Password minimal 8 karakter.");
        return;
      }

      if (authMode === "register") {
        await apiJson("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({
            email,
            password: authPassword,
            name: authName.trim() || undefined,
          }),
        });
      } else {
        await apiJson("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password: authPassword }),
        });
      }

      await finalizeLogin();
    } catch (error) {
      setAuthStatus(error instanceof Error ? error.message : "Login gagal.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSetupSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!setupName.trim()) return;
    if (isProfileSaving) return;
    setIsProfileSaving(true);
    apiJson<{ profile: Profile }>("/api/profile", {
      method: "PUT",
      body: JSON.stringify({
        name: setupName.trim(),
        birthDate: setupBirth || undefined,
        status: setupStatus.trim() || undefined,
        bio: setupBio.trim() || undefined,
        avatar: setupAvatar || undefined,
        avatarImage: setupAvatarImage || undefined,
        avatarAsset: setupAvatarAsset || undefined,
        accentColor: setupAccentColor,
        accentSoftness: setupAccentSoftness,
        terminalHost: setupTerminalHost.trim() || undefined,
        terminalName: setupTerminalName.trim() || undefined,
        prayerCityId: setupPrayerCityId || undefined,
        prayerCityName: setupPrayerCityName || undefined,
        timezone: setupTimezone || undefined,
      }),
    })
      .then((result) => {
        setProfile(result.profile);
        setCurrentView("dashboard");
      })
      .catch(() => {
        showNotificationMessage("Gagal menyimpan profil.");
      })
      .finally(() => {
        setIsProfileSaving(false);
      });
  };

  const primeProfileForm = () => {
    setSetupName(profile?.name ?? "");
    setSetupBirth(profile?.birthDate ?? "");
    setSetupStatus(profile?.status ?? "");
    setSetupBio(profile?.bio ?? "");
    setSetupAvatar(profile?.avatar ?? "");
    setSetupAvatarImage(profile?.avatarImage ?? "");
    setSetupAvatarAsset(profile?.avatarAsset ?? "");
    setSetupAccentColor(profile?.accentColor ?? DEFAULT_ACCENT);
    setSetupAccentSoftness(
      typeof profile?.accentSoftness === "number" ? profile.accentSoftness : DEFAULT_ACCENT_SOFTNESS
    );
    setSetupTerminalHost(profile?.terminalHost ?? "");
    setSetupTerminalName(profile?.terminalName ?? "");
    setSetupPrayerCityId(profile?.prayerCityId ?? DEFAULT_PRAYER_CITY.id);
    setSetupPrayerCityName(profile?.prayerCityName ?? DEFAULT_PRAYER_CITY.lokasi);
    setSetupPrayerCityQuery(profile?.prayerCityName ?? DEFAULT_PRAYER_CITY.lokasi);
    setSetupTimezone(profile?.timezone ?? DEFAULT_TIMEZONE);
    setSetupTimezoneQuery(profile?.timezone ?? DEFAULT_TIMEZONE);
  };

  const handleProfileEditStart = () => {
    primeProfileForm();
    setIsEditingProfile(true);
  };

  const handleProfileSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!setupName.trim()) return;
    if (isProfileSaving) return;
    setIsProfileSaving(true);
    apiJson<{ profile: Profile }>("/api/profile", {
      method: "PUT",
      body: JSON.stringify({
        name: setupName.trim(),
        birthDate: setupBirth || undefined,
        status: setupStatus.trim() || undefined,
        bio: setupBio.trim() || undefined,
        avatar: setupAvatar || undefined,
        avatarImage: setupAvatarImage || undefined,
        avatarAsset: setupAvatarAsset || undefined,
        accentColor: setupAccentColor,
        accentSoftness: setupAccentSoftness,
        terminalHost: setupTerminalHost.trim() || undefined,
        terminalName: setupTerminalName.trim() || undefined,
        prayerCityId: setupPrayerCityId || undefined,
        prayerCityName: setupPrayerCityName || undefined,
        timezone: setupTimezone || undefined,
      }),
    })
      .then((result) => {
        setProfile(result.profile);
        setIsEditingProfile(false);
      })
      .catch(() => {
        showNotificationMessage("Gagal menyimpan profil.");
      })
      .finally(() => {
        setIsProfileSaving(false);
      });
  };

  const handleProfileCancel = () => {
    primeProfileForm();
    setIsEditingProfile(false);
  };

  const handleSelectAvatarAuto = () => {
    setSetupAvatar("");
    setSetupAvatarImage("");
    setSetupAvatarAsset("");
  };

  const handleSelectAccentPreset = (color: string) => {
    setSetupAccentColor(color);
  };

  const handleResetAccent = () => {
    setSetupAccentColor(DEFAULT_ACCENT);
    setSetupAccentSoftness(DEFAULT_ACCENT_SOFTNESS);
  };

  const handleSelectAvatarEmoji = (emoji: string) => {
    setSetupAvatar(emoji);
    setSetupAvatarImage("");
    setSetupAvatarAsset("");
  };

  const handleSelectAvatarAsset = (src: string) => {
    setSetupAvatarAsset(src);
    setSetupAvatarImage("");
  };

  const handleClearCustomAvatar = () => {
    setSetupAvatarImage("");
    setSetupAvatarAsset("");
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsAvatarUploading(true);
    try {
      const dataUrl = await resizeImageFile(file);
      setSetupAvatarImage(dataUrl);
      setSetupAvatarAsset("");
    } catch {
      showNotificationMessage("Gagal upload avatar. Coba file lain ya.");
    } finally {
      setIsAvatarUploading(false);
      event.target.value = "";
    }
  };


  const updateChatThread = (id: string, updater: (thread: ChatThread) => ChatThread) => {
    setChatThreads((prev) => prev.map((thread) => (thread.id === id ? updater(thread) : thread)));
  };

  const replaceChatMessage = (threadId: string, tempId: string, message: ChatMessage) => {
    updateChatThread(threadId, (thread) => ({
      ...thread,
      messages: thread.messages.map((item) => (item.id === tempId ? message : item)),
    }));
  };

  const persistChatMessage = async (threadId: string, message: ChatMessage) => {
    const response = await apiJson<{ message: Record<string, unknown> }>(`/api/chats/${threadId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        text: message.text,
        from: message.from,
        kind: message.kind,
        share: message.share,
        shareCaption: message.shareCaption,
        timestamp: new Date(message.timestamp).toISOString(),
      }),
    });
    return mapChatMessage(response.message, sessionUserIdRef.current ?? sessionUserId);
  };

  const persistChatThreadPatch = async (id: string, patch: Partial<ChatThread>) => {
    const response = await apiJson<{ thread: Record<string, unknown> }>(`/api/chats/${id}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    });
    updateChatThread(id, (thread) => mapChatThreadFromServer(response.thread, thread.messages));
  };

  const handleChatDraftChange = (threadId: string, value: string) => {
    setChatDrafts((prev) => ({ ...prev, [threadId]: value }));
  };

  const mergeIncomingMessages = (threadId: string, incoming: ChatMessage[]) => {
    if (!incoming.length) return;
    setChatThreads((prev) =>
      prev.map((thread) => {
        if (thread.id !== threadId) return thread;
        const existingIds = new Set(thread.messages.map((message) => message.id));
        const nextMessages = [...thread.messages];
        incoming.forEach((message) => {
          if (!existingIds.has(message.id)) {
            nextMessages.push(message);
          }
        });
        nextMessages.sort((a, b) => a.timestamp - b.timestamp);
        return { ...thread, messages: nextMessages };
      })
    );
  };

  const createContactThread = async (email: string) => {
    try {
      setContactStatus("Menambahkan...");
      await apiJson("/api/chats", {
        method: "POST",
        body: JSON.stringify({ contactEmail: email }),
      });
      setContactEmail("");
      setContactResults([]);
      setContactStatus("Kontak berhasil ditambahkan.");
      setIsAddingContact(false);
      await syncServerData(sessionUserIdRef.current);
    } catch (error) {
      setContactStatus(error instanceof Error ? error.message : "Gagal menambah kontak.");
    }
  };

  const handleAddContact = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = contactEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      setContactStatus("Email belum valid.");
      return;
    }
    await createContactThread(email);
  };

  const sendSharePayloadToThread = async (threadId: string, payload: SharePayload, caption = "") => {
    const message: ChatMessage = {
      id: makeId(),
      from: "me",
      text: formatShareMessage(payload),
      timestamp: Date.now(),
      status: "sent",
      kind: "share",
      share: payload,
      shareCaption: caption.trim(),
    };
    updateChatThread(threadId, (thread) => ({
      ...thread,
      messages: [...thread.messages, message],
    }));
    try {
      const saved = await persistChatMessage(threadId, message);
      replaceChatMessage(threadId, message.id, saved);
    } catch {
      showNotificationMessage("Gagal mengirim attachment.");
    }
  };

  const handleShareToActiveThread = async () => {
    if (!sharePayload || !activeThreadId) return;
    await sendSharePayloadToThread(activeThreadId, sharePayload, shareCaption);
    closeShareSheet();
  };

  const handleChatSend = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const thread = chatThreads.find((item) => item.id === activeThreadId);
    if (!thread) return;
    const draft = chatDrafts[thread.id] ?? "";
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (isChatSending) return;

    const userMessage: ChatMessage = {
      id: makeId(),
      from: "me",
      text: trimmed,
      timestamp: Date.now(),
      status: "sent",
    };

    updateChatThread(thread.id, (current) => ({
      ...current,
      messages: [...current.messages, userMessage],
    }));
    handleChatDraftChange(thread.id, "");

    try {
      setIsChatSending(true);
      const saved = await persistChatMessage(thread.id, userMessage);
      replaceChatMessage(thread.id, userMessage.id, saved);
    } catch {
      showNotificationMessage("Gagal mengirim chat.");
    } finally {
      setIsChatSending(false);
    }

    if (thread.kind === "ai") {
      setAiLoadingThread(thread.id);
      const aiText = await sendMessageToAI(trimmed, [...thread.messages, userMessage]);
      const aiMessage: ChatMessage = {
        id: makeId(),
        from: "assistant",
        text: aiText,
        timestamp: Date.now(),
      };
      updateChatThread(thread.id, (current) => ({
        ...current,
        messages: [...current.messages, aiMessage],
      }));
      try {
        const savedAi = await persistChatMessage(thread.id, aiMessage);
        replaceChatMessage(thread.id, aiMessage.id, savedAi);
      } catch {
        showNotificationMessage("Gagal menyimpan balasan AI.");
      }
      setAiLoadingThread(null);
    }
  };

  const sendMessageToAI = async (text: string, historyMessages: ChatMessage[]) => {
    try {
      const response = await apiJson<{ text?: string; error?: string }>("/api/ai", {
        method: "POST",
        body: JSON.stringify({
          message: text,
          history: [
            { role: "system", content: buildSystemPrompt(profile?.name) },
            ...historyMessages.map((message) => ({
              role: message.from === "me" ? "user" : "assistant",
              content: message.text,
            })),
          ],
        }),
      });
      return response.text || "Hmm... aku bingung jawabnya.";
    } catch {
      return "Koneksi ke AI gagal. Coba lagi ya.";
    }
  };

  // Orchestrate AI chat flow with loading indicator.
  const handleClearChat = (id: string) => {
    updateChatThread(id, (thread) => ({ ...thread, messages: [] }));
    apiJson(`/api/chats/${id}/messages`, { method: "DELETE" }).catch(() => {
      showNotificationMessage("Gagal membersihkan chat.");
    });
  };

  const handleToggleChatPin = (id: string) => {
    const thread = chatThreads.find((item) => item.id === id);
    if (!thread) return;
    const nextPinned = !thread.pinned;
    updateChatThread(id, (current) => ({ ...current, pinned: nextPinned }));
    persistChatThreadPatch(id, { pinned: nextPinned }).catch(() => {
      showNotificationMessage("Gagal menyimpan pin chat.");
    });
  };

  const createNoteOnServer = async (note: Note) => {
    setNotes((prev) => [note, ...prev]);
    setExpandedNoteId(note.id);
    try {
      const response = await apiJson<{ note: Record<string, unknown> }>("/api/notes", {
        method: "POST",
        body: JSON.stringify(note),
      });
      const saved = mapNoteFromServer(response.note);
      setNotes((prev) => prev.map((item) => (item.id === note.id ? saved : item)));
      setExpandedNoteId(saved.id);
    } catch {
      setNotes((prev) => prev.filter((item) => item.id !== note.id));
      showNotificationMessage("Gagal menyimpan catatan.");
    }
  };

  const handleAddNote = async (templateId?: string) => {
    if (isNoteCreating) return;
    setIsNoteCreating(true);
    const template = NOTE_TEMPLATES.find((item) => item.id === templateId);
    const newNote = createNote({
      title: template?.title ?? "Catatan Baru",
      text: template?.text ?? "Tulis catatan manis di sini...",
      mood: template?.mood,
      type: template?.type ?? "text",
    });
    try {
      await createNoteOnServer(newNote);
    } finally {
      setIsNoteCreating(false);
    }
  };

  const handleDuplicateNote = async (note: Note) => {
    if (isNoteCreating) return;
    setIsNoteCreating(true);
    const clone = createNote({
      ...note,
      id: makeId(),
      title: `${note.title || "Catatan"} (copy)`,
      checklist: note.checklist.map((item) => ({ ...item, id: makeId() })),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    try {
      await createNoteOnServer(clone);
    } finally {
      setIsNoteCreating(false);
    }
  };

  const scheduleNoteSave = (id: string, patch: Partial<Note>) => {
    const timers = noteSaveTimersRef.current;
    const existing = timers.get(id);
    if (existing) {
      window.clearTimeout(existing);
    }
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await apiJson<{ note: Record<string, unknown> }>(`/api/notes/${id}`, {
          method: "PUT",
          body: JSON.stringify(patch),
        });
        const saved = mapNoteFromServer(response.note);
        setNotes((prev) => prev.map((note) => (note.id === id ? saved : note)));
      } catch {
        // ignore save errors for now
      }
      timers.delete(id);
    }, 600);
    timers.set(id, timeoutId);
  };

  const updateNote = (id: string, patch: Partial<Note>) => {
    setNotes((prev) =>
      prev.map((note) => (note.id === id ? { ...note, ...patch, updatedAt: Date.now() } : note))
    );
    scheduleNoteSave(id, patch);
  };

  const handleDeleteNote = async (id: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== id));
    try {
      await apiJson(`/api/notes/${id}`, { method: "DELETE" });
    } catch {
      showNotificationMessage("Gagal menghapus catatan.");
    }
  };

  const handleToggleNoteFlag = (id: string, key: "pinned" | "favorite" | "archived") => {
    const target = notes.find((note) => note.id === id);
    if (!target) return;
    updateNote(id, { [key]: !target[key] } as Partial<Note>);
  };

  const handleAddChecklistItem = (id: string) => {
    const target = notes.find((note) => note.id === id);
    if (!target) return;
    const nextChecklist = [...target.checklist, createChecklistItem("Item baru")];
    updateNote(id, { checklist: nextChecklist });
  };

  const handleUpdateChecklistItem = (noteId: string, itemId: string, text: string) => {
    const target = notes.find((note) => note.id === noteId);
    if (!target) return;
    const nextChecklist = target.checklist.map((item) => (item.id === itemId ? { ...item, text } : item));
    updateNote(noteId, { checklist: nextChecklist });
  };

  const handleToggleChecklistItem = (noteId: string, itemId: string) => {
    const target = notes.find((note) => note.id === noteId);
    if (!target) return;
    const nextChecklist = target.checklist.map((item) =>
      item.id === itemId ? { ...item, done: !item.done } : item
    );
    updateNote(noteId, { checklist: nextChecklist });
  };

  const handleDeleteChecklistItem = (noteId: string, itemId: string) => {
    const target = notes.find((note) => note.id === noteId);
    if (!target) return;
    const nextChecklist = target.checklist.filter((item) => item.id !== itemId);
    updateNote(noteId, { checklist: nextChecklist });
  };

  const handleNextPrompt = () => {
    setNotePromptIndex((prev) => (prev + 1) % NOTE_PROMPTS.length);
  };

  const handleCreateFromPrompt = () => {
    if (isNoteCreating) return;
    setIsNoteCreating(true);
    const prompt = NOTE_PROMPTS[notePromptIndex] ?? NOTE_PROMPTS[0];
    const newNote = createNote({ title: "Curhat Prompt", text: `${prompt}\n`, mood: "soft" });
    createNoteOnServer(newNote).finally(() => setIsNoteCreating(false));
  };

  const handleToggleNoteExpand = (id: string) => {
    setExpandedNoteId((prev) => (prev === id ? null : id));
  };

  const handleUpdateNoteTags = (id: string, value: string) => {
    const tags = value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    updateNote(id, { tags });
  };

  const handleSwitchNoteType = (id: string, nextType: "text" | "checklist") => {
    const target = notes.find((note) => note.id === id);
    if (!target || target.type === nextType) return;
    if (nextType === "checklist") {
      const lines = target.text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const checklist = lines.length ? lines.map((line) => createChecklistItem(line)) : [createChecklistItem("Item baru")];
      updateNote(id, { type: "checklist", checklist, text: target.text });
      return;
    }
    const text = target.checklist.map((item) => `- ${item.text}`).join("\n");
    updateNote(id, { type: "text", text });
  };

  const handleAddReminder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isReminderCreating) return;
    const form = event.currentTarget;
    const input = form.elements.namedItem("reminder") as HTMLInputElement | null;
    const timeInput = form.elements.namedItem("reminderTime") as HTMLInputElement | null;
    const dateInput = form.elements.namedItem("reminderDate") as HTMLInputElement | null;
    const text = input?.value.trim() ?? "";
    const time = timeInput?.value ?? "";
    const date = dateInput?.value ?? "";
    if (!text) return;
    if (!date || !time) {
      showNotificationMessage("Tanggal dan jam wajib diisi ya.");
      return;
    }
    setIsReminderCreating(true);
    await requestNotificationPermission();
    const scheduledAt = getScheduledAtForDateTime(date, time);
    if (!scheduledAt || scheduledAt <= Date.now()) {
      showNotificationMessage("Waktunya harus di masa depan ya.");
      setIsReminderCreating(false);
      return;
    }
    try {
      const response = await apiJson<{ reminder: Record<string, unknown> }>("/api/reminders", {
        method: "POST",
        body: JSON.stringify({
          text,
          date,
          time,
          scheduledAt: new Date(scheduledAt).toISOString(),
          done: false,
          notified: false,
        }),
      });
      const saved = mapReminderFromServer(response.reminder);
      setReminders((prev) => [saved, ...prev]);
    } catch {
      showNotificationMessage("Gagal menambahkan reminder.");
    } finally {
      setIsReminderCreating(false);
    }
    form.reset();
  };

  const handleToggleReminder = async (id: string) => {
    const target = reminders.find((reminder) => reminder.id === id);
    if (!target) return;
    const nextDone = !target.done;
    const nextPointsWeekKey = nextDone ? target.pointsWeekKey ?? currentWeekKey : target.pointsWeekKey;
    const scheduledAt =
      !nextDone && target.date && target.time
        ? getScheduledAtForDateTime(target.date, target.time)
        : target.scheduledAt;

    setReminders((prev) =>
      prev.map((reminder) =>
        reminder.id === id
          ? { ...reminder, done: nextDone, notified: nextDone ? reminder.notified : false, scheduledAt, pointsWeekKey: nextPointsWeekKey }
          : reminder
      )
    );

    try {
      const response = await apiJson<{ reminder: Record<string, unknown> }>(`/api/reminders/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          done: nextDone,
          notified: nextDone ? target.notified : false,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
          pointsWeekKey: nextPointsWeekKey ?? null,
        }),
      });
      const saved = mapReminderFromServer(response.reminder);
      setReminders((prev) => prev.map((reminder) => (reminder.id === id ? saved : reminder)));
      if (nextDone && target.pointsWeekKey !== currentWeekKey) {
        addWeeklyPoints(REMINDER_POINTS);
      }
    } catch {
      showNotificationMessage("Gagal update reminder.");
    }
  };

  const handleDeleteReminder = async (id: string) => {
    setReminders((prev) => prev.filter((reminder) => reminder.id !== id));
    try {
      await apiJson(`/api/reminders/${id}`, { method: "DELETE" });
    } catch {
      showNotificationMessage("Gagal menghapus reminder.");
    }
  };

  const handleGalleryUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setIsGalleryUploading(true);
    try {
      const items = await Promise.all(
        files.map(async (file) =>
          createGalleryItem({
            src: await readFileAsDataUrl(file),
            name: file.name,
            addedAt: Date.now(),
          })
        )
      );
      for (const item of items) {
        setGalleryItems((prev) => [item, ...prev]);
        try {
          const response = await apiJson<{ item: Record<string, unknown> }>("/api/gallery", {
            method: "POST",
            body: JSON.stringify({
              blobUrl: item.src,
              name: item.name,
              caption: item.caption,
              tags: item.tags,
              favorite: item.favorite,
              memoryDate: item.memoryDate,
            }),
          });
          const saved = mapGalleryItemFromServer(response.item);
          setGalleryItems((prev) => prev.map((current) => (current.id === item.id ? saved : current)));
        } catch {
          setGalleryItems((prev) => prev.filter((current) => current.id !== item.id));
          showNotificationMessage("Gagal upload foto. Coba file lain ya.");
        }
      }
    } catch {
      showNotificationMessage("Gagal upload foto. Coba file lain ya.");
    } finally {
      setIsGalleryUploading(false);
      event.target.value = "";
    }
  };

  const handleDeleteGalleryItem = async (id: string) => {
    setGalleryItems((prev) => prev.filter((item) => item.id !== id));
    try {
      await apiJson(`/api/gallery/${id}`, { method: "DELETE" });
    } catch {
      showNotificationMessage("Gagal menghapus foto.");
    }
  };

  const filteredChatThreads = useMemo(() => {
    const query = chatSearch.trim().toLowerCase();
    let items = [...chatThreads];
    if (query) {
      items = items.filter((thread) => {
        const matchTitle = thread.title.toLowerCase().includes(query);
        const matchPreview = getThreadPreview(thread).toLowerCase().includes(query);
        return matchTitle || matchPreview;
      });
    }
    return items.sort((a, b) => {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      if (a.kind !== b.kind) return a.kind === "ai" ? 1 : -1;
      const aTime = a.messages[a.messages.length - 1]?.timestamp ?? 0;
      const bTime = b.messages[b.messages.length - 1]?.timestamp ?? 0;
      return bTime - aTime;
    });
  }, [chatSearch, chatThreads]);

  const shareTargets = useMemo(() => {
    return [...chatThreads].sort((a, b) => {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      if (a.kind !== b.kind) return a.kind === "ai" ? 1 : -1;
      const aTime = a.messages[a.messages.length - 1]?.timestamp ?? 0;
      const bTime = b.messages[b.messages.length - 1]?.timestamp ?? 0;
      return bTime - aTime;
    });
  }, [chatThreads]);

  const activeThread = useMemo(
    () => chatThreads.find((thread) => thread.id === activeThreadId) ?? chatThreads[0],
    [chatThreads, activeThreadId]
  );

  const activeDraft = useMemo(
    () => (activeThread ? chatDrafts[activeThread.id] ?? "" : ""),
    [activeThread, chatDrafts]
  );

  const chatQuickReplies = useMemo(() => {
    if (!activeThread) return [];
    if (activeThread.kind === "ai") {
      return ["Ceritain hariku", "Kasih saran dong", "Bikin aku ketawa", "Aku lagi overthinking"];
    }
    return ["Haiiii", "Lagi apa?", "Kangen", "Nanti makan bareng?"];
  }, [activeThread]);

  const activeMessagesWithSeparators = useMemo(() => {
    if (!activeThread) return [];
    const items: Array<
      | { type: "date"; key: string; label: string }
      | { type: "message"; key: string; message: ChatMessage }
    > = [];
    let lastDate = "";
    activeThread.messages.forEach((message) => {
      const dateKey = new Date(message.timestamp).toDateString();
      if (dateKey !== lastDate) {
        lastDate = dateKey;
        items.push({ type: "date", key: dateKey, label: formatChatDate(message.timestamp) });
      }
      items.push({ type: "message", key: message.id, message });
    });
    return items;
  }, [activeThread]);

  const scheduleGallerySave = (id: string, patch: Partial<GalleryItem>) => {
    const timers = gallerySaveTimersRef.current;
    const existing = timers.get(id);
    if (existing) {
      window.clearTimeout(existing);
    }
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await apiJson<{ item: Record<string, unknown> }>(`/api/gallery/${id}`, {
          method: "PUT",
          body: JSON.stringify({
            blobUrl: patch.src,
            name: patch.name,
            caption: patch.caption,
            tags: patch.tags,
            favorite: patch.favorite,
            memoryDate: patch.memoryDate,
          }),
        });
        const saved = mapGalleryItemFromServer(response.item);
        setGalleryItems((prev) => prev.map((item) => (item.id === id ? saved : item)));
      } catch {
        // ignore save errors for now
      }
      timers.delete(id);
    }, 600);
    timers.set(id, timeoutId);
  };

  const updateGalleryItem = (id: string, patch: Partial<GalleryItem>) => {
    setGalleryItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch, updatedAt: Date.now() } : item))
    );
    scheduleGallerySave(id, patch);
  };

  const handleToggleGalleryFavorite = (id: string) => {
    setGalleryItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, favorite: !item.favorite, updatedAt: Date.now() } : item))
    );
  };

  const handleToggleGalleryExpand = (id: string) => {
    setExpandedGalleryId((prev) => (prev === id ? null : id));
  };

  const openLightbox = (item: GalleryItem) => {
    setLightboxItem(item);
  };

  const closeLightbox = () => {
    setLightboxItem(null);
  };

  const handleUpdateGalleryTags = (id: string, value: string) => {
    const tags = value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    updateGalleryItem(id, { tags });
  };

  const openShareSheet = (payload: SharePayload) => {
    setSharePayload(payload);
    setShareCaption("");
  };

  const closeShareSheet = () => {
    setSharePayload(null);
    setShareCaption("");
  };

  const handleShareToThread = (threadId: string) => {
    if (!sharePayload) return;
    sendSharePayloadToThread(threadId, sharePayload, shareCaption).catch(() => {
      showNotificationMessage("Gagal membagikan ke chat.");
    });
    setActiveThreadId(threadId);
    setCurrentView("chat-hub");
    closeShareSheet();
  };

  const handleOpenSharedItem = (payload?: SharePayload) => {
    if (!payload?.targetId) return;
    if (payload.kind === "note") {
      setCurrentView("notes");
      setExpandedNoteId(payload.targetId);
    } else if (payload.kind === "reminder") {
      setCurrentView("reminders");
      setFocusedReminderId(payload.targetId);
    } else if (payload.kind === "gallery") {
      setCurrentView("gallery");
      setExpandedGalleryId(payload.targetId);
    }
  };

  const handleChatMediaPick = () => {
    chatMediaInputRef.current?.click();
  };

  const handleChatMediaUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeThread) return;
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    for (const file of files) {
      try {
        const isImage = file.type.startsWith("image/");
        const isVideo = file.type.startsWith("video/");
        const dataUrl = isImage ? await readFileAsDataUrl(file) : "";
        const videoUrl = isVideo ? await readFileAsDataUrl(file) : "";
        const payload: SharePayload = {
          kind: "media",
          title: isImage ? "Foto" : isVideo ? "Video" : "File",
          body: file.name,
          meta: isVideo ? "Video dari chat" : "Media dari chat",
          imageSrc: isImage ? dataUrl : undefined,
          videoSrc: isVideo ? videoUrl : undefined,
        };
        await sendSharePayloadToThread(activeThread.id, payload, "");
      } catch {
        showNotificationMessage("Gagal mengirim media.");
      }
    }
    event.target.value = "";
    setIsChatAttachOpen(false);
  };

  const handleShareLocation = async () => {
    if (!activeThread) return;
    if (!navigator.geolocation || !window.isSecureContext) {
      showNotificationMessage("Lokasi sekarang butuh HTTPS atau izin lokasi.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const mapUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
        const mapImage = getStaticMapUrl(latitude, longitude);
        const payload: SharePayload = {
          kind: "location",
          title: "Lokasi sekarang",
          body: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
          meta: mapUrl,
          imageSrc: mapImage,
        };
        await sendSharePayloadToThread(activeThread.id, payload, "");
        setIsChatAttachOpen(false);
      },
      () => {
        showNotificationMessage("Izin lokasi ditolak.");
      }
    );
  };

  const navItems: Array<{ id: View; label: string; icon: LucideIcon }> = [
    { id: "dashboard", label: "Home", icon: HomeIcon },
    { id: "terminal", label: "Terminal", icon: Terminal },
    { id: "chat-hub", label: "Chat", icon: MessageCircle },
    { id: "notes", label: "Notes", icon: StickyNote },
    { id: "reminders", label: "Reminder", icon: Bell },
    { id: "gallery", label: "Gallery", icon: ImageIcon },
  ];

  const showNav = isLoggedIn && currentView !== "login" && currentView !== "setup";
  const navPaddingClass = useMemo(() => {
    if (!showNav) return "";
    if (currentView === "terminal") {
      return "pb-0";
    }
    if (currentView === "chat-hub") {
      return "pb-[calc(env(safe-area-inset-bottom)+7.5rem)] sm:pb-[calc(env(safe-area-inset-bottom)+5.75rem)]";
    }
    if (currentView === "notes" || currentView === "reminders") {
      return "pb-[calc(env(safe-area-inset-bottom)+5.25rem)] sm:pb-[calc(env(safe-area-inset-bottom)+4.75rem)]";
    }
    return "pb-[calc(env(safe-area-inset-bottom)+4.5rem)] sm:pb-[calc(env(safe-area-inset-bottom)+4.25rem)]";
  }, [currentView, showNav]);
  const contentPaddingClass = useMemo(() => {
    if (!showNav) return "";
    if (currentView === "terminal") {
      return "pb-0";
    }
    if (currentView === "chat-hub") {
      return "pb-2 sm:pb-3";
    }
    return "pb-3 sm:pb-4";
  }, [currentView, showNav]);

  return (
    <div
      className={`min-h-screen ${navPaddingClass}`}
      style={accentStyle}
    >
      {currentView === "login" && (
        <div className="flex min-h-screen items-center justify-center px-4 py-6 sm:px-6 sm:py-10">
          <div className="glass animate-reveal w-full max-w-md rounded-[32px] p-6 sm:p-8">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-hot/20 text-hot">
                  <Heart size={26} />
                </div>
              <div>
                <h1 className="font-display text-xl text-white sm:text-2xl">The Gate</h1>
                <p className="text-sm text-slate">Login dulu biar data kamu nyangkut aman.</p>
              </div>
              <div className="ml-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-3/70 text-2xl animate-breathe">
                {avatarSource ? (
                  <Image
                    src={avatarSource}
                    alt="Avatar"
                    width={48}
                    height={48}
                    className="h-full w-full rounded-2xl object-cover"
                    unoptimized
                  />
                ) : (
                  avatarEmoji
                )}
              </div>
            </div>
            <form onSubmit={handleAuthSubmit} className="mt-8 space-y-4">
              <div className="flex flex-wrap gap-2">
                {(["login", "register", "magic"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setAuthMode(mode)}
                    data-anim={mode === "register" ? "signup" : mode === "login" ? "signin" : "magic"}
                    className={`rounded-full px-4 py-2 text-xs transition-all ${
                      authMode === mode ? "bg-hot text-black" : "border border-hot/30 text-soft hover:bg-ink-3"
                    }`}
                  >
                    {mode === "login" ? "Masuk" : mode === "register" ? "Daftar" : "Magic Link"}
                  </button>
                ))}
              </div>
              {authMode === "register" && (
                <input
                  value={authName}
                  onChange={(event) => setAuthName(event.target.value)}
                  placeholder="Nama kamu"
                  className="w-full rounded-2xl border border-hot/30 bg-ink-3/80 px-4 py-3 text-sm text-white placeholder:text-slate focus:border-hot focus:outline-none"
                />
              )}
              <input
                value={authEmail}
                onChange={(event) => setAuthEmail(event.target.value)}
                placeholder="Email aktif"
                type="email"
                className="w-full rounded-2xl border border-hot/30 bg-ink-3/80 px-4 py-3 text-sm text-white placeholder:text-slate focus:border-hot focus:outline-none"
              />
              {authMode !== "magic" && (
                <input
                  value={authPassword}
                  onChange={(event) => setAuthPassword(event.target.value)}
                  placeholder="Password (min 8)"
                  type="password"
                  className="w-full rounded-2xl border border-hot/30 bg-ink-3/80 px-4 py-3 text-sm text-white placeholder:text-slate focus:border-hot focus:outline-none"
                />
              )}
              {authStatus && <p className="text-xs text-soft">{authStatus}</p>}
              {isBootstrapping && <p className="text-xs text-slate">Cek sesi dulu ya...</p>}
              <button
                type="submit"
                disabled={isAuthLoading}
                data-anim={authMode === "register" ? "signup" : authMode === "login" ? "signin" : "magic"}
                className={`flex w-full items-center justify-center gap-2 rounded-2xl bg-hot px-4 py-3 font-semibold text-black transition-all duration-300 hover:scale-105 hover:shadow-[0_0_15px_rgba(255,20,147,0.6)] ${
                  isAuthLoading ? "cursor-not-allowed opacity-70" : ""
                }`}
              >
                {isAuthLoading ? (
                  <span className="flex items-center gap-2 text-sm">
                    <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-black/40 border-t-black" />
                    Memproses...
                  </span>
                ) : (
                  <>
                    <LogIn size={18} />
                    {authMode === "magic" ? "Kirim Magic Link" : authMode === "register" ? "Daftar" : "Masuk"}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {currentView === "setup" && (
        <div className="flex min-h-screen items-center justify-center px-4 py-6 sm:px-6 sm:py-10">
          <div className="glass animate-reveal w-full max-w-lg rounded-[32px] p-6 sm:p-8">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-hot/20 text-hot">
                <User size={24} />
              </div>
              <div>
                <h1 className="font-display text-xl text-white sm:text-2xl">Setup Profil</h1>
                <p className="text-sm text-slate">Biar aku makin kenal kamu.</p>
              </div>
            </div>
            <form onSubmit={handleSetupSubmit} className="mt-8 space-y-5">
              <div className="space-y-4">
                <label className="text-xs uppercase tracking-[0.2em] text-slate">Avatar Utama</label>
                <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-hot/20 bg-ink-3/70 p-4">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-ink-2/70 text-3xl">
                    {setupAvatarImage || setupAvatarAsset ? (
                      <Image
                        src={setupAvatarPreview}
                        alt="Preview avatar"
                        width={64}
                        height={64}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    ) : (
                      setupAvatarPreview
                    )}
                  </div>
                  <div className="min-w-[160px] flex-1 text-xs text-slate">
                    <p className="text-sm text-white">Pilih avatar kamu</p>
                    <p className="mt-1">Upload foto sendiri atau pakai emoji dulu ya.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <label className="cursor-pointer rounded-full border border-hot/30 px-3 py-2 text-xs text-soft transition-all hover:bg-ink-3">
                      <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                      {isAvatarUploading ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="h-3 w-3 animate-spin rounded-full border border-hot/40 border-t-hot" />
                          Uploading...
                        </span>
                      ) : (
                        "Upload Foto"
                      )}
                    </label>
                    {(setupAvatarImage || setupAvatarAsset) && (
                      <button
                        type="button"
                        onClick={handleClearCustomAvatar}
                        className="rounded-full border border-hot/30 px-3 py-2 text-xs text-soft transition-all hover:bg-ink-3"
                      >
                        Hapus Foto
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate">Avatar Emoji</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAvatarAuto}
                      className={`rounded-full px-3 py-2 text-xs transition-all ${
                        !setupAvatar ? "bg-hot text-black" : "border border-hot/30 text-soft hover:bg-ink-3"
                      }`}
                    >
                      Auto {getAvatarEmoji(setupName)}
                    </button>
                    {AVATAR_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleSelectAvatarEmoji(emoji)}
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-lg transition-all ${
                          setupAvatar === emoji
                            ? "bg-hot text-black"
                            : "border border-hot/30 text-soft hover:bg-ink-3"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {CHUBBY_ASSETS.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate">Avatar Chubby</p>
                    <div className="flex flex-wrap gap-2">
                      {CHUBBY_ASSETS.map((asset) => (
                        <button
                          key={asset.id}
                          type="button"
                          onClick={() => handleSelectAvatarAsset(asset.src)}
                          className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs transition-all ${
                            setupAvatarAsset === asset.src
                              ? "border-hot bg-hot/20 text-soft"
                              : "border-hot/30 text-soft hover:bg-ink-3"
                          }`}
                        >
                          <Image
                            src={asset.src}
                            alt={asset.label}
                            width={24}
                            height={24}
                            className="h-6 w-6 rounded-full object-cover"
                            unoptimized
                          />
                          {asset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate">
                    Avatar chubby belum dipasang. Nanti tinggal isi daftar asset-nya.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.2em] text-slate">Nama Panggilan</label>
                <input
                  type="text"
                  value={setupName}
                  onChange={(event) => setSetupName(event.target.value)}
                  placeholder="Misal: Nona Pink"
                  className="w-full rounded-2xl border border-hot/30 bg-ink-3/80 px-4 py-3 text-sm text-white placeholder:text-slate focus:border-hot focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.2em] text-slate">Tanggal Lahir</label>
                <input
                  type="date"
                  value={setupBirth}
                  onChange={(event) => setSetupBirth(event.target.value)}
                  className="w-full rounded-2xl border border-hot/30 bg-ink-3/80 px-4 py-3 text-sm text-white focus:border-hot focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.2em] text-slate">Status Singkat</label>
                <input
                  type="text"
                  value={setupStatus}
                  onChange={(event) => setSetupStatus(event.target.value)}
                  placeholder="Misal: lagi semangat belajar"
                  className="w-full rounded-2xl border border-hot/30 bg-ink-3/80 px-4 py-3 text-sm text-white placeholder:text-slate focus:border-hot focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.2em] text-slate">Bio Mini</label>
                <textarea
                  value={setupBio}
                  onChange={(event) => setSetupBio(event.target.value)}
                  placeholder="Tulis satu kalimat manis tentang kamu"
                  className="min-h-[90px] w-full resize-none rounded-2xl border border-hot/30 bg-ink-3/80 px-4 py-3 text-sm text-white placeholder:text-slate focus:border-hot focus:outline-none"
                />
              </div>
              <div className="space-y-3">
                <label className="text-xs uppercase tracking-[0.2em] text-slate">Accent Color</label>
                <div className="flex flex-wrap items-center gap-3">
                  {ACCENT_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectAccentPreset(preset.color)}
                      className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs transition-all ${
                        setupAccentColor === preset.color
                          ? "border-hot bg-hot/20 text-soft"
                          : "border-hot/30 text-soft hover:bg-ink-3"
                      }`}
                    >
                      <span
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: preset.color }}
                      />
                      {preset.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-hot/20 bg-ink-3/70 px-4 py-3 text-xs text-slate">
                  <label className="flex items-center gap-2">
                    <Palette size={14} className="text-hot" />
                    <input
                      type="color"
                      value={setupAccentColor}
                      onChange={(event) => setSetupAccentColor(event.target.value)}
                      className="h-8 w-10 rounded border-none bg-transparent p-0"
                    />
                  </label>
                  <div className="flex flex-1 items-center gap-2">
                    <span className="text-[11px] text-slate">Softness</span>
                      <input
                        type="range"
                        min={20}
                        max={80}
                        value={setupAccentSoftness}
                        onChange={(event) => setSetupAccentSoftness(Number(event.target.value))}
                        className="w-full"
                        style={{ accentColor: setupAccentColor }}
                      />
                    <span className="text-[11px] text-soft">{setupAccentSoftness}%</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetAccent}
                    className="rounded-full border border-hot/30 px-3 py-1 text-[11px] text-soft transition-all hover:bg-ink-3"
                  >
                    Reset
                  </button>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-slate">Terminal Hostname</label>
                  <input
                    type="text"
                    value={setupTerminalHost}
                    onChange={(event) => setSetupTerminalHost(event.target.value)}
                    placeholder="Misal: melpin"
                    className="w-full rounded-2xl border border-hot/30 bg-ink-3/80 px-4 py-3 text-sm text-white placeholder:text-slate focus:border-hot focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-slate">Nama Terminal</label>
                  <input
                    type="text"
                    value={setupTerminalName}
                    onChange={(event) => setSetupTerminalName(event.target.value)}
                    placeholder="Misal: Melpin Terminal"
                    className="w-full rounded-2xl border border-hot/30 bg-ink-3/80 px-4 py-3 text-sm text-white placeholder:text-slate focus:border-hot focus:outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.2em] text-slate">Lokasi Jadwal Sholat</label>
                <input
                  type="text"
                  list="prayer-city-list"
                  value={setupPrayerCityQuery}
                  onChange={(event) => handlePrayerCityInput(event.target.value)}
                  placeholder="Cari kota (contoh: KOTA JAKARTA)"
                  className="w-full rounded-2xl border border-hot/30 bg-ink-3/80 px-4 py-3 text-sm text-white placeholder:text-slate focus:border-hot focus:outline-none"
                />
                <datalist id="prayer-city-list">
                  {prayerCities.map((city) => (
                    <option key={city.id} value={city.lokasi} />
                  ))}
                </datalist>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate">
                  <span>Terpilih: {setupPrayerCityName || DEFAULT_PRAYER_CITY.lokasi}</span>
                  <button
                    type="button"
                    onClick={handleDetectPrayerCity}
                    disabled={isPrayerCityDetecting}
                    className={`rounded-full border border-hot/30 px-3 py-1 text-[11px] text-soft transition-all hover:bg-ink-3 ${
                      isPrayerCityDetecting ? "opacity-70" : ""
                    }`}
                  >
                    {isPrayerCityDetecting ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-3 w-3 animate-spin rounded-full border border-hot/40 border-t-hot" />
                        Mendeteksi...
                      </span>
                    ) : (
                      "Auto-detect"
                    )}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.2em] text-slate">Timezone</label>
                <input
                  type="text"
                  list="timezone-list"
                  value={setupTimezoneQuery}
                  onChange={(event) => handleTimezoneInput(event.target.value)}
                  placeholder="Asia/Jakarta"
                  className="w-full rounded-2xl border border-hot/30 bg-ink-3/80 px-4 py-3 text-sm text-white placeholder:text-slate focus:border-hot focus:outline-none"
                />
                <datalist id="timezone-list">
                  {timeZoneOptions.map((zone) => (
                    <option key={zone} value={zone} />
                  ))}
                </datalist>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate">
                  <span>Terpilih: {setupTimezone}</span>
                  <button
                    type="button"
                    onClick={handleUseSystemTimezone}
                    className="rounded-full border border-hot/30 px-3 py-1 text-[11px] text-soft transition-all hover:bg-ink-3"
                  >
                    Pakai timezone device
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={isProfileSaving}
                className={`flex w-full items-center justify-center gap-2 rounded-2xl bg-hot px-4 py-3 font-semibold text-black transition-all duration-300 hover:scale-105 hover:shadow-[0_0_15px_rgba(255,20,147,0.6)] ${
                  isProfileSaving ? "cursor-not-allowed opacity-70" : ""
                }`}
              >
                {isProfileSaving ? (
                  <span className="flex items-center gap-2 text-sm">
                    <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-black/40 border-t-black" />
                    Menyimpan...
                  </span>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Simpan Profil
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {showNav && (
        <div
          className={`mx-auto flex w-full flex-col ${
            currentView === "terminal"
              ? "max-w-none box-border px-3 pt-3 sm:px-6 sm:pt-4 lg:px-8 gap-3 sm:gap-4 h-[100svh] overflow-hidden"
              : "max-w-6xl px-4 pt-5 sm:px-6 sm:pt-8 gap-6 sm:gap-8"
          } ${contentPaddingClass}`}
        >
          <header
            className={`flex flex-wrap items-center justify-between gap-4 ${
              currentView === "terminal" ? "hidden" : "flex"
            }`}
          >
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate">Melpin Interactive Space</p>
              <h1 className="font-display text-2xl text-white sm:text-3xl">Dark Cute Home Base</h1>
            </div>
            <div className="flex items-center gap-3 rounded-3xl border border-hot/30 bg-ink-3/60 px-4 py-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink-2/70 text-2xl animate-breathe overflow-hidden">
                {avatarSource ? (
                  <Image
                    src={avatarSource}
                    alt="Avatar"
                    width={44}
                    height={44}
                    className="h-full w-full rounded-2xl object-cover"
                    unoptimized
                  />
                ) : (
                  avatarEmoji
                )}
              </div>
              <div>
                <p className="text-xs text-slate">{`Haii, ${profile?.name || "Sayang"}`}</p>
              </div>
            </div>
          </header>

          {currentView === "dashboard" && (
            <div className="space-y-6">
              <div className="glass rounded-[32px] p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate">Pesan buat kamu</p>
                    <h2 className="mt-1 font-display text-xl text-white sm:text-2xl">{greeting}</h2>
                    {ageParts && (
                      <p className="mt-3 text-sm text-soft">
                        Umur kamu sekarang: {ageParts.years} tahun, {ageParts.months} bulan, {ageParts.days} hari.
                      </p>
                    )}
                  </div>
                  <div className="hidden items-center gap-2 rounded-full border border-hot/30 bg-ink-3/70 px-4 py-2 text-xs text-slate md:flex">
                    <Sparkles size={14} />
                    {now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  {isDataSyncing && (
                    <div className="flex items-center gap-2 rounded-full border border-hot/30 bg-ink-3/70 px-4 py-2 text-xs text-slate">
                      <span className="h-3 w-3 animate-spin rounded-full border border-hot/40 border-t-hot" />
                      Sinkron data...
                    </div>
                  )}
                </div>
              </div>

              <div className="glass rounded-[32px] p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-2/70 text-2xl animate-breathe">
                      {avatarSource ? (
                        <Image
                          src={avatarSource}
                          alt="Avatar"
                          width={56}
                          height={56}
                          className="h-full w-full rounded-2xl object-cover"
                          unoptimized
                        />
                      ) : (
                        avatarEmoji
                      )}
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate">Profil Kamu</p>
                      <h3 className="mt-1 text-lg font-semibold text-white">{profile?.name || "Sayang"}</h3>
                      <p className="mt-1 text-sm text-slate">{profile?.status || "Lagi santai dan manis."}</p>
                      {profile?.bio && <p className="mt-2 text-xs text-soft">{profile.bio}</p>}
                    </div>
                  </div>
                  <button
                    onClick={handleProfileEditStart}
                    className="rounded-full border border-hot/30 px-4 py-2 text-xs text-soft transition-all duration-300 hover:scale-105 hover:bg-ink-3"
                  >
                    Edit Profil
                  </button>
                </div>

                {isEditingProfile && (
                  <form onSubmit={handleProfileSave} className="mt-6 space-y-4">
                    <div className="space-y-4">
                      <label className="text-xs uppercase tracking-[0.2em] text-slate">Avatar Utama</label>
                      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-hot/20 bg-ink-3/70 p-4">
                        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-ink-2/70 text-3xl">
                          {setupAvatarImage || setupAvatarAsset ? (
                            <Image
                              src={setupAvatarPreview}
                              alt="Preview avatar"
                              width={64}
                              height={64}
                              className="h-full w-full object-cover"
                              unoptimized
                            />
                          ) : (
                            setupAvatarPreview
                          )}
                        </div>
                        <div className="min-w-[160px] flex-1 text-xs text-slate">
                          <p className="text-sm text-white">Update avatar kamu</p>
                          <p className="mt-1">Bisa pakai foto, emoji, atau asset chubby nanti.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <label
                            className={`cursor-pointer rounded-full border border-hot/30 px-3 py-2 text-xs text-soft transition-all hover:bg-ink-3 ${
                              isAvatarUploading ? "opacity-70" : ""
                            }`}
                          >
                            <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                            {isAvatarUploading ? (
                              <span className="inline-flex items-center gap-2">
                                <span className="h-3 w-3 animate-spin rounded-full border border-hot/40 border-t-hot" />
                                Uploading...
                              </span>
                            ) : (
                              "Upload Foto"
                            )}
                          </label>
                          {(setupAvatarImage || setupAvatarAsset) && (
                            <button
                              type="button"
                              onClick={handleClearCustomAvatar}
                              className="rounded-full border border-hot/30 px-3 py-2 text-xs text-soft transition-all hover:bg-ink-3"
                            >
                              Hapus Foto
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate">Avatar Emoji</p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={handleSelectAvatarAuto}
                            className={`rounded-full px-3 py-2 text-xs transition-all ${
                              !setupAvatar ? "bg-hot text-black" : "border border-hot/30 text-soft hover:bg-ink-3"
                            }`}
                          >
                            Auto {getAvatarEmoji(setupName)}
                          </button>
                          {AVATAR_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleSelectAvatarEmoji(emoji)}
                              className={`flex h-9 w-9 items-center justify-center rounded-full text-lg transition-all ${
                                setupAvatar === emoji
                                  ? "bg-hot text-black"
                                  : "border border-hot/30 text-soft hover:bg-ink-3"
                              }`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>

                      {CHUBBY_ASSETS.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs uppercase tracking-[0.2em] text-slate">Avatar Chubby</p>
                          <div className="flex flex-wrap gap-2">
                            {CHUBBY_ASSETS.map((asset) => (
                              <button
                                key={asset.id}
                                type="button"
                                onClick={() => handleSelectAvatarAsset(asset.src)}
                                className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs transition-all ${
                                  setupAvatarAsset === asset.src
                                    ? "border-hot bg-hot/20 text-soft"
                                    : "border-hot/30 text-soft hover:bg-ink-3"
                                }`}
                              >
                                <Image
                                  src={asset.src}
                                  alt={asset.label}
                                  width={24}
                                  height={24}
                                  className="h-6 w-6 rounded-full object-cover"
                                  unoptimized
                                />
                                {asset.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate">
                          Avatar chubby belum dipasang. Nanti tinggal isi daftar asset-nya.
                        </p>
                      )}
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-[0.2em] text-slate">Nama Panggilan</label>
                        <input
                          type="text"
                          value={setupName}
                          onChange={(event) => setSetupName(event.target.value)}
                          className="w-full rounded-2xl border border-hot/30 bg-ink-3/80 px-4 py-3 text-sm text-white placeholder:text-slate focus:border-hot focus:outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-[0.2em] text-slate">Tanggal Lahir</label>
                        <input
                          type="date"
                          value={setupBirth}
                          onChange={(event) => setSetupBirth(event.target.value)}
                          className="w-full rounded-2xl border border-hot/30 bg-ink-3/80 px-4 py-3 text-sm text-white focus:border-hot focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-[0.2em] text-slate">Status Singkat</label>
                      <input
                        type="text"
                        value={setupStatus}
                        onChange={(event) => setSetupStatus(event.target.value)}
                        className="w-full rounded-2xl border border-hot/30 bg-ink-3/80 px-4 py-3 text-sm text-white placeholder:text-slate focus:border-hot focus:outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-[0.2em] text-slate">Bio Mini</label>
                      <textarea
                        value={setupBio}
                        onChange={(event) => setSetupBio(event.target.value)}
                        className="min-h-[90px] w-full resize-none rounded-2xl border border-hot/30 bg-ink-3/80 px-4 py-3 text-sm text-white placeholder:text-slate focus:border-hot focus:outline-none"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs uppercase tracking-[0.2em] text-slate">Accent Color</label>
                      <div className="flex flex-wrap items-center gap-3">
                        {ACCENT_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => handleSelectAccentPreset(preset.color)}
                            className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs transition-all ${
                              setupAccentColor === preset.color
                                ? "border-hot bg-hot/20 text-soft"
                                : "border-hot/30 text-soft hover:bg-ink-3"
                            }`}
                          >
                            <span className="h-4 w-4 rounded-full" style={{ backgroundColor: preset.color }} />
                            {preset.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-hot/20 bg-ink-3/70 px-4 py-3 text-xs text-slate">
                        <label className="flex items-center gap-2">
                          <Palette size={14} className="text-hot" />
                          <input
                            type="color"
                            value={setupAccentColor}
                            onChange={(event) => setSetupAccentColor(event.target.value)}
                            className="h-8 w-10 rounded border-none bg-transparent p-0"
                          />
                        </label>
                        <div className="flex flex-1 items-center gap-2">
                          <span className="text-[11px] text-slate">Softness</span>
                          <input
                            type="range"
                            min={20}
                            max={80}
                            value={setupAccentSoftness}
                            onChange={(event) => setSetupAccentSoftness(Number(event.target.value))}
                            className="w-full"
                            style={{ accentColor: setupAccentColor }}
                          />
                          <span className="text-[11px] text-soft">{setupAccentSoftness}%</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleResetAccent}
                          className="rounded-full border border-hot/30 px-3 py-1 text-[11px] text-soft transition-all hover:bg-ink-3"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-[0.2em] text-slate">Terminal Hostname</label>
                        <input
                          type="text"
                          value={setupTerminalHost}
                          onChange={(event) => setSetupTerminalHost(event.target.value)}
                          className="w-full rounded-2xl border border-hot/30 bg-ink-3/80 px-4 py-3 text-sm text-white placeholder:text-slate focus:border-hot focus:outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-[0.2em] text-slate">Nama Terminal</label>
                        <input
                          type="text"
                          value={setupTerminalName}
                          onChange={(event) => setSetupTerminalName(event.target.value)}
                          className="w-full rounded-2xl border border-hot/30 bg-ink-3/80 px-4 py-3 text-sm text-white placeholder:text-slate focus:border-hot focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-[0.2em] text-slate">Lokasi Jadwal Sholat</label>
                      <input
                        type="text"
                        list="prayer-city-list"
                        value={setupPrayerCityQuery}
                        onChange={(event) => handlePrayerCityInput(event.target.value)}
                        className="w-full rounded-2xl border border-hot/30 bg-ink-3/80 px-4 py-3 text-sm text-white placeholder:text-slate focus:border-hot focus:outline-none"
                      />
                      <datalist id="prayer-city-list">
                        {prayerCities.map((city) => (
                          <option key={city.id} value={city.lokasi} />
                        ))}
                      </datalist>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate">
                        <span>Terpilih: {setupPrayerCityName || DEFAULT_PRAYER_CITY.lokasi}</span>
                        <button
                          type="button"
                          onClick={handleDetectPrayerCity}
                          disabled={isPrayerCityDetecting}
                          className={`rounded-full border border-hot/30 px-3 py-1 text-[11px] text-soft transition-all hover:bg-ink-3 ${
                            isPrayerCityDetecting ? "opacity-70" : ""
                          }`}
                        >
                          {isPrayerCityDetecting ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="h-3 w-3 animate-spin rounded-full border border-hot/40 border-t-hot" />
                              Mendeteksi...
                            </span>
                          ) : (
                            "Auto-detect"
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-[0.2em] text-slate">Timezone</label>
                      <input
                        type="text"
                        list="timezone-list"
                        value={setupTimezoneQuery}
                        onChange={(event) => handleTimezoneInput(event.target.value)}
                        className="w-full rounded-2xl border border-hot/30 bg-ink-3/80 px-4 py-3 text-sm text-white placeholder:text-slate focus:border-hot focus:outline-none"
                      />
                      <datalist id="timezone-list">
                        {timeZoneOptions.map((zone) => (
                          <option key={zone} value={zone} />
                        ))}
                      </datalist>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate">
                        <span>Terpilih: {setupTimezone}</span>
                        <button
                          type="button"
                          onClick={handleUseSystemTimezone}
                          className="rounded-full border border-hot/30 px-3 py-1 text-[11px] text-soft transition-all hover:bg-ink-3"
                        >
                          Pakai timezone device
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="submit"
                        disabled={isProfileSaving}
                        className={`rounded-full bg-hot px-4 py-2 text-sm font-semibold text-black transition-all duration-300 hover:scale-105 ${
                          isProfileSaving ? "cursor-not-allowed opacity-70" : ""
                        }`}
                      >
                        {isProfileSaving ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/40 border-t-black" />
                            Menyimpan...
                          </span>
                        ) : (
                          "Simpan"
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleProfileCancel}
                        className="rounded-full border border-hot/30 px-4 py-2 text-sm text-soft transition-all duration-300 hover:scale-105 hover:bg-ink-3"
                      >
                        Batal
                      </button>
                    </div>
                  </form>
                )}
              </div>

              <div className="glass rounded-[32px] p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate">Ramadhan & Holiday Tracker</p>
                    <h3 className="mt-2 text-lg font-semibold text-white">
                      {calendarToday?.ramadan?.isRamadan
                        ? `Hari ke-${ramadanDayLabel ?? "?"} Ramadan`
                        : calendarToday?.holiday?.name ?? "Hari biasa"}
                    </h3>
                    <p className="mt-1 text-xs text-slate">Kota: {calendarCityLabel}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate">
                    {notificationState !== "granted" && (
                      <button
                        type="button"
                        onClick={requestNotificationPermission}
                        className="rounded-full border border-hot/30 px-3 py-1 text-[11px] text-soft transition-all hover:bg-ink-3"
                      >
                        Aktifkan notifikasi
                      </button>
                    )}
                    {!notificationNudged && notificationState !== "granted" && (
                      <span className="rounded-full border border-hot/10 bg-ink-2/70 px-2 py-0.5 text-[10px] text-slate">
                        Tap dulu untuk izin notifikasi (wajib klik).
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleProfileEditStart}
                      className="rounded-full border border-hot/30 px-3 py-1 text-[11px] text-soft transition-all hover:bg-ink-3"
                    >
                      Ganti kota
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-hot/20 bg-ink-3/70 px-4 py-3 text-xs text-soft">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate">Jadwal Hari Ini</p>
                    <div className="mt-2 flex flex-wrap gap-3">
                      <span>Imsak: {calendarToday?.prayer?.imsak ?? "--"}</span>
                      <span>Maghrib: {calendarToday?.prayer?.maghrib ?? "--"}</span>
                      <span>Subuh: {calendarToday?.prayer?.subuh ?? "--"}</span>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-hot/20 bg-ink-3/70 px-4 py-3 text-xs text-soft">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate">Info Libur</p>
                    <p className="mt-2 text-sm text-white">
                      {calendarToday?.holiday?.name ?? "Tidak ada libur nasional hari ini."}
                    </p>
                    {calendarToday?.hijri && (
                      <p className="mt-1 text-[11px] text-slate">
                        Hijriah: {calendarToday.hijri.day} {calendarToday.hijri.monthName} {calendarToday.hijri.year}{" "}
                        {calendarToday.hijri.era}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate">
                  <span>Sinkron: {calendarSyncLabel}</span>
                  {calendarLoading && <span>Sync...</span>}
                  {calendarError && <span className="text-amber-200">{calendarError}</span>}
                </div>
              </div>

              <div className="glass rounded-[32px] p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate">Poin Mingguan</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{weeklyPointsEffective.points} poin</p>
                    <p className="mt-1 text-xs text-slate">Periode: {weekRangeLabel}</p>
                  </div>
                  <div className="rounded-2xl border border-hot/20 bg-ink-3/70 px-4 py-3 text-xs text-soft">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate">Saran</p>
                    <p className="mt-2 text-sm text-white">{weeklySuggestion}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-ink-2/80">
                    <div className="h-full rounded-full bg-hot" style={{ width: `${weeklyProgress}%` }} />
                  </div>
                  <p className="text-[11px] text-slate">
                    Target minggu ini: {WEEKLY_POINT_TARGET} poin - Progress {weeklyProgress}%
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-hot/20 bg-ink-3/50">
                <div className="flex gap-12 whitespace-nowrap px-6 py-3 text-xs text-soft/80">
                  <div className="animate-marquee flex items-center gap-10">
                    <span>Terminal lucu udah siap.</span>
                    <span>Chat hub lagi nunggu cerita kamu.</span>
                    <span>Reminder biar kamu gak lupa makan.</span>
                    <span>Notes buat curhat manja kapan aja.</span>
                    <span>Terminal lucu udah siap.</span>
                    <span>Chat hub lagi nunggu cerita kamu.</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {[
                  {
                    id: "terminal",
                    label: "Terminal Linux",
                    desc: "Latihan perintah dasar sambil ketawa.",
                    icon: Terminal,
                  },
                  {
                    id: "chat-hub",
                    label: "Chat Hub",
                    desc: "Melfin asli atau AI, pilih mood kamu.",
                    icon: MessageCircle,
                  },
                  { id: "notes", label: "Notes", desc: "Sticky notes pink neon buat curhat.", icon: StickyNote },
                  {
                    id: "reminders",
                    label: "Reminders",
                    desc: "Todo list biar gak kelewatan.",
                    icon: Bell,
                  },
                  {
                    id: "gallery",
                    label: "Gallery",
                    desc: "Simpan foto lucu biar jadi memori.",
                    icon: ImageIcon,
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id as View)}
                    className="glass group flex items-center justify-between rounded-[28px] p-4 text-left transition-all duration-300 hover:scale-[1.02] sm:p-5"
                  >
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate">{item.label}</p>
                      <h3 className="mt-2 text-lg font-semibold text-white">{item.desc}</h3>
                    </div>
                    <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-hot/20 text-hot">
                      <item.icon size={22} />
                      {item.id === "reminders" && pendingReminderCount > 0 && (
                        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-red-500" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentView === "terminal" && (
            <TerminalExperience username={profile?.name ?? "user"} />
          )}

          {currentView === "chat-hub" && (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)]">
              <div className="glass min-w-0 rounded-[32px] p-5 sm:p-6">
                <SectionTitle icon={MessageCircle} title="Chat Hub" subtitle="Satu halaman, banyak chat berbeda." />
                <div className="mt-5 flex items-center gap-2 rounded-2xl border border-hot/20 bg-ink-3/70 px-3 py-2">
                  <Search size={16} className="text-hot" />
                  <input
                    value={chatSearch}
                    onChange={(event) => setChatSearch(event.target.value)}
                    placeholder="Cari chat atau isi terakhir..."
                    className="w-full bg-transparent text-sm text-white placeholder:text-slate focus:outline-none"
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingContact((prev) => !prev);
                      setContactStatus("");
                    }}
                    className="rounded-full border border-hot/30 px-3 py-1 text-[11px] text-soft transition-all hover:bg-ink-3"
                  >
                    + Add Contact
                  </button>
                  {contactStatus && <span className="text-[11px] text-slate">{contactStatus}</span>}
                </div>
                {isAddingContact && (
                  <form onSubmit={handleAddContact} className="mt-3 space-y-2 rounded-2xl border border-hot/20 bg-ink-3/70 p-3">
                    <input
                      value={contactEmail}
                      onChange={(event) => setContactEmail(event.target.value)}
                      placeholder="Email teman kamu"
                      type="email"
                      className="w-full rounded-2xl border border-hot/30 bg-ink-2/70 px-3 py-2 text-sm text-white placeholder:text-slate focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="w-full rounded-2xl bg-hot px-3 py-2 text-sm font-semibold text-black transition-all hover:scale-105"
                    >
                      Simpan Kontak
                    </button>
                    <div className="mt-2 space-y-2 text-xs text-slate">
                      <div className="flex items-center justify-between">
                        <span>Hasil Pencarian</span>
                        {contactLoading && <span className="text-[11px] text-soft">Mencari...</span>}
                      </div>
                      {contactResults.length === 0 && contactEmail.trim().length >= 2 && !contactLoading && (
                        <p className="text-[11px] text-slate">Belum ada user cocok.</p>
                      )}
                      {contactResults.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => createContactThread(item.email)}
                          className="flex w-full items-center gap-3 rounded-2xl border border-hot/20 bg-ink-2/60 px-3 py-2 text-left hover:bg-ink-2/80"
                        >
                        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-ink-3/80 text-base">
                          {isAvatarImage(item.avatar) ? (
                            <Image
                              src={item.avatar!}
                              alt={item.displayName}
                              width={32}
                              height={32}
                              className="h-full w-full rounded-full object-cover"
                              unoptimized
                            />
                          ) : (
                            item.avatar || "💬"
                          )}
                        </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-white">{item.displayName}</p>
                            <p className="truncate text-[11px] text-slate">{item.status || item.email}</p>
                          </div>
                          <span className="rounded-full bg-hot px-3 py-1 text-[10px] font-semibold text-black">Add</span>
                        </button>
                      ))}
                    </div>
                  </form>
                )}
                <div className="mt-5 max-h-[65vh] space-y-2 overflow-y-auto pr-1 scrollbar-hide">
                  {filteredChatThreads.map((thread) => {
                    const isActive = thread.id === activeThread?.id;
                    const last = thread.messages[thread.messages.length - 1];
                    return (
                      <div
                        key={thread.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setActiveThreadId(thread.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setActiveThreadId(thread.id);
                          }
                        }}
                        className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all ${
                          isActive ? "bg-hot/15 border border-hot/30" : "border border-transparent hover:bg-ink-3/70"
                        }`}
                      >
                        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-ink-2/80 text-xl">
                          {isAvatarImage(thread.avatar) ? (
                            <Image
                              src={thread.avatar}
                              alt={thread.title}
                              width={44}
                              height={44}
                              className="h-full w-full rounded-full object-cover"
                              unoptimized
                            />
                          ) : (
                            thread.avatar
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-white">{thread.title}</p>
                            <span className="text-[10px] text-slate">
                              {last ? formatChatTime(last.timestamp) : ""}
                            </span>
                          </div>
                          <p className="truncate text-xs text-slate">{getThreadPreview(thread)}</p>
                          <p className="mt-1 text-[11px] text-soft/70">{thread.subtitle}</p>
                        </div>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleToggleChatPin(thread.id);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              event.stopPropagation();
                              handleToggleChatPin(thread.id);
                            }
                          }}
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-full p-2 transition-all ${
                            thread.pinned ? "bg-hot text-black" : "bg-ink-2/70 text-soft"
                          }`}
                        >
                          <Pin size={14} />
                        </span>
                      </div>
                    );
                  })}
                  {filteredChatThreads.length === 0 && (
                    <div className="rounded-2xl border border-hot/20 bg-ink-3/70 p-4 text-xs text-slate">
                      Chat tidak ditemukan.
                    </div>
                  )}
                </div>
              </div>

              <div className="glass flex min-w-0 min-h-0 h-[76vh] max-h-[82vh] flex-col overflow-hidden rounded-[32px] p-4 sm:h-[80vh] sm:max-h-[85vh] sm:p-6">
                {activeThread ? (
                  <>
                    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-hot/20 bg-ink-3/70 px-4 py-3">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-ink-2/80 text-2xl">
                        {isAvatarImage(activeThread.avatar) ? (
                          <Image
                            src={activeThread.avatar}
                            alt={activeThread.title}
                            width={48}
                            height={48}
                            className="h-full w-full rounded-full object-cover"
                            unoptimized
                          />
                        ) : (
                          activeThread.avatar
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-slate">{activeThread.title}</p>
                        <p className="truncate text-sm font-semibold text-white">{activeThread.subtitle}</p>
                      </div>
                      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] text-emerald-200">
                        <span className="online-dot" />
                        {activeThread.kind === "ai" ? "Mentor online" : "Online"}
                      </span>
                      {activeThread.kind === "ai" && (
                        <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[11px] text-cyan-200">
                          AI Buddy Mode
                        </span>
                      )}
                      <div className="ml-auto flex items-center gap-2">
                        <button
                          onClick={() => handleClearChat(activeThread.id)}
                          className="rounded-full border border-hot/30 px-3 py-1 text-[11px] text-soft transition-all hover:bg-ink-3"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div
                      ref={chatRef}
                      className="chat-wall mt-4 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-hot/15 bg-black/40 p-4 text-sm scrollbar-hide"
                    >
                      {activeThread.messages.length === 0 && (
                        <p className="text-center text-xs text-slate">Belum ada chat. Ketik dulu ya.</p>
                      )}
                      {activeMessagesWithSeparators.map((item) => {
                        if (item.type === "date") {
                          return (
                            <div key={item.key} className="flex justify-center">
                              <span className="rounded-full bg-ink-3/80 px-3 py-1 text-[10px] text-slate">
                                {item.label}
                              </span>
                            </div>
                          );
                        }
                        const message = item.message;
                        const senderLabel =
                          message.from === "me"
                            ? profile?.name || "Kamu"
                            : message.from === "assistant"
                            ? "Melpin Assistant"
                            : activeThread.title;
                        return (
                          <ChatBubble
                            key={item.key}
                            isMine={message.from === "me"}
                            tone={
                              message.from === "me"
                                ? "bg-hot/90 text-black"
                                : message.from === "assistant"
                                ? "border border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
                                : "bg-ink-3/80 text-soft"
                            }
                            text={message.text}
                            time={formatChatTime(message.timestamp)}
                            senderLabel={senderLabel}
                            avatar={
                              message.from === "me"
                                ? undefined
                                : message.from === "assistant"
                                ? "🤖"
                                : activeThread.avatar
                            }
                            share={message.share}
                            shareCaption={message.shareCaption}
                            onShareClick={handleOpenSharedItem}
                          />
                        );
                      })}
                      {aiLoadingThread === activeThread.id && (
                        <div className="flex justify-start">
                          <div className="flex items-center rounded-2xl bg-ink-3/80 px-3 py-2 text-xs text-soft">
                            <span className="mr-2">Melpin lagi ngetik</span>
                            <span className="typing-dots" aria-hidden="true">
                              <span />
                              <span />
                              <span />
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-soft">
                      {chatQuickReplies.map((reply) => (
                        <button
                          key={reply}
                          onClick={() => handleChatDraftChange(activeThread.id, reply)}
                          className="rounded-full border border-hot/20 bg-ink-3/70 px-3 py-1 transition-all hover:bg-ink-3"
                        >
                          {reply}
                        </button>
                      ))}
                    </div>

                    {isChatAttachOpen && (
                      <div className="mt-3 rounded-2xl border border-hot/20 bg-ink-3/70 p-3">
                        <div className="flex flex-wrap gap-2 text-[11px] text-soft">
                          <button
                            type="button"
                            onClick={handleChatMediaPick}
                            className="rounded-full border border-hot/30 px-3 py-1 hover:bg-ink-3"
                          >
                            Foto/Video
                          </button>
                          <button
                            type="button"
                            onClick={handleShareLocation}
                            className="rounded-full border border-hot/30 px-3 py-1 hover:bg-ink-3"
                          >
                            Lokasi
                          </button>
                          <button
                            type="button"
                            onClick={() => setSharePicker("note")}
                            className="rounded-full border border-hot/30 px-3 py-1 hover:bg-ink-3"
                          >
                            Share Notes
                          </button>
                          <button
                            type="button"
                            onClick={() => setSharePicker("reminder")}
                            className="rounded-full border border-hot/30 px-3 py-1 hover:bg-ink-3"
                          >
                            Share Reminder
                          </button>
                          <button
                            type="button"
                            onClick={() => setSharePicker("gallery")}
                            className="rounded-full border border-hot/30 px-3 py-1 hover:bg-ink-3"
                          >
                            Share Gallery
                          </button>
                        </div>
                        {sharePicker && (
                          <div className="mt-3 max-h-40 space-y-2 overflow-y-auto text-xs text-soft">
                            {sharePicker === "note" &&
                              notes.slice(0, 6).map((note) => (
                                <button
                                  key={note.id}
                                  type="button"
                                  onClick={() => {
                                    openShareSheet({
                                      kind: "note",
                                      title: note.title || "Catatan tanpa judul",
                                      body:
                                        note.type === "checklist"
                                          ? truncateText(
                                              note.checklist
                                                .map((item) => `${item.done ? "✓" : "•"} ${item.text}`)
                                                .join("\n")
                                            )
                                          : truncateText(note.text || "Catatan kosong"),
                                      meta: note.tags.length ? `Tags: ${note.tags.join(", ")}` : undefined,
                                      targetId: note.id,
                                    });
                                    setSharePicker(null);
                                    setIsChatAttachOpen(false);
                                  }}
                                  className="flex w-full items-center justify-between rounded-2xl border border-hot/20 bg-ink-2/50 px-3 py-2 text-left hover:bg-ink-2/70"
                                >
                                  <span className="truncate">{note.title || "Catatan tanpa judul"}</span>
                                  <span className="text-[10px] text-slate">Note</span>
                                </button>
                              ))}
                            {sharePicker === "reminder" &&
                              reminders.slice(0, 6).map((reminder) => (
                                <button
                                  key={reminder.id}
                                  type="button"
                                  onClick={() => {
                                    openShareSheet({
                                      kind: "reminder",
                                      title: reminder.text,
                                      body: `Jadwal: ${reminder.date ?? "-"} ${reminder.time ?? ""}`.trim(),
                                      meta: reminder.done ? "Status: selesai ✅" : "Status: belum selesai",
                                      targetId: reminder.id,
                                    });
                                    setSharePicker(null);
                                    setIsChatAttachOpen(false);
                                  }}
                                  className="flex w-full items-center justify-between rounded-2xl border border-hot/20 bg-ink-2/50 px-3 py-2 text-left hover:bg-ink-2/70"
                                >
                                  <span className="truncate">{reminder.text}</span>
                                  <span className="text-[10px] text-slate">Reminder</span>
                                </button>
                              ))}
                            {sharePicker === "gallery" &&
                              galleryItems.slice(0, 6).map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => {
                                    openShareSheet({
                                      kind: "gallery",
                                      title: item.name,
                                      body: truncateText(item.caption || "Foto gallery"),
                                      meta: item.tags.length ? `Tags: ${item.tags.join(", ")}` : undefined,
                                      imageSrc: item.src,
                                      targetId: item.id,
                                    });
                                    setSharePicker(null);
                                    setIsChatAttachOpen(false);
                                  }}
                                  className="flex w-full items-center justify-between rounded-2xl border border-hot/20 bg-ink-2/50 px-3 py-2 text-left hover:bg-ink-2/70"
                                >
                                  <span className="truncate">{item.name}</span>
                                  <span className="text-[10px] text-slate">Gallery</span>
                                </button>
                              ))}
                            {sharePicker === "note" && notes.length === 0 && (
                              <p className="text-[11px] text-slate">Belum ada note.</p>
                            )}
                            {sharePicker === "reminder" && reminders.length === 0 && (
                              <p className="text-[11px] text-slate">Belum ada reminder.</p>
                            )}
                            {sharePicker === "gallery" && galleryItems.length === 0 && (
                              <p className="text-[11px] text-slate">Belum ada foto.</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <form
                      onSubmit={handleChatSend}
                      className="mt-3 flex items-center gap-2 rounded-2xl border border-hot/20 bg-ink-3/70 px-3 py-2"
                    >
                      <input
                        ref={chatMediaInputRef}
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        onChange={handleChatMediaUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => setIsChatAttachOpen((prev) => !prev)}
                        className={`flex h-9 w-9 items-center justify-center rounded-full border border-hot/30 text-hot ${
                          isChatAttachOpen ? "bg-hot/20" : ""
                        }`}
                      >
                        <Plus size={16} />
                      </button>
                      <input
                        value={activeDraft}
                        onChange={(event) => handleChatDraftChange(activeThread.id, event.target.value)}
                        placeholder="Tulis pesan..."
                        className="flex-1 bg-transparent text-base text-white placeholder:text-slate focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={isChatSending}
                        className={`flex h-9 w-9 items-center justify-center rounded-full bg-hot text-black transition-all duration-300 hover:scale-105 ${
                          isChatSending ? "opacity-70" : ""
                        }`}
                      >
                        {isChatSending ? (
                          <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-black/40 border-t-black" />
                        ) : (
                          <Send size={16} />
                        )}
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="flex flex-1 items-center justify-center text-sm text-slate">
                    Pilih chat dulu.
                  </div>
                )}
              </div>
            </div>
          )}

          {currentView === "notes" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <SectionTitle icon={StickyNote} title="Notes" subtitle="Tempat curhat, ide, dan mood tracker kamu." />
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleAddNote()}
                    disabled={isNoteCreating}
                    className={`flex items-center gap-2 rounded-full bg-hot px-4 py-2 text-sm font-semibold text-black transition-all duration-300 hover:scale-105 ${
                      isNoteCreating ? "opacity-70" : ""
                    }`}
                  >
                    {isNoteCreating ? (
                      <>
                        <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-black/40 border-t-black" />
                        Membuat...
                      </>
                    ) : (
                      <>
                        <Type size={16} />
                        Note Baru
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleAddNote("checklist")}
                    disabled={isNoteCreating}
                    className={`flex items-center gap-2 rounded-full border border-hot/30 px-4 py-2 text-sm text-soft transition-all duration-300 hover:scale-105 hover:bg-ink-3 ${
                      isNoteCreating ? "opacity-70" : ""
                    }`}
                  >
                    {isNoteCreating ? (
                      <>
                        <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-hot/40 border-t-hot" />
                        Membuat...
                      </>
                    ) : (
                      <>
                        <ListChecks size={16} />
                        Checklist
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleCreateFromPrompt}
                    disabled={isNoteCreating}
                    className={`flex items-center gap-2 rounded-full border border-hot/30 px-4 py-2 text-sm text-soft transition-all duration-300 hover:scale-105 hover:bg-ink-3 ${
                      isNoteCreating ? "opacity-70" : ""
                    }`}
                  >
                    {isNoteCreating ? (
                      <>
                        <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-hot/40 border-t-hot" />
                        Membuat...
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        Prompt Curhat
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="glass rounded-[28px] p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex flex-1 items-center gap-2 rounded-2xl border border-hot/20 bg-ink-3/70 px-3 py-2">
                    <Search size={16} className="text-hot" />
                    <input
                      value={noteQuery}
                      onChange={(event) => setNoteQuery(event.target.value)}
                      placeholder="Cari judul, isi, tag, atau checklist..."
                      className="w-full bg-transparent text-sm text-white placeholder:text-slate focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-soft">
                    {(["all", "pinned", "favorite", "archived"] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setNoteFilter(filter)}
                        className={`rounded-full px-3 py-1 transition-all ${
                          noteFilter === filter
                            ? "bg-hot text-black"
                            : "border border-hot/30 text-soft hover:bg-ink-3"
                        }`}
                      >
                        {filter === "all"
                          ? `Semua (${noteStats.total})`
                          : filter === "pinned"
                          ? `Pinned (${noteStats.pinned})`
                          : filter === "favorite"
                          ? `Favorite (${noteStats.favorite})`
                          : `Archive (${noteStats.archived})`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-soft">
                  <label className="flex items-center gap-2 rounded-full border border-hot/20 bg-ink-3/70 px-3 py-1">
                    <Tag size={14} className="text-hot" />
                    <select
                      value={noteTagFilter}
                      onChange={(event) => setNoteTagFilter(event.target.value)}
                      className="bg-transparent text-xs text-white focus:outline-none"
                    >
                      <option value="all">Semua tag</option>
                      {noteTagOptions.map((tag) => (
                        <option key={tag} value={tag}>
                          #{tag}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-2 rounded-full border border-hot/20 bg-ink-3/70 px-3 py-1">
                    <Sparkles size={14} className="text-hot" />
                    <select
                      value={noteMoodFilter}
                      onChange={(event) => setNoteMoodFilter(event.target.value)}
                      className="bg-transparent text-xs text-white focus:outline-none"
                    >
                      <option value="all">Semua mood</option>
                      {NOTE_MOODS.map((mood) => (
                        <option key={mood.id} value={mood.id}>
                          {mood.emoji} {mood.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-2 rounded-full border border-hot/20 bg-ink-3/70 px-3 py-1">
                    <LayoutGrid size={14} className="text-hot" />
                    <select
                      value={noteSort}
                      onChange={(event) => setNoteSort(event.target.value as "updated" | "created" | "title")}
                      className="bg-transparent text-xs text-white focus:outline-none"
                    >
                      <option value="updated">Terbaru diupdate</option>
                      <option value="created">Terbaru dibuat</option>
                      <option value="title">Judul A-Z</option>
                    </select>
                  </label>
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={() => setNoteView("grid")}
                      className={`rounded-full px-3 py-1 transition-all ${
                        noteView === "grid"
                          ? "bg-hot text-black"
                          : "border border-hot/30 text-soft hover:bg-ink-3"
                      }`}
                    >
                      <LayoutGrid size={14} />
                    </button>
                    <button
                      onClick={() => setNoteView("list")}
                      className={`rounded-full px-3 py-1 transition-all ${
                        noteView === "list"
                          ? "bg-hot text-black"
                          : "border border-hot/30 text-soft hover:bg-ink-3"
                      }`}
                    >
                      <List size={14} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="glass rounded-[28px] p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-hot/20 text-hot">
                    <Sparkles size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate">Prompt Curhat</p>
                    <p className="mt-1 text-sm text-white">{currentPrompt}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleNextPrompt}
                      className="rounded-full border border-hot/30 px-4 py-2 text-xs text-soft transition-all duration-300 hover:scale-105 hover:bg-ink-3"
                    >
                      Ganti Prompt
                    </button>
                    <button
                      onClick={handleCreateFromPrompt}
                      disabled={isNoteCreating}
                      className={`rounded-full bg-hot px-4 py-2 text-xs font-semibold text-black transition-all duration-300 hover:scale-105 ${
                        isNoteCreating ? "opacity-70" : ""
                      }`}
                    >
                      {isNoteCreating ? "Membuat..." : "Jadikan Note"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="max-h-[70vh] overflow-y-auto pr-1 scrollbar-hide sm:max-h-[72vh] lg:max-h-[75vh]">
                <div className={noteView === "grid" ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3" : "space-y-4"}>
                  {filteredNotes.length === 0 && (
                    <div className="glass rounded-[28px] p-6 text-sm text-slate">
                      Belum ada catatan di filter ini. Tambah dulu ya.
                    </div>
                  )}

                  {filteredNotes.map((note) => {
                  const theme = NOTE_THEMES.find((item) => item.id === note.color) ?? NOTE_THEMES[0];
                  const isCustomColor = !NOTE_THEMES.some((item) => item.id === note.color) && isHexColor(note.color);
                  const customBase = isCustomColor ? note.color : DEFAULT_ACCENT;
                  const customSoft = mixHex(customBase, "#ffffff", 0.65);
                  const customMid = mixHex(customBase, "#ffffff", 0.35);
                  const cardStyle = isCustomColor
                    ? { background: `linear-gradient(135deg, ${customSoft} 0%, ${customMid} 55%, ${customBase} 100%)` }
                    : undefined;
                  const fontOption = NOTE_FONTS.find((item) => item.id === note.font) ?? NOTE_FONTS[0];
                  const fontSize = note.fontSize ?? 15;
                  const fontStyle = { fontFamily: fontOption.family, fontSize: `${fontSize}px` };
                  const titleStyle = { fontFamily: fontOption.family, fontSize: `${fontSize + 2}px` };
                  const chipClass = isCustomColor ? "shadow-sm" : theme.chip;
                  const chipStyle = isCustomColor
                    ? {
                        backgroundColor: mixHex(customBase, "#ffffff", 0.78),
                        border: `1px solid ${hexToRgba(customBase, 0.3)}`,
                        color: "#0a0a0d",
                      }
                    : undefined;
                  const noteThemeValue = NOTE_THEMES.some((item) => item.id === note.color) ? note.color : "custom";
                  const notePatternValue = NOTE_PATTERNS.some((item) => item.id === note.pattern)
                    ? note.pattern
                    : "none";
                  const noteFontValue = NOTE_FONTS.some((item) => item.id === note.font) ? note.font : "body";
                  const mood = NOTE_MOODS.find((item) => item.id === note.mood);
                  const isExpanded = expandedNoteId === note.id;
                  return (
                    <div
                      key={note.id}
                      className={`relative overflow-hidden rounded-[28px] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.25)] ${
                        isCustomColor ? "text-black" : theme.card
                      }`}
                      style={cardStyle}
                    >
                      {notePatternValue !== "none" && (
                        <div className={`note-pattern note-pattern--${notePatternValue}`} aria-hidden />
                      )}
                      <div className="flex flex-wrap items-start gap-2">
                        <input
                          value={note.title}
                          onChange={(event) => updateNote(note.id, { title: event.target.value })}
                          placeholder="Judul note"
                          className="min-w-0 flex-1 bg-transparent text-base font-semibold text-black placeholder:text-black/50 focus:outline-none"
                          style={titleStyle}
                        />
                        <div className="flex w-full flex-wrap items-center gap-1 sm:w-auto sm:ml-auto">
                          <button
                            onClick={() => handleToggleNoteFlag(note.id, "pinned")}
                            className={`rounded-full p-2 transition-all ${chipClass} ${
                              note.pinned ? "shadow-[0_0_8px_rgba(0,0,0,0.25)] ring-1 ring-black/40 bg-black/20" : ""
                            }`}
                            style={chipStyle}
                          >
                            <Pin size={14} />
                          </button>
                          <button
                            onClick={() => handleToggleNoteFlag(note.id, "favorite")}
                            className={`rounded-full p-2 transition-all ${chipClass} ${
                              note.favorite ? "shadow-[0_0_8px_rgba(0,0,0,0.25)] ring-1 ring-black/40 bg-black/20" : ""
                            }`}
                            style={chipStyle}
                          >
                            <Star size={14} />
                          </button>
                          <button
                            onClick={() =>
                              openShareSheet({
                                kind: "note",
                                title: note.title || "Catatan tanpa judul",
                                body:
                                  note.type === "checklist"
                                    ? truncateText(
                                        note.checklist
                                          .map((item) => `${item.done ? "✓" : "•"} ${item.text}`)
                                          .join("\n")
                                      )
                                    : truncateText(note.text || "Catatan kosong"),
                                meta: note.tags.length ? `Tags: ${note.tags.join(", ")}` : undefined,
                                targetId: note.id,
                              })
                            }
                            className={`rounded-full p-2 transition-all ${chipClass}`}
                            style={chipStyle}
                          >
                            <Share2 size={14} />
                          </button>
                          <button
                            onClick={() => handleToggleNoteFlag(note.id, "archived")}
                            className={`rounded-full p-2 transition-all ${chipClass} ${
                              note.archived ? "shadow-[0_0_8px_rgba(0,0,0,0.25)] ring-1 ring-black/40 bg-black/20" : ""
                            }`}
                            style={chipStyle}
                          >
                            <Archive size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className={`rounded-full p-2 transition-all ${chipClass}`}
                            style={chipStyle}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3">
                        {note.type === "text" ? (
                          <textarea
                            value={note.text}
                            onChange={(event) => updateNote(note.id, { text: event.target.value })}
                            placeholder="Tulis curhat kamu..."
                            className="min-h-[140px] w-full resize-none bg-transparent text-sm text-black placeholder:text-black/50 focus:outline-none"
                            style={fontStyle}
                          />
                        ) : (
                          <div className="space-y-2">
                            {note.checklist.map((item) => (
                              <label key={item.id} className="flex items-center gap-2 text-sm text-black">
                                <input
                                  type="checkbox"
                                  checked={item.done}
                                  onChange={() => handleToggleChecklistItem(note.id, item.id)}
                                  className="h-4 w-4 accent-black"
                                />
                                <input
                                  value={item.text}
                                  onChange={(event) => handleUpdateChecklistItem(note.id, item.id, event.target.value)}
                                  className={`flex-1 bg-transparent text-sm text-black placeholder:text-black/50 focus:outline-none ${
                                    item.done ? "line-through text-black/50" : ""
                                  }`}
                                  style={fontStyle}
                                />
                                <button
                                  onClick={() => handleDeleteChecklistItem(note.id, item.id)}
                                  className="rounded-full px-2 py-1 text-[10px] text-black/70"
                                >
                                  ✕
                                </button>
                              </label>
                            ))}
                            <button
                              onClick={() => handleAddChecklistItem(note.id)}
                              className="mt-2 rounded-full px-3 py-1 text-xs text-black/80 transition-all hover:bg-black/10"
                            >
                              + Tambah item
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-black/70">
                        <span className={`rounded-full px-2 py-1 ${theme.chip}`}>
                          {mood ? `${mood.emoji} ${mood.label}` : "Mood"}
                        </span>
                        <span className={`rounded-full px-2 py-1 ${theme.chip}`}>Energi {note.energy}%</span>
                        <button
                          onClick={() => handleToggleNoteExpand(note.id)}
                          className={`rounded-full px-2 py-1 ${theme.chip} ${
                            isExpanded ? "ring-1 ring-black/40 bg-black/20" : ""
                          }`}
                        >
                          {isExpanded ? "Tutup Detail" : "Detail"}
                        </button>
                        <button
                          onClick={() => handleDuplicateNote(note)}
                          className={`rounded-full px-2 py-1 ${theme.chip}`}
                        >
                          <Copy size={12} />
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 space-y-3 rounded-2xl bg-black/10 p-3 text-xs text-black/70">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] uppercase tracking-[0.2em] text-black/60">Mood</span>
                            {NOTE_MOODS.map((moodOption) => (
                              <button
                                key={moodOption.id}
                                onClick={() => updateNote(note.id, { mood: moodOption.id })}
                                className={`rounded-full px-2 py-1 text-[11px] transition-all ${
                                  note.mood === moodOption.id ? "bg-black/20" : "bg-black/10"
                                }`}
                              >
                                {moodOption.emoji}
                              </button>
                            ))}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Palette size={14} />
                            <select
                              value={noteThemeValue}
                              onChange={(event) => {
                                const value = event.target.value;
                                if (value === "custom") {
                                  updateNote(note.id, { color: isCustomColor ? note.color : DEFAULT_ACCENT });
                                  return;
                                }
                                updateNote(note.id, { color: value });
                              }}
                              className="rounded-full border border-hot/30 bg-ink-2/80 px-3 py-1 text-[11px] text-soft focus:outline-none"
                            >
                              {NOTE_THEMES.map((themeOption) => (
                                <option key={themeOption.id} value={themeOption.id}>
                                  {themeOption.label}
                                </option>
                              ))}
                              <option value="custom">Custom</option>
                            </select>
                            {noteThemeValue === "custom" && (
                              <label className="flex items-center gap-2 rounded-full border border-hot/30 bg-ink-2/80 px-2 py-1 text-[11px] text-soft">
                                <span>Warna</span>
                                <input
                                  type="color"
                                  value={isCustomColor ? note.color : DEFAULT_ACCENT}
                                  onChange={(event) => updateNote(note.id, { color: event.target.value })}
                                  className="h-5 w-6 cursor-pointer bg-transparent"
                                />
                              </label>
                            )}
                            <select
                              value={notePatternValue}
                              onChange={(event) => updateNote(note.id, { pattern: event.target.value })}
                              className="rounded-full border border-hot/30 bg-ink-2/80 px-3 py-1 text-[11px] text-soft focus:outline-none"
                            >
                              {NOTE_PATTERNS.map((pattern) => (
                                <option key={pattern.id} value={pattern.id}>
                                  {pattern.label}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleSwitchNoteType(note.id, note.type === "text" ? "checklist" : "text")}
                              className="rounded-full border border-hot/30 bg-ink-2/80 px-3 py-1 text-[11px] text-soft"
                            >
                              {note.type === "text" ? "Ubah ke Checklist" : "Ubah ke Text"}
                            </button>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] uppercase tracking-[0.2em] text-black/60">Font</span>
                            <select
                              value={noteFontValue}
                              onChange={(event) => updateNote(note.id, { font: event.target.value })}
                              className="rounded-full border border-hot/30 bg-ink-2/80 px-3 py-1 text-[11px] text-soft focus:outline-none"
                            >
                              {NOTE_FONTS.map((font) => (
                                <option key={font.id} value={font.id}>
                                  {font.label}
                                </option>
                              ))}
                            </select>
                            <div className="flex items-center gap-2 rounded-full border border-hot/30 bg-ink-2/80 px-3 py-1 text-[11px] text-soft">
                              <span>Size</span>
                              <input
                                type="range"
                                min={NOTE_FONT_SIZES.min}
                                max={NOTE_FONT_SIZES.max}
                                step={NOTE_FONT_SIZES.step}
                                value={fontSize}
                                onChange={(event) => updateNote(note.id, { fontSize: Number(event.target.value) })}
                                className="accent-[var(--color-hot)]"
                              />
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Tag size={14} />
                            <input
                              value={note.tags.join(", ")}
                              onChange={(event) => handleUpdateNoteTags(note.id, event.target.value)}
                              placeholder="tag1, tag2"
                              className="min-w-[160px] flex-1 rounded-full border border-hot/30 bg-ink-2/80 px-3 py-1 text-[11px] text-soft placeholder:text-slate focus:outline-none"
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-black/60">
                              <span>Energi</span>
                              <span>{note.energy}%</span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={note.energy}
                              onChange={(event) => updateNote(note.id, { energy: Number(event.target.value) })}
                              className="w-full accent-[var(--color-hot)]"
                            />
                          </div>
                        </div>
                      )}

                      <div className="mt-4 flex items-center justify-between text-[10px] text-black/60">
                        <span>
                          Update: {new Date(note.updatedAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}
                        </span>
                        <span>
                          Dibuat: {new Date(note.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}
                        </span>
                      </div>
                    </div>
                  );
                  })}
                </div>
              </div>
            </div>
          )}

          {currentView === "reminders" && (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
              <div className="glass min-w-0 rounded-[32px] p-5 sm:p-6">
                <SectionTitle icon={Bell} title="Reminders" subtitle="Todo list biar kamu gak lupa." />
                <form onSubmit={handleAddReminder} className="mt-6 flex flex-col gap-3">
                  <div className="rounded-2xl border border-hot/20 bg-gradient-to-br from-ink-3/80 via-ink-3/60 to-hot/10 p-4">
                    <div className="grid w-full gap-3">
                      <input
                        name="reminder"
                        placeholder="Contoh: Minum obat"
                        className="w-full min-w-0 rounded-2xl border border-hot/30 bg-ink-3/70 px-4 py-3 text-sm text-white placeholder:text-slate focus:border-hot focus:outline-none"
                      />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="flex min-w-0 items-center gap-2 rounded-2xl border border-hot/30 bg-ink-3/70 px-3 py-2 text-sm text-soft">
                          <Calendar size={16} className="text-hot" />
                          <input
                            name="reminderDate"
                            type="date"
                            defaultValue={new Date().toISOString().slice(0, 10)}
                            className="w-full min-w-0 bg-transparent text-sm text-white focus:outline-none"
                          />
                        </label>
                        <label className="flex min-w-0 items-center gap-2 rounded-2xl border border-hot/30 bg-ink-3/70 px-3 py-2 text-sm text-soft">
                          <Clock size={16} className="text-hot" />
                          <input
                            name="reminderTime"
                            type="time"
                            className="w-full min-w-0 bg-transparent text-sm text-white focus:outline-none"
                          />
                        </label>
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] text-slate">Pilih tanggal & jam biar aku bisa ngingetin tepat waktu.</p>
                  </div>
                    <button
                      type="submit"
                      disabled={isReminderCreating}
                      className={`flex items-center justify-center gap-2 rounded-2xl bg-hot px-4 py-2 text-sm font-semibold text-black transition-all duration-300 hover:scale-105 ${
                        isReminderCreating ? "cursor-not-allowed opacity-70" : ""
                      }`}
                    >
                      {isReminderCreating ? (
                        <span className="flex items-center gap-2 text-sm">
                          <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-black/40 border-t-black" />
                          Menyimpan...
                        </span>
                      ) : (
                        <>
                          <Plus size={16} />
                          Tambah Reminder
                        </>
                      )}
                    </button>
                </form>
                <div className="mt-5 space-y-3 rounded-2xl border border-hot/20 bg-ink-3/70 px-4 py-3 text-xs text-slate">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      Pending: <span className="text-soft">{pendingReminderCount}</span>
                    </span>
                    <span>
                      Notifikasi: <span className="text-soft">{notificationStatusLabel}</span>
                    </span>
                  </div>
                  {!isSecureContext && !notificationMessage && (
                    <p className="text-[11px] text-slate">
                      Notifikasi butuh HTTPS atau aplikasi di-install (PWA).
                    </p>
                  )}
                  {notificationMessage && <p className="text-[11px] text-soft">{notificationMessage}</p>}
                  {notificationState !== "granted" && notificationState !== "unsupported" && (
                    <button
                      type="button"
                      onClick={requestNotificationPermission}
                      className="rounded-full border border-hot/30 px-3 py-1 text-[11px] text-soft transition-all duration-300 hover:scale-105 hover:bg-ink-3"
                    >
                      Aktifkan Notifikasi
                    </button>
                  )}
                </div>
              </div>

              <div className="glass min-w-0 rounded-[32px] p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-hot/20 text-hot">
                    <LayoutGrid size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-slate">Daftar Pengingat</p>
                    <p className="text-lg font-semibold text-white">Checklist Harian</p>
                  </div>
                </div>
                <div className="mt-5 max-h-[70vh] space-y-3 overflow-y-auto pr-1 scrollbar-hide sm:max-h-[72vh] lg:max-h-[75vh]">
                  {reminders.length === 0 && (
                    <div className="rounded-2xl border border-hot/20 bg-ink-3/70 p-4 text-sm text-slate">
                      Belum ada reminder. Tambah dulu ya.
                    </div>
                  )}
                  {reminders.map((reminder) => (
                    <div
                      key={reminder.id}
                      className={`flex items-start justify-between gap-3 rounded-2xl border border-hot/20 bg-ink-3/70 px-4 py-3 ${
                        focusedReminderId === reminder.id ? "ring-1 ring-hot/40" : ""
                      }`}
                    >
                      <label className="flex flex-1 items-start gap-3">
                        <input
                          type="checkbox"
                          checked={reminder.done}
                          onChange={() => handleToggleReminder(reminder.id)}
                          className="h-4 w-4"
                          style={{ accentColor: "var(--color-hot)" }}
                        />
                        <span className="flex flex-col gap-1">
                          <span className={`text-sm ${reminder.done ? "text-slate line-through" : "text-soft"}`}>
                            {reminder.text}
                          </span>
                          <span className="flex flex-wrap items-center gap-2 text-[11px] text-slate">
                            {reminder.date && (
                              <span className="rounded-full border border-hot/30 px-2 py-0.5 text-soft">
                                {new Date(reminder.date).toLocaleDateString("id-ID", {
                                  day: "2-digit",
                                  month: "short",
                                })}
                              </span>
                            )}
                            {reminder.time && (
                              <span className="rounded-full border border-hot/30 px-2 py-0.5 text-soft">
                                {reminder.time}
                              </span>
                            )}
                            {reminder.notified && !reminder.done && <span>Sudah diingetin 💖</span>}
                          </span>
                        </span>
                      </label>
                      <button
                        onClick={() => handleDeleteReminder(reminder.id)}
                        className="rounded-full bg-hot/20 p-2 text-hot transition-all duration-300 hover:bg-hot/30"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button
                        onClick={() =>
                          openShareSheet({
                            kind: "reminder",
                            title: reminder.text,
                            body: `Jadwal: ${reminder.date ?? "-"} ${reminder.time ?? ""}`.trim(),
                            meta: reminder.done ? "Status: selesai ✅" : "Status: belum selesai",
                            targetId: reminder.id,
                          })
                        }
                        className="rounded-full bg-ink-2/60 p-2 text-soft transition-all duration-300 hover:bg-ink-2/80"
                      >
                        <Share2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentView === "gallery" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <SectionTitle icon={ImageIcon} title="Gallery" subtitle="Timeline memori, foto, dan cerita kecil." />
                <label
                  className={`flex cursor-pointer items-center gap-2 rounded-full bg-hot px-4 py-2 text-sm font-semibold text-black transition-all duration-300 hover:scale-105 ${
                    isGalleryUploading ? "opacity-80" : ""
                  }`}
                >
                  <input type="file" accept="image/*" multiple onChange={handleGalleryUpload} className="hidden" />
                  {isGalleryUploading ? (
                    <>
                      <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-black/40 border-t-black" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      Upload Foto
                    </>
                  )}
                </label>
              </div>

              <div className="glass rounded-[28px] p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex flex-1 items-center gap-2 rounded-2xl border border-hot/20 bg-ink-3/70 px-3 py-2">
                    <Search size={16} className="text-hot" />
                    <input
                      value={galleryQuery}
                      onChange={(event) => setGalleryQuery(event.target.value)}
                      placeholder="Cari nama foto, caption, atau tag..."
                      className="w-full bg-transparent text-sm text-white placeholder:text-slate focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-soft">
                    {(["all", "favorite"] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setGalleryFilter(filter)}
                        className={`rounded-full px-3 py-1 transition-all ${
                          galleryFilter === filter
                            ? "bg-hot text-black"
                            : "border border-hot/30 text-soft hover:bg-ink-3"
                        }`}
                      >
                        {filter === "all" ? `Semua (${galleryStats.total})` : `Favorite (${galleryStats.favorite})`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-soft">
                  <label className="flex items-center gap-2 rounded-full border border-hot/20 bg-ink-3/70 px-3 py-1">
                    <Tag size={14} className="text-hot" />
                    <select
                      value={galleryTagFilter}
                      onChange={(event) => setGalleryTagFilter(event.target.value)}
                      className="bg-transparent text-xs text-white focus:outline-none"
                    >
                      <option value="all">Semua tag</option>
                      {galleryTagOptions.map((tag) => (
                        <option key={tag} value={tag}>
                          #{tag}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-2 rounded-full border border-hot/20 bg-ink-3/70 px-3 py-1">
                    <Calendar size={14} className="text-hot" />
                    <select
                      value={gallerySort}
                      onChange={(event) => setGallerySort(event.target.value as "newest" | "oldest")}
                      className="bg-transparent text-xs text-white focus:outline-none"
                    >
                      <option value="newest">Terbaru</option>
                      <option value="oldest">Terlama</option>
                    </select>
                  </label>
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={() => setGalleryView("grid")}
                      className={`rounded-full px-3 py-1 transition-all ${
                        galleryView === "grid"
                          ? "bg-hot text-black"
                          : "border border-hot/30 text-soft hover:bg-ink-3"
                      }`}
                    >
                      <LayoutGrid size={14} />
                    </button>
                    <button
                      onClick={() => setGalleryView("timeline")}
                      className={`rounded-full px-3 py-1 transition-all ${
                        galleryView === "timeline"
                          ? "bg-hot text-black"
                          : "border border-hot/30 text-soft hover:bg-ink-3"
                      }`}
                    >
                      <List size={14} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-hot/20 bg-ink-3/70 px-4 py-3 text-xs text-slate">
                Total foto: <span className="text-soft">{galleryStats.total}</span> · Favorite:{" "}
                <span className="text-soft">{galleryStats.favorite}</span> · Bertag:{" "}
                <span className="text-soft">{galleryStats.tagged}</span>
              </div>

              <div className="max-h-[70vh] overflow-y-auto pr-1 scrollbar-hide sm:max-h-[72vh] lg:max-h-[75vh]">
                {filteredGallery.length === 0 && (
                  <div className="glass rounded-[28px] p-6 text-sm text-slate">
                    Belum ada foto di filter ini. Upload dulu biar gallery kamu hidup.
                  </div>
                )}

                {galleryView === "grid" && filteredGallery.length > 0 && (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredGallery.map((item) => {
                      const isExpanded = expandedGalleryId === item.id;
                      return (
                        <div
                          key={item.id}
                          className="group relative overflow-hidden rounded-[28px] border border-hot/20 bg-ink-3/70"
                        >
                          <div
                            className="relative h-52 w-full cursor-zoom-in"
                            role="button"
                            tabIndex={0}
                            onClick={() => openLightbox(item)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                openLightbox(item);
                              }
                            }}
                          >
                            <Image
                              src={item.src}
                              alt={item.name}
                              fill
                              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-4 py-3">
                            <p className="truncate text-sm text-white">{item.name}</p>
                            <p className="text-[11px] text-slate">
                              {new Date(item.memoryDate ?? item.addedAt).toLocaleDateString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                          <div className="absolute left-3 top-3 flex gap-2">
                            <button
                              onClick={() => handleToggleGalleryFavorite(item.id)}
                              className={`rounded-full p-2 transition-all ${
                                item.favorite ? "bg-hot text-black" : "bg-black/40 text-soft"
                              }`}
                            >
                              <Star size={16} />
                            </button>
                            <button
                              onClick={() => handleToggleGalleryExpand(item.id)}
                              className="rounded-full bg-black/40 p-2 text-soft transition-all duration-300 hover:bg-black/70"
                            >
                              <Sparkles size={16} />
                            </button>
                            <button
                              onClick={() =>
                                openShareSheet({
                                  kind: "gallery",
                                  title: item.name,
                                  body: truncateText(item.caption || "Foto gallery"),
                                  meta: item.tags.length ? `Tags: ${item.tags.join(", ")}` : undefined,
                                  imageSrc: item.src,
                                  targetId: item.id,
                                })
                              }
                              className="rounded-full bg-black/40 p-2 text-soft transition-all duration-300 hover:bg-black/70"
                            >
                              <Share2 size={16} />
                            </button>
                          </div>
                          <button
                            onClick={() => handleDeleteGalleryItem(item.id)}
                            className="absolute right-3 top-3 rounded-full bg-black/40 p-2 text-soft transition-all duration-300 hover:bg-black/70"
                          >
                            <Trash2 size={16} />
                          </button>

                          {isExpanded && (
                            <div className="border-t border-white/10 bg-black/60 p-4 text-xs text-slate">
                              <input
                                value={item.caption}
                                onChange={(event) => updateGalleryItem(item.id, { caption: event.target.value })}
                                placeholder="Tambah caption..."
                                className="w-full rounded-2xl border border-hot/30 bg-ink-3/70 px-3 py-2 text-xs text-white placeholder:text-slate focus:outline-none"
                              />
                              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                                <input
                                  value={item.tags.join(", ")}
                                  onChange={(event) => handleUpdateGalleryTags(item.id, event.target.value)}
                                  placeholder="tag1, tag2"
                                  className="w-full rounded-2xl border border-hot/30 bg-ink-3/70 px-3 py-2 text-xs text-white placeholder:text-slate focus:outline-none"
                                />
                                <label className="flex items-center gap-2 rounded-2xl border border-hot/30 bg-ink-3/70 px-3 py-2 text-xs text-soft">
                                  <Calendar size={14} className="text-hot" />
                                  <input
                                    type="date"
                                    value={item.memoryDate ?? ""}
                                    onChange={(event) => updateGalleryItem(item.id, { memoryDate: event.target.value })}
                                    className="w-full bg-transparent text-xs text-white focus:outline-none"
                                  />
                                </label>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {galleryView === "timeline" && filteredGallery.length > 0 && (
                  <div className="space-y-6">
                    {galleryGroups.map((group) => (
                      <div key={group.date} className="space-y-3">
                        <div className="flex items-center gap-3 text-xs text-slate">
                          <div className="h-2 w-2 rounded-full bg-hot" />
                          <p className="text-sm text-white">
                            {new Date(group.date).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            })}
                          </p>
                          <span className="text-[11px] text-slate">{group.items.length} foto</span>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {group.items.map((item) => {
                            const isExpanded = expandedGalleryId === item.id;
                            return (
                              <div
                                key={item.id}
                                className="group relative overflow-hidden rounded-[28px] border border-hot/20 bg-ink-3/70"
                              >
                                <div
                                  className="relative h-52 w-full cursor-zoom-in"
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => openLightbox(item)}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                      event.preventDefault();
                                      openLightbox(item);
                                    }
                                  }}
                                >
                                  <Image
                                    src={item.src}
                                    alt={item.name}
                                    fill
                                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                                    className="object-cover"
                                    unoptimized
                                  />
                                </div>
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-4 py-3">
                                  <p className="truncate text-sm text-white">{item.name}</p>
                                  {item.caption && <p className="text-[11px] text-slate line-clamp-2">{item.caption}</p>}
                                </div>
                                <div className="absolute left-3 top-3 flex gap-2">
                                  <button
                                    onClick={() => handleToggleGalleryFavorite(item.id)}
                                    className={`rounded-full p-2 transition-all ${
                                      item.favorite ? "bg-hot text-black" : "bg-black/40 text-soft"
                                    }`}
                                  >
                                    <Star size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleToggleGalleryExpand(item.id)}
                                    className="rounded-full bg-black/40 p-2 text-soft transition-all duration-300 hover:bg-black/70"
                                  >
                                    <Sparkles size={16} />
                                  </button>
                                  <button
                                    onClick={() =>
                                      openShareSheet({
                                        kind: "gallery",
                                        title: item.name,
                                        body: truncateText(item.caption || "Foto gallery"),
                                        meta: item.tags.length ? `Tags: ${item.tags.join(", ")}` : undefined,
                                        imageSrc: item.src,
                                        targetId: item.id,
                                      })
                                    }
                                    className="rounded-full bg-black/40 p-2 text-soft transition-all duration-300 hover:bg-black/70"
                                  >
                                    <Share2 size={16} />
                                  </button>
                                </div>
                                <button
                                  onClick={() => handleDeleteGalleryItem(item.id)}
                                  className="absolute right-3 top-3 rounded-full bg-black/40 p-2 text-soft transition-all duration-300 hover:bg-black/70"
                                >
                                  <Trash2 size={16} />
                                </button>

                                {isExpanded && (
                                  <div className="border-t border-white/10 bg-black/60 p-4 text-xs text-slate">
                                    <input
                                      value={item.caption}
                                      onChange={(event) => updateGalleryItem(item.id, { caption: event.target.value })}
                                      placeholder="Tambah caption..."
                                      className="w-full rounded-2xl border border-hot/30 bg-ink-3/70 px-3 py-2 text-xs text-white placeholder:text-slate focus:outline-none"
                                    />
                                    <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                                      <input
                                        value={item.tags.join(", ")}
                                        onChange={(event) => handleUpdateGalleryTags(item.id, event.target.value)}
                                        placeholder="tag1, tag2"
                                        className="w-full rounded-2xl border border-hot/30 bg-ink-3/70 px-3 py-2 text-xs text-white placeholder:text-slate focus:outline-none"
                                      />
                                      <label className="flex items-center gap-2 rounded-2xl border border-hot/30 bg-ink-3/70 px-3 py-2 text-xs text-soft">
                                        <Calendar size={14} className="text-hot" />
                                        <input
                                          type="date"
                                          value={item.memoryDate ?? ""}
                                          onChange={(event) =>
                                            updateGalleryItem(item.id, { memoryDate: event.target.value })
                                          }
                                          className="w-full bg-transparent text-xs text-white focus:outline-none"
                                        />
                                      </label>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {showNav && (
        <nav className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-40 px-4">
          <div className="glass mx-auto flex w-full max-w-6xl items-center gap-2 overflow-x-auto rounded-full px-3 py-3 scrollbar-hide sm:justify-center sm:overflow-visible sm:px-4">
            {navItems.map((item) => (
              <button key={item.id} onClick={() => setCurrentView(item.id)}>
                <NavPill icon={item.icon} label={item.label} active={currentView === item.id} />
              </button>
            ))}
          </div>
        </nav>
      )}

      {sharePayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70" onClick={closeShareSheet} />
          <div className="glass relative w-full max-w-lg rounded-[28px] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate">Bagikan ke Chat</p>
                <p className="text-lg font-semibold text-white">Pilih chat tujuan</p>
              </div>
              <button
                onClick={closeShareSheet}
                className="rounded-full border border-hot/30 px-3 py-1 text-xs text-soft"
              >
                Tutup
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-hot/20 bg-ink-3/70 p-4 text-xs text-soft">
              <p className="text-sm font-semibold text-white">{sharePayload.title}</p>
              <p className="mt-2 whitespace-pre-wrap text-xs text-slate">{sharePayload.body}</p>
              {sharePayload.meta && <p className="mt-2 text-[11px] text-slate">{sharePayload.meta}</p>}
            </div>

            <div className="mt-3 rounded-2xl border border-hot/20 bg-ink-3/70 px-4 py-3 text-xs text-slate">
              <label className="text-[11px] uppercase tracking-[0.2em] text-slate">Caption di Chat</label>
              <textarea
                value={shareCaption}
                onChange={(event) => setShareCaption(event.target.value)}
                placeholder="Tulis caption buat chat..."
                className="mt-2 min-h-[80px] w-full resize-none rounded-2xl border border-hot/30 bg-ink-3/70 px-3 py-2 text-xs text-white placeholder:text-slate focus:outline-none"
              />
            </div>

            {activeThreadId && (
              <button
                onClick={handleShareToActiveThread}
                className="mt-3 w-full rounded-2xl bg-hot px-4 py-2 text-sm font-semibold text-black transition-all hover:scale-105"
              >
                Kirim ke chat ini
              </button>
            )}

            <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
              {shareTargets.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => handleShareToThread(thread.id)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-hot/20 bg-ink-3/70 px-3 py-3 text-left transition-all hover:bg-ink-3"
                >
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-ink-2/80 text-lg">
                    {isAvatarImage(thread.avatar) ? (
                      <Image
                        src={thread.avatar}
                        alt={thread.title}
                        width={40}
                        height={40}
                        className="h-full w-full rounded-full object-cover"
                        unoptimized
                      />
                    ) : (
                      thread.avatar
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{thread.title}</p>
                    <p className="truncate text-xs text-slate">{getThreadPreview(thread)}</p>
                  </div>
                  <span className="rounded-full bg-hot px-3 py-1 text-[10px] font-semibold text-black">Kirim</span>
                </button>
              ))}
              {shareTargets.length === 0 && (
                <div className="rounded-2xl border border-hot/20 bg-ink-3/70 p-4 text-xs text-slate">
                  Belum ada chat tersedia.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {lightboxItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/80" onClick={closeLightbox} />
          <div className="glass relative w-full max-w-4xl overflow-hidden rounded-[28px] p-4">
            <button
              onClick={closeLightbox}
              className="absolute right-4 top-4 rounded-full border border-hot/30 px-3 py-1 text-xs text-soft"
            >
              Tutup
            </button>
            <div className="relative h-[60vh] w-full overflow-hidden rounded-2xl bg-black/40">
              <Image
                src={lightboxItem.src}
                alt={lightboxItem.name}
                fill
                sizes="(min-width: 1024px) 70vw, 100vw"
                className="object-contain"
                unoptimized
              />
            </div>
            <div className="mt-3 space-y-1 text-xs text-slate">
              <p className="text-sm font-semibold text-white">{lightboxItem.name}</p>
              {lightboxItem.caption && <p className="text-xs text-slate">{lightboxItem.caption}</p>}
              <p className="text-[11px] text-slate">
                {new Date(lightboxItem.memoryDate ?? lightboxItem.addedAt).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
