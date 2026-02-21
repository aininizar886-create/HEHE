import { create } from "zustand";
import { streamMentorMessage } from "../ai/streaming/openrouterMentor";
import { loadSnapshot, saveSnapshot } from "../persistence/indexedDb";
import type { CommandInfo } from "../core/engine/types";

export type TerminalLine = { type: "input" | "output" | "error" | "system"; text: string };
export type TreeNode = { id: string; name: string; type: "file" | "directory"; depth: number };

export type LessonPayload = {
  lessonTitle: string;
  lessonDescription: string;
  stepTitle: string;
  stepInstruction: string;
  stepExplanation: string;
  progress: string;
  focusCommand: string;
};

export type MentorMessage = {
  id: string;
  role: "assistant" | "system";
  text: string;
  streaming?: boolean;
};

type WorkerResultPayload = {
  lines: TerminalLine[];
  clearHistory: boolean;
  cwdPath: string[];
  tree: TreeNode[];
  lesson: LessonPayload;
  mastery: Record<string, { success: number; error: number; srsLevel: number; lastPracticed: number }>;
  xp: number;
  level: number;
  badges: string[];
  commandInfo: CommandInfo | null;
  effect: "glitch" | null;
  stepCompleted: boolean;
  lessonCompleted: boolean;
  supportedCommands: string[];
  srsDue?: string[];
  snapshot?: { fs: unknown; cwdId: string; learning: unknown };
};

type TerminalStore = {
  workerReady: boolean;
  lines: TerminalLine[];
  input: string;
  cwdPath: string[];
  tree: TreeNode[];
  lesson: LessonPayload | null;
  mastery: WorkerResultPayload["mastery"];
  xp: number;
  level: number;
  badges: string[];
  notebook: CommandInfo[];
  commandInfo: CommandInfo | null;
  supportedCommands: string[];
  mode: "learn" | "practice" | "real";
  paneRatio: number;
  mentorMessages: MentorMessage[];
  isGlitching: boolean;
  commandHistory: string[];
  srsDue: string[];
  initWorker: (username: string, mode: "learn" | "practice" | "real") => void;
  runCommand: (input: string) => void;
  resetEnvironment: () => void;
  setMode: (mode: "learn" | "practice" | "real") => void;
  setInput: (value: string) => void;
  appendSnippet: (value: string) => void;
  setPaneRatio: (value: number) => void;
  reviewSrs: (command: string, success: boolean) => void;
};

let worker: Worker | null = null;
let cancelStream: (() => void) | null = null;
const RATIO_KEY = "melpin_terminal_pane_ratio";
const readRatio = () => {
  if (typeof window === "undefined") return 0.56;
  const raw = window.localStorage.getItem(RATIO_KEY);
  const value = raw ? Number(raw) : 0.56;
  if (Number.isNaN(value)) return 0.56;
  return Math.min(0.75, Math.max(0.35, value));
};

const createMentorContext = (payload: WorkerResultPayload) => {
  const lastInput = payload.lines
    .filter((line) => line.type === "input")
    .map((line) => line.text.replace(/^\$\s*/, ""))
    .slice(-1)[0];
  const outputText = payload.lines
    .filter((line) => line.type !== "input")
    .map((line) => line.text)
    .join("\n");
  return {
    lastCommand: lastInput ?? "",
    result: outputText || "(tidak ada output)",
  };
};

export const useTerminalStore = create<TerminalStore>((set, get) => ({
  workerReady: false,
  lines: [],
  input: "",
  cwdPath: [],
  tree: [],
  lesson: null,
  mastery: {},
  xp: 0,
  level: 1,
  badges: [],
  notebook: [],
  commandInfo: null,
  supportedCommands: [],
  mode: "learn",
  paneRatio: readRatio(),
  mentorMessages: [],
  isGlitching: false,
  commandHistory: [],
  srsDue: [],
  initWorker: (username, mode) => {
    if (worker) {
      worker.terminate();
      worker = null;
    }
    if (!worker) {
      const workerUrl = new URL("../core/worker/osWorker.ts", import.meta.url);
      workerUrl.searchParams.set("v", Date.now().toString());
      worker = new Worker(workerUrl, { type: "module" });
      worker.onmessage = (event: MessageEvent) => {
        const { type, payload } = event.data ?? {};
        if (type === "ready") {
          set({
            workerReady: true,
            cwdPath: payload.cwdPath ?? [],
            tree: payload.tree ?? [],
            lesson: payload.lesson ?? null,
            mastery: payload.mastery ?? {},
            xp: payload.xp ?? 0,
            level: payload.level ?? 1,
            badges: payload.badges ?? [],
            supportedCommands: payload.supportedCommands ?? [],
            srsDue: payload.srsDue ?? [],
          });
          return;
        }
        if (type === "reset") {
          set({
            lines: [],
            commandHistory: [],
            cwdPath: payload.cwdPath ?? [],
            tree: payload.tree ?? [],
            lesson: payload.lesson ?? null,
            srsDue: payload.srsDue ?? [],
          });
          return;
        }
        if (type === "reviewed") {
          set({
            mastery: payload.mastery ?? {},
            srsDue: payload.srsDue ?? [],
          });
          return;
        }
        if (type === "result") {
          const data = payload as WorkerResultPayload;
          set((state) => {
            const nextLines = data.clearHistory ? [] : state.lines;
            const hasError = data.lines.some((line) => line.type === "error");
            const commandHistory = data.lines
              .filter((line) => line.type === "input")
              .map((line) => line.text.replace(/^\$\s*/, ""));
            const updatedHistory = [...state.commandHistory, ...commandHistory];
            const notebook = data.commandInfo
              ? hasError
                ? state.notebook
                : state.notebook.find((item) => item.name === data.commandInfo?.name)
                ? state.notebook
                : [...state.notebook, data.commandInfo]
              : state.notebook;
            return {
              lines: [...nextLines, ...data.lines],
              cwdPath: data.cwdPath,
              tree: data.tree,
              lesson: data.lesson,
              mastery: data.mastery,
              xp: data.xp,
              level: data.level,
              badges: data.badges,
              commandInfo: data.commandInfo,
              notebook,
              commandHistory: updatedHistory,
              srsDue: data.srsDue ?? state.srsDue,
            };
          });
          if (data.snapshot) {
            saveSnapshot("terminal_v2", data.snapshot).catch(() => undefined);
          }
          if (data.effect === "glitch") {
            set({ isGlitching: true });
            window.setTimeout(() => set({ isGlitching: false }), 2000);
          }
          if (data.lesson && get().mode === "learn") {
            const { lastCommand, result } = createMentorContext(data);
            if (cancelStream) cancelStream();
            const id = `${Date.now()}`;
            set((state) => ({
              mentorMessages: [...state.mentorMessages, { id, role: "assistant", text: "", streaming: true }],
            }));
            cancelStream = streamMentorMessage(
              {
                lesson: data.lesson.lessonTitle,
                focusCommand: data.lesson.focusCommand,
                lastCommand,
                result,
                mastery: JSON.stringify(data.mastery ?? {}),
                supportedCommands: data.supportedCommands ?? [],
              },
              {
                onChunk: (chunk) => {
                  set((state) => ({
                    mentorMessages: state.mentorMessages.map((msg) =>
                      msg.id === id ? { ...msg, text: chunk, streaming: true } : msg
                    ),
                  }));
                },
                onDone: () => {
                  set((state) => ({
                    mentorMessages: state.mentorMessages.map((msg) =>
                      msg.id === id ? { ...msg, streaming: false } : msg
                    ),
                  }));
                },
                onError: (message) => {
                  set((state) => ({
                    mentorMessages: state.mentorMessages.map((msg) =>
                      msg.id === id ? { ...msg, text: message, streaming: false } : msg
                    ),
                  }));
                },
              }
            );
          }
        }
      };
    }
    loadSnapshot("terminal_v2")
      .then((snapshot) => {
        worker?.postMessage({ type: "init", payload: { username, mode, snapshot: snapshot ?? undefined } });
      })
      .catch(() => worker?.postMessage({ type: "init", payload: { username, mode } }));
    set({ mode });
  },
  runCommand: (input) => {
    const trimmed = input.trim();
    if (!trimmed || !worker) return;
    worker.postMessage({ type: "command", payload: { input: trimmed.toLowerCase() } });
    set({ input: "" });
  },
  resetEnvironment: () => {
    worker?.postMessage({ type: "reset" });
    set({ lines: [], commandHistory: [] });
  },
  setMode: (mode) => {
    set({ mode });
    worker?.postMessage({ type: "set-mode", payload: { mode } });
  },
  setInput: (value) => set({ input: value }),
  appendSnippet: (value) => set((state) => ({ input: `${state.input}${value}` })),
  setPaneRatio: (value) => {
    const next = Math.min(0.75, Math.max(0.35, value));
    if (typeof window !== "undefined") {
      window.localStorage.setItem(RATIO_KEY, String(next));
    }
    set({ paneRatio: next });
  },
  reviewSrs: (command, success) => {
    if (!worker) return;
    worker.postMessage({ type: "review", payload: { command, success } });
  },
}));
